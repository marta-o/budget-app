"""
ML prediction module for budget forecasting using Gradient Boosting Regressor.
Forecasts future spending per category with confidence scores and trend analysis.

**Features used (7 high-signal features):**
- category_encoded: Identifies which category (model learns spending patterns per category)
- month_num: Month number 1-12 (captures seasonality, e.g., higher December spending)
- lag_1, lag_2, lag_3: Spending from previous 3 months (core predictive signals)
- pct_change: Month-over-month percentage change, clipped to [-2, 2] (trend direction)
- cv: Coefficient of variation (volatility indicator, used for confidence estimation)

**Model requirements:**
- Minimum 20 transactions across expense categories to enable ML
- Minimum 3 months of transaction history
- Falls back to statistical prediction (averages) if ML requirements not met
"""
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

from .config import settings


class UserMLPredictor:
    """
    ML predictor for budget forecasting using Gradient Boosting Regressor.
    
    Uses a simplified 7-feature set optimized for small personal finance datasets.
    Requires minimum 20 transactions for ML, otherwise falls back to statistical averages.
    """
    
    MIN_TRANSACTIONS_FOR_ML = 20
    MIN_MONTHS_FOR_ML = 3
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_url = settings.SQLALCHEMY_DATABASE_URL
            db_path = db_url.replace("sqlite:///", "")
        self.db_path = str(db_path)
        self._user_models: Dict[int, dict] = {}
    
    def _get_user_transactions(self, person_id: int) -> pd.DataFrame:
        """Fetch all expense transactions for a user from database."""
        conn = sqlite3.connect(self.db_path)
        query = """
        SELECT t.id, t.date, t.amount, c.name as category
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.person_id = ? AND c.type = 'expense'
        ORDER BY t.date
        """
        df = pd.read_sql_query(query, conn, params=[person_id])
        conn.close()
        
        if not df.empty:
            df["date"] = pd.to_datetime(df["date"])
            df["month"] = df["date"].dt.month
            df["year"] = df["date"].dt.year
        return df
    
    def _aggregate_to_monthly(self, df: pd.DataFrame) -> pd.DataFrame:
        """Aggregate daily transactions to monthly totals per category. 
        Fills missing months with zero to ensure continuous time series."""
        if df.empty:
            return pd.DataFrame()
        
        monthly = df.groupby(["category", "year", "month"]).agg({
            "amount": "sum", "id": "count"
        }).reset_index()
        monthly.columns = ["category", "year", "month", "amount", "tx_count"]
        
        # Fill missing months with zeros
        categories = monthly["category"].unique()
        min_date = df["date"].min()
        max_date = df["date"].max()
        date_range = pd.date_range(start=min_date.replace(day=1), 
                                   end=max_date.replace(day=1), freq='MS')
        
        complete_data = []
        for cat in categories:
            for date in date_range:
                complete_data.append({"category": cat, "year": date.year, "month": date.month})
        
        complete_df = pd.DataFrame(complete_data)
        return complete_df.merge(monthly, on=["category", "year", "month"], how="left"
            ).fillna({"amount": 0, "tx_count": 0}).sort_values(["category", "year", "month"])
    
    def _create_features(self, monthly_df: pd.DataFrame) -> pd.DataFrame:
        """Create ML features from monthly time series data."""
        df = monthly_df.copy()
        
        # Seasonality: month number 1-12 (model learns patterns like higher December spending)
        df["month_num"] = df["month"]

        # Historical lags: previous 3 months spending (strongest predictive signals)
        df["lag_1"] = df.groupby("category")["amount"].shift(1)
        df["lag_2"] = df.groupby("category")["amount"].shift(2)
        df["lag_3"] = df.groupby("category")["amount"].shift(3)
        
        # Trend: percentage change month-over-month, clipped to [-2, 2] to limit outliers
        df["pct_change"] = df.groupby("category")["amount"].pct_change(1)
        df["pct_change"] = df["pct_change"].replace([np.inf, -np.inf], 0).fillna(0).clip(-2, 2)
        
        # Volatility: coefficient of variation from 3-month rolling window
        rolling_mean = df.groupby("category")["amount"].transform(
            lambda x: x.rolling(window=3, min_periods=1).mean())
        rolling_std = df.groupby("category")["amount"].transform(
            lambda x: x.rolling(window=3, min_periods=2).std()).fillna(0)
        
        # CV = std/mean, clipped to [0, 3] - used for confidence estimation
        df["cv"] = (rolling_std / rolling_mean.replace(0, 1)).fillna(0).clip(0, 3)
        
        cat_stats = df.groupby("category")["amount"].agg(["mean", "std"]).reset_index()
        cat_stats.columns = ["category", "cat_avg", "cat_std"]
        cat_stats["cat_std"] = cat_stats["cat_std"].fillna(0)
        df = df.merge(cat_stats, on="category", how="left")
        
        return df
    
    def _train_model(self, person_id: int) -> Optional[dict]:
        """Train Gradient Boosting model on user's transaction history. Returns model dict or None if data insufficient."""
        df = self._get_user_transactions(person_id)
        
        if len(df) < self.MIN_TRANSACTIONS_FOR_ML:
            return None
        
        monthly_df = self._aggregate_to_monthly(df)
        unique_months = monthly_df.groupby(["year", "month"]).ngroups
        
        if unique_months < self.MIN_MONTHS_FOR_ML:
            return None
        
        label_encoder = LabelEncoder()
        monthly_df["category_encoded"] = label_encoder.fit_transform(monthly_df["category"])
        
        featured_df = self._create_features(monthly_df)
        featured_df = featured_df.dropna(subset=["lag_1", "lag_2", "lag_3"])
        
        if len(featured_df) < 6:
            return None
        
        # Simplified, high-signal feature set (7 features)
        feature_cols = [
            "category_encoded",  # Category identification
            "month_num",          # Seasonality
            "lag_1", "lag_2", "lag_3",  # Historical spending (core signals)
            "pct_change",         # Trend direction (normalized)
            "cv"                  # Volatility (confidence indicator)
        ]
        
        X = featured_df[feature_cols].fillna(0)
        y = featured_df["amount"]
        
        model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            min_samples_split=4,
            min_samples_leaf=3,
            subsample=0.8,
            random_state=10
        )
        model.fit(X, y)
        
        predictions = model.predict(X)
        mae = np.mean(np.abs(predictions - y))
        r2 = model.score(X, y)
        
        cat_stats = featured_df.groupby("category").agg({
            "cat_avg": "first", "cat_std": "first"
        }).reset_index()
        
        # Store latest lags for making predictions on new data
        latest_lags = featured_df.sort_values(["category", "year", "month"]).groupby("category").last()[
            ["lag_1", "lag_2", "lag_3", "pct_change", "cv"]
        ].reset_index()
        
        # Human-readable feature names for UI (Polish)
        feature_names_pl = {
            "category_encoded": "Kategoria",
            "month_num": "Miesiąc",
            "lag_1": "Wydatek 1 miesiąc temu",
            "lag_2": "Wydatek 2 miesiące temu",
            "lag_3": "Wydatek 3 miesiące temu",
            "pct_change": "Zmiana procentowa",
            "cv": "Zmienność wydatków"
        }
        
        feature_importance_raw = dict(zip(feature_cols, model.feature_importances_))
        feature_importance_pl = {
            feature_names_pl.get(k, k): v for k, v in feature_importance_raw.items()
        }
        
        return {
            "model": model,
            "label_encoder": label_encoder,
            "feature_cols": feature_cols,
            "cat_stats": cat_stats,
            "latest_lags": latest_lags,
            "categories": list(label_encoder.classes_),
            "metrics": {"mae": round(mae, 2), "r2": round(r2, 4), 
                       "training_months": unique_months, "training_samples": len(df)},
            "feature_importance": feature_importance_pl,
            "feature_importance_raw": feature_importance_raw,
            "trained_at": datetime.now().isoformat()
        }
    
    def _get_or_train_model(self, person_id: int) -> Optional[dict]:
        """Get cached model or train new one if not exists."""
        if person_id not in self._user_models:
            model_data = self._train_model(person_id)
            if model_data:
                self._user_models[person_id] = model_data
        return self._user_models.get(person_id)
    
    def _predict_with_ml(self, model_data: dict, category_name: str, month: int) -> Optional[Tuple[float, str]]:
        """Make prediction using ML model. Returns (amount, confidence)."""
        model = model_data["model"]
        label_encoder = model_data["label_encoder"]
        cat_stats = model_data["cat_stats"]
        latest_lags = model_data["latest_lags"]
        
        if category_name not in label_encoder.classes_:
            return None
        
        cat_encoded = label_encoder.transform([category_name])[0]
        cat_row = cat_stats[cat_stats["category"] == category_name]
        if len(cat_row) == 0:
            return None
        
        cat_avg = cat_row["cat_avg"].values[0]
        lag_row = latest_lags[latest_lags["category"] == category_name]
        
        if len(lag_row) > 0:
            lag_1 = lag_row["lag_1"].values[0] if pd.notna(lag_row["lag_1"].values[0]) else cat_avg
            lag_2 = lag_row["lag_2"].values[0] if pd.notna(lag_row["lag_2"].values[0]) else cat_avg
            lag_3 = lag_row["lag_3"].values[0] if pd.notna(lag_row["lag_3"].values[0]) else cat_avg
            pct_change = lag_row["pct_change"].values[0] if pd.notna(lag_row["pct_change"].values[0]) else 0
            cv = lag_row["cv"].values[0] if pd.notna(lag_row["cv"].values[0]) else 0
        else:
            lag_1 = lag_2 = lag_3 = cat_avg
            pct_change = cv = 0
        
        # If category has almost constant spending, bypass ML and return last observed value
        cat_std = cat_row["cat_std"].values[0] if ("cat_std" in cat_row.columns and len(cat_row) > 0) else 0
        if (cat_std is not None and cat_std < 1e-3) or (abs(lag_1 - lag_2) < 1e-6 and abs(lag_2 - lag_3) < 1e-6):
            # High confidence for constant categories, return exact last observed value
            return max(0, round(float(lag_1), 2)), "high"

        # Normalize features to model expectations
        pct_change = np.clip(pct_change, -2, 2)
        cv = np.clip(cv, 0, 3)
        
        # Build feature vector for prediction
        X = pd.DataFrame([{
            "category_encoded": cat_encoded,
            "month_num": month,
            "lag_1": lag_1,
            "lag_2": lag_2,
            "lag_3": lag_3,
            "pct_change": pct_change,
            "cv": cv
        }])
        
        prediction = model.predict(X)[0]
        
        # Confidence based on coefficient of variation
        if cv < 0.3:
            confidence = "high"
        elif cv < 0.6:
            confidence = "medium"
        else:
            confidence = "low"
        
        return max(0, round(prediction, 2)), confidence

    def _predict_with_statistics(self, person_id: int, category_name: str, month: int) -> Dict:
        """Fallback prediction using statistics."""
        df = self._get_user_transactions(person_id)
        
        if df.empty:
            return {"estimated_amount": 0, "method": "no_data", "confidence": "none", "has_data": False}
        
        cat_df = df[df["category"] == category_name]
        if cat_df.empty:
            return {"estimated_amount": 0, "method": "no_category_data", "confidence": "none", "has_data": False}
        
        monthly = cat_df.groupby(["year", "month"])["amount"].sum().reset_index()
        month_data = monthly[monthly["month"] == month]
        
        if len(month_data) >= 2:
            amount = round(month_data["amount"].mean(), 2)
            method, confidence = "monthly_average", "medium"
        elif len(monthly) >= 3:
            recent = monthly.sort_values(["year", "month"]).tail(3)
            amount = round(recent["amount"].mean(), 2)
            method, confidence = "recent_average", "low"
        elif len(monthly) > 0:
            amount = round(monthly["amount"].mean(), 2)
            method, confidence = "category_average", "low"
        else:
            amount, method, confidence = 0, "no_data", "none"
        
        return {"estimated_amount": amount, "method": method, "confidence": confidence,
                "has_data": True, "transaction_count": len(cat_df)}
    
    def predict_for_month(self, person_id: int, category_name: str, month: int) -> Dict:
        """Predict spending for category in given month."""
        model_data = self._get_or_train_model(person_id)
        
        if model_data:
            result = self._predict_with_ml(model_data, category_name, month)
            if result:
                prediction, confidence = result
                return {
                    "estimated_amount": prediction, "method": "gradient_boosting",
                    "confidence": confidence, "has_data": True, "is_ml": True,
                    "model_metrics": model_data["metrics"]
                }
        
        stats_pred = self._predict_with_statistics(person_id, category_name, month)
        stats_pred["is_ml"] = False
        return stats_pred
    
    def predict_all_categories(self, person_id: int, month: int, year: int = None) -> List[Dict]:
        """Predict spending for all expense categories."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM categories WHERE type = 'expense'")
        categories = cursor.fetchall()
        conn.close()

        predictions = []

        # Determine if target month is in the future relative to current date
        now = datetime.now()
        if year is None:
            year = now.year
        months_diff = (year - now.year) * 12 + (month - now.month)

        for cat_id, cat_name in categories:
            if months_diff <= 0:
                # Past or current month -> direct single-step prediction
                pred = self.predict_for_month(person_id, cat_name, month)
            else:
                # Future month -> run recursive multi-step forecast
                future_sequence = self.predict_next_months(person_id, cat_name, months_ahead=months_diff)
                target_pred = next((p for p in future_sequence if p["month"] == month and p["year"] == year), None)
                if target_pred:
                    pred = {k: target_pred[k] for k in ("estimated_amount", "method", "confidence", "has_data", "is_ml")}
                else:
                    pred = {"estimated_amount": 0, "method": "error", "confidence": "none", "has_data": False, "is_ml": False}

            predictions.append({"category_id": cat_id, "category": cat_name, **pred})

        predictions.sort(key=lambda x: (not x.get("is_ml", False), not x.get("has_data", False), -x["estimated_amount"]))
        return predictions
    
    def predict_next_months(self, person_id: int, category_name: str, months_ahead: int = 12) -> List[Dict]:
        """
        Predict spending for next N months using recursive multi-step forecasting.
        Each prediction uses previous predictions as lag features (walk-forward simulation).
        """
        current_date = datetime.now()
        predictions = []

        # Initialize lag state from latest training data for recursive forecasting
        model_data = self._get_or_train_model(person_id)
        current_lags = {"lag_1": 0, "lag_2": 0, "lag_3": 0, "pct_change": 0, "cv": 0}
        if model_data and category_name in model_data["label_encoder"].classes_:
            latest_lags = model_data["latest_lags"]
            lag_row = latest_lags[latest_lags["category"] == category_name]
            cat_stats = model_data.get("cat_stats")
            cat_row = cat_stats[cat_stats["category"] == category_name] if cat_stats is not None else None
            if not lag_row.empty:
                current_lags = {
                    "lag_1": lag_row["lag_1"].values[0] if pd.notna(lag_row["lag_1"].values[0]) else 0,
                    "lag_2": lag_row["lag_2"].values[0] if pd.notna(lag_row["lag_2"].values[0]) else 0,
                    "lag_3": lag_row["lag_3"].values[0] if pd.notna(lag_row["lag_3"].values[0]) else 0,
                    "pct_change": lag_row["pct_change"].values[0] if pd.notna(lag_row["pct_change"].values[0]) else 0,
                    "cv": lag_row["cv"].values[0] if pd.notna(lag_row["cv"].values[0]) else 0,
                }
            elif cat_row is not None and not cat_row.empty:
                avg = cat_row["cat_avg"].values[0]
                current_lags = {"lag_1": avg, "lag_2": avg, "lag_3": avg, "pct_change": 0, "cv": 0}

        # Simulate months 1..months_ahead (1 = next month) with walk-forward lag updates
        for i in range(1, max(0, months_ahead) + 1):
            future_month = ((current_date.month - 1 + i) % 12) + 1
            future_year = current_date.year + (current_date.month - 1 + i) // 12

            if model_data and category_name in model_data["label_encoder"].classes_:
                # Use ML model with walk-forward lag simulation
                pred_val, conf = self._predict_with_ml(model_data, category_name, future_month)
                # If model returned None, fallback to statistics
                if pred_val is None:
                    stats = self._predict_with_statistics(person_id, category_name, future_month)
                    pred_val = stats["estimated_amount"]
                    conf = stats.get("confidence", "none")
                    has_data = stats.get("has_data", False)
                    is_ml = False
                else:
                    has_data = True
                    is_ml = True

                # Update lags for next iteration (walk-forward)
                old_lag_1 = current_lags.get("lag_1", 0) or 0
                new_pct_change = 0
                if old_lag_1 and old_lag_1 > 0:
                    new_pct_change = (pred_val - old_lag_1) / old_lag_1

                current_lags = {
                    "lag_1": pred_val,
                    "lag_2": current_lags.get("lag_1", 0),
                    "lag_3": current_lags.get("lag_2", 0),
                    "pct_change": new_pct_change,
                    "cv": current_lags.get("cv", 0)
                }
                method = "gradient_boosting_recursive" if is_ml else "statistics"
                conf_final = conf
            else:
                stats = self._predict_with_statistics(person_id, category_name, future_month)
                pred_val = stats["estimated_amount"]
                method = stats["method"]
                conf_final = stats["confidence"]
                has_data = stats.get("has_data", False)
                is_ml = False

            predictions.append({
                "month": future_month,
                "year": future_year,
                "estimated_amount": pred_val,
                "method": method,
                "confidence": conf_final,
                "has_data": has_data,
                "is_ml": is_ml
            })

        return predictions
    
    def get_category_stats(self, person_id: int, category_name: str) -> Dict:
        """Get statistics for a category based on last 12 months (trend: up/down/stable)."""
        df = self._get_user_transactions(person_id)
        cat_df = df[df["category"] == category_name]
        
        if cat_df.empty:
            return {"has_data": False, "count": 0, "total": 0, "average": 0, 
                    "min": 0, "max": 0, "trend_direction": "none"}
        
        monthly = cat_df.groupby(["year", "month"])["amount"].sum().reset_index()
        monthly = monthly.sort_values(["year", "month"])
        
        stats = {
            "has_data": True,
            "count": len(cat_df),
            "total": round(float(cat_df["amount"].sum()), 2),
            "average": round(float(cat_df["amount"].mean()), 2),
            "monthly_average": round(float(monthly["amount"].mean()), 2) if len(monthly) > 0 else 0,
            "min": round(float(cat_df["amount"].min()), 2),
            "max": round(float(cat_df["amount"].max()), 2),
        }
        # Trend based on last 12 months
        if len(monthly) >= 6:
            recent = monthly.tail(12)
            if len(recent) >= 6:
                half = len(recent) // 2
                first_half_avg = recent.head(half)["amount"].mean()
                second_half_avg = recent.tail(half)["amount"].mean()
                if first_half_avg > 0:
                    change = ((second_half_avg - first_half_avg) / first_half_avg) * 100
                    # Tylko kierunek, bez procentów
                    stats["trend_direction"] = "up" if change > 5 else "down" if change < -5 else "stable"
                else:
                    stats["trend_direction"] = "stable"
            else:
                stats["trend_direction"] = "insufficient_data"
        else:
            stats["trend_direction"] = "insufficient_data"
        return stats
    
    def get_user_summary(self, person_id: int) -> Dict:
        """Get user spending summary with ML status."""
        df = self._get_user_transactions(person_id)
        
        if df.empty:
            return {"has_data": False, "total_transactions": 0, "total_spent": 0,
                    "monthly_average": 0, "uses_ml": False, "ml_ready": False, "categories": []}
        
        model_data = self._get_or_train_model(person_id)
        uses_ml = model_data is not None
        
        cat_stats = df.groupby("category")["amount"].agg(["sum", "mean", "count"]).reset_index()
        cat_stats.columns = ["category", "total", "average", "count"]
        
        categories = []
        for _, row in cat_stats.iterrows():
            stats = self.get_category_stats(person_id, row["category"])
            categories.append({
                "name": row["category"],
                "total_spent": round(float(row["total"]), 2),
                "average": round(float(row["average"]), 2),
                "transaction_count": int(row["count"]),
                "trend_direction": stats["trend_direction"]
            })
        categories.sort(key=lambda x: x["total_spent"], reverse=True)
        
        monthly = df.groupby(["year", "month"])["amount"].sum()
        monthly_avg = monthly.mean() if len(monthly) > 0 else 0
        
        result = {
            "has_data": True,
            "total_transactions": len(df),
            "total_spent": round(float(df["amount"].sum()), 2),
            "monthly_average": round(float(monthly_avg), 2),
            "uses_ml": uses_ml,
            "ml_ready": uses_ml,
            "transactions_needed": max(0, self.MIN_TRANSACTIONS_FOR_ML - len(df)) if not uses_ml else 0,
            "categories": categories
        }
        
        if model_data:
            result["model_metrics"] = model_data["metrics"]
            result["feature_importance"] = model_data["feature_importance"]
        
        return result
    
    def retrain_user_model(self, person_id: int) -> Dict:
        """Force retrain ML model."""
        if person_id in self._user_models:
            del self._user_models[person_id]
        
        model_data = self._train_model(person_id)
        
        if model_data:
            self._user_models[person_id] = model_data
            return {"success": True, "metrics": model_data["metrics"],
                    "feature_importance": model_data["feature_importance"]}
        else:
            df = self._get_user_transactions(person_id)
            return {"success": False, "current_count": len(df),
                    "required": self.MIN_TRANSACTIONS_FOR_ML}
    
    def get_feature_importance(self, person_id: int) -> Optional[Dict]:
        """Get feature importance from model."""
        model_data = self._get_or_train_model(person_id)
        if model_data:
            return {"importance": model_data["feature_importance"]}
        return None

