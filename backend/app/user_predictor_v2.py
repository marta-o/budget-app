"""
Enhanced ML prediction module for budget forecasting (v2).
Uses Random Forest with advanced feature engineering.

Key improvements over v1:
- Lag features (previous months' spending)
- Rolling averages (3-month, 6-month trends)
- Year-over-year comparison
- Cross-validation for model evaluation
- Feature importance analysis
- Better confidence estimation
"""
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

from .config import settings


class EnhancedMLPredictor:
    """
    Enhanced Machine Learning predictor for budget forecasting.
    
    Architecture:
    ┌─────────────────────────────────────────────────────────────┐
    │                    FEATURE ENGINEERING                       │
    ├─────────────────────────────────────────────────────────────┤
    │ Temporal Features:                                          │
    │   - month, season, quarter                                  │
    │   - is_holiday_month, is_year_end                          │
    │                                                             │
    │ Lag Features (historical patterns):                         │
    │   - lag_1: spending 1 month ago                            │
    │   - lag_2: spending 2 months ago                           │
    │   - lag_3: spending 3 months ago                           │
    │   - lag_12: spending same month last year (YoY)            │
    │                                                             │
    │ Rolling Features (trends):                                  │
    │   - rolling_mean_3: 3-month moving average                 │
    │   - rolling_mean_6: 6-month moving average                 │
    │   - rolling_std_3: 3-month volatility                      │
    │                                                             │
    │ Category Statistics:                                        │
    │   - cat_mean, cat_std, cat_median                          │
    │   - spending_ratio: category vs total spending              │
    └─────────────────────────────────────────────────────────────┘
    
    Falls back to statistical analysis when insufficient data (<30 transactions).
    """
    
    # Minimum transactions required for ML model
    MIN_TRANSACTIONS_FOR_ML = 30
    MIN_MONTHS_FOR_ML = 6
    
    def __init__(self, db_path: str = None):
        """Initialize predictor with database connection."""
        if db_path is None:
            db_url = settings.SQLALCHEMY_DATABASE_URL
            db_path = db_url.replace("sqlite:///", "")
        
        self.db_path = str(db_path)
        self._user_models: Dict[int, dict] = {}
    
    def _get_user_transactions(
        self,
        person_id: int,
        expense_only: bool = True
    ) -> pd.DataFrame:
        """Fetch user's transaction history from database."""
        conn = sqlite3.connect(self.db_path)
        
        query = """
        SELECT 
            t.id,
            t.title,
            t.date,
            t.amount,
            c.id as category_id,
            c.name as category,
            c.type as category_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.person_id = ?
        """
        
        if expense_only:
            query += " AND c.type = 'expense'"
        
        query += " ORDER BY t.date"
        
        df = pd.read_sql_query(query, conn, params=[person_id])
        conn.close()
        
        if not df.empty:
            df["date"] = pd.to_datetime(df["date"])
            df["month"] = df["date"].dt.month
            df["year"] = df["date"].dt.year
            df["day_of_week"] = df["date"].dt.dayofweek
            df["day_of_month"] = df["date"].dt.day
            df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
        
        return df
    
    def _create_monthly_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate transactions to monthly totals per category.
        Creates a complete timeline with zero-filling for missing months.
        """
        if df.empty:
            return pd.DataFrame()
        
        # Aggregate to monthly totals
        monthly = df.groupby(["category", "year", "month"]).agg({
            "amount": "sum",
            "id": "count"
        }).reset_index()
        monthly.columns = ["category", "year", "month", "amount", "tx_count"]
        
        # Create complete date range for each category
        categories = monthly["category"].unique()
        min_date = df["date"].min()
        max_date = df["date"].max()
        
        # Generate all year-month combinations
        date_range = pd.date_range(
            start=min_date.replace(day=1),
            end=max_date.replace(day=1),
            freq='MS'
        )
        
        complete_data = []
        for cat in categories:
            for date in date_range:
                complete_data.append({
                    "category": cat,
                    "year": date.year,
                    "month": date.month
                })
        
        complete_df = pd.DataFrame(complete_data)
        
        # Merge with actual data (fill missing with 0)
        monthly = complete_df.merge(
            monthly,
            on=["category", "year", "month"],
            how="left"
        ).fillna({"amount": 0, "tx_count": 0})
        
        # Sort chronologically
        monthly = monthly.sort_values(["category", "year", "month"])
        
        return monthly
    
    def _engineer_features(self, monthly_df: pd.DataFrame) -> pd.DataFrame:
        """
        Create advanced ML features from monthly data.
        
        Features created:
        1. Temporal: month, season, quarter, is_holiday, is_year_end
        2. Lag: spending 1, 2, 3, 12 months ago
        3. Rolling: 3-month and 6-month moving averages
        4. Category stats: mean, std, median
        """
        df = monthly_df.copy()
        
        # === TEMPORAL FEATURES ===
        df["season"] = df["month"].apply(lambda m: 
            0 if m in [12, 1, 2] else    # Winter
            1 if m in [3, 4, 5] else     # Spring
            2 if m in [6, 7, 8] else     # Summer
            3                             # Autumn
        )
        df["quarter"] = (df["month"] - 1) // 3 + 1
        df["is_holiday_month"] = df["month"].isin([12, 1, 7, 8]).astype(int)
        df["is_year_end"] = df["month"].isin([11, 12]).astype(int)
        df["is_year_start"] = df["month"].isin([1, 2]).astype(int)
        
        # === LAG FEATURES (per category) ===
        for lag in [1, 2, 3, 6, 12]:
            df[f"lag_{lag}"] = df.groupby("category")["amount"].shift(lag)
        
        # === ROLLING FEATURES (per category) ===
        df["rolling_mean_3"] = df.groupby("category")["amount"].transform(
            lambda x: x.rolling(window=3, min_periods=1).mean()
        )
        df["rolling_mean_6"] = df.groupby("category")["amount"].transform(
            lambda x: x.rolling(window=6, min_periods=1).mean()
        )
        df["rolling_std_3"] = df.groupby("category")["amount"].transform(
            lambda x: x.rolling(window=3, min_periods=1).std()
        ).fillna(0)
        
        # Rolling max and min
        df["rolling_max_3"] = df.groupby("category")["amount"].transform(
            lambda x: x.rolling(window=3, min_periods=1).max()
        )
        df["rolling_min_3"] = df.groupby("category")["amount"].transform(
            lambda x: x.rolling(window=3, min_periods=1).min()
        )
        
        # === TREND FEATURES ===
        # Month-over-month change
        df["mom_change"] = df.groupby("category")["amount"].pct_change().fillna(0)
        df["mom_change"] = df["mom_change"].replace([np.inf, -np.inf], 0)
        
        # Year-over-year comparison (if lag_12 exists)
        df["yoy_ratio"] = np.where(
            df["lag_12"] > 0,
            df["amount"] / df["lag_12"],
            1.0
        )
        df["yoy_ratio"] = df["yoy_ratio"].clip(0, 5)  # Cap extreme values
        
        # === CATEGORY STATISTICS ===
        cat_stats = df.groupby("category")["amount"].agg(["mean", "std", "median"]).reset_index()
        cat_stats.columns = ["category", "cat_mean", "cat_std", "cat_median"]
        cat_stats["cat_std"] = cat_stats["cat_std"].fillna(0)
        df = df.merge(cat_stats, on="category", how="left")
        
        # Category's share of total spending
        total_by_period = df.groupby(["year", "month"])["amount"].transform("sum")
        df["spending_ratio"] = np.where(
            total_by_period > 0,
            df["amount"] / total_by_period,
            0
        )
        
        # Coefficient of variation (normalized volatility)
        df["cv"] = np.where(
            df["cat_mean"] > 0,
            df["cat_std"] / df["cat_mean"],
            0
        )
        
        return df
    
    def _train_user_model(self, person_id: int) -> Optional[dict]:
        """
        Train Random Forest model on user's monthly spending patterns.
        
        Uses TimeSeriesSplit for cross-validation to respect temporal ordering.
        """
        df = self._get_user_transactions(person_id)
        
        if len(df) < self.MIN_TRANSACTIONS_FOR_ML:
            return None
        
        # Create monthly aggregates
        monthly_df = self._create_monthly_aggregates(df)
        
        # Need sufficient months of data
        unique_months = monthly_df.groupby(["year", "month"]).ngroups
        if unique_months < self.MIN_MONTHS_FOR_ML:
            return None
        
        # Encode categories
        label_encoder = LabelEncoder()
        monthly_df["category_encoded"] = label_encoder.fit_transform(monthly_df["category"])
        
        # Engineer features
        featured_df = self._engineer_features(monthly_df)
        
        # Remove rows with NaN in lag features (first few months)
        featured_df = featured_df.dropna(subset=["lag_1", "lag_2", "lag_3"])
        
        if len(featured_df) < 10:
            return None
        
        # Feature columns
        feature_cols = [
            # Category encoding
            "category_encoded",
            # Temporal
            "month", "season", "quarter", "is_holiday_month", 
            "is_year_end", "is_year_start",
            # Lag features
            "lag_1", "lag_2", "lag_3",
            # Rolling features
            "rolling_mean_3", "rolling_mean_6", "rolling_std_3",
            "rolling_max_3", "rolling_min_3",
            # Trend
            "mom_change",
            # Category statistics
            "cat_mean", "cat_std", "cat_median", "cv"
        ]
        
        # Add lag_12 if we have enough data
        if featured_df["lag_12"].notna().sum() > 10:
            feature_cols.extend(["lag_12", "yoy_ratio"])
        
        X = featured_df[feature_cols].fillna(0)
        y = featured_df["amount"]
        
        # Normalize features for better performance
        scaler = StandardScaler()
        X_scaled = pd.DataFrame(
            scaler.fit_transform(X),
            columns=feature_cols,
            index=X.index
        )
        
        # Train Random Forest
        model = RandomForestRegressor(
            n_estimators=150,
            max_depth=10,
            min_samples_split=3,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )
        
        # Cross-validation with time series split
        tscv = TimeSeriesSplit(n_splits=min(5, len(featured_df) // 3))
        cv_scores = cross_val_score(model, X_scaled, y, cv=tscv, scoring='neg_mean_absolute_error')
        cv_mae = -cv_scores.mean()
        
        # Train final model on all data
        model.fit(X_scaled, y)
        
        # Calculate metrics
        predictions = model.predict(X_scaled)
        mae = mean_absolute_error(y, predictions)
        rmse = np.sqrt(mean_squared_error(y, predictions))
        r2 = r2_score(y, predictions)
        
        # Feature importance
        feature_importance = dict(zip(feature_cols, model.feature_importances_))
        top_features = sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Get category statistics for prediction
        cat_stats = featured_df.groupby("category").agg({
            "cat_mean": "first",
            "cat_std": "first",
            "cat_median": "first",
            "cv": "first"
        }).reset_index()
        
        # Get latest lag values per category
        latest_lags = featured_df.sort_values(["category", "year", "month"]).groupby("category").last()[
            ["lag_1", "lag_2", "lag_3", "rolling_mean_3", "rolling_mean_6", 
             "rolling_std_3", "rolling_max_3", "rolling_min_3", "mom_change"]
        ].reset_index()
        
        if "lag_12" in feature_cols:
            latest_lags_extra = featured_df.sort_values(["category", "year", "month"]).groupby("category").last()[
                ["lag_12", "yoy_ratio"]
            ].reset_index()
            latest_lags = latest_lags.merge(latest_lags_extra, on="category", how="left")
        
        model_data = {
            "model": model,
            "scaler": scaler,
            "label_encoder": label_encoder,
            "feature_cols": feature_cols,
            "cat_stats": cat_stats,
            "latest_lags": latest_lags,
            "categories": list(label_encoder.classes_),
            "metrics": {
                "mae": round(mae, 2),
                "cv_mae": round(cv_mae, 2),
                "rmse": round(rmse, 2),
                "r2": round(r2, 4),
                "training_months": unique_months,
                "training_samples": len(df)
            },
            "feature_importance": dict(top_features),
            "trained_at": datetime.now().isoformat()
        }
        
        return model_data
    
    def _get_or_train_model(self, person_id: int) -> Optional[dict]:
        """Get cached model or train new one for user."""
        if person_id not in self._user_models:
            model_data = self._train_user_model(person_id)
            if model_data:
                self._user_models[person_id] = model_data
        
        return self._user_models.get(person_id)
    
    def _predict_with_ml(
        self,
        model_data: dict,
        category_name: str,
        month: int
    ) -> Optional[Tuple[float, str]]:
        """
        Make prediction using trained ML model.
        Returns (prediction, confidence_level).
        """
        model = model_data["model"]
        scaler = model_data["scaler"]
        label_encoder = model_data["label_encoder"]
        feature_cols = model_data["feature_cols"]
        cat_stats = model_data["cat_stats"]
        latest_lags = model_data["latest_lags"]
        
        # Check if category exists
        if category_name not in label_encoder.classes_:
            return None
        
        cat_encoded = label_encoder.transform([category_name])[0]
        
        # Get category stats
        cat_row = cat_stats[cat_stats["category"] == category_name]
        if len(cat_row) == 0:
            return None
        
        cat_mean = cat_row["cat_mean"].values[0]
        cat_std = cat_row["cat_std"].values[0]
        cat_median = cat_row["cat_median"].values[0]
        cv = cat_row["cv"].values[0]
        
        # Get latest lag values
        lag_row = latest_lags[latest_lags["category"] == category_name]
        
        # Calculate temporal features
        season = 0 if month in [12, 1, 2] else 1 if month in [3, 4, 5] else 2 if month in [6, 7, 8] else 3
        quarter = (month - 1) // 3 + 1
        is_holiday = 1 if month in [12, 1, 7, 8] else 0
        is_year_end = 1 if month in [11, 12] else 0
        is_year_start = 1 if month in [1, 2] else 0
        
        # Build feature vector
        features = {
            "category_encoded": cat_encoded,
            "month": month,
            "season": season,
            "quarter": quarter,
            "is_holiday_month": is_holiday,
            "is_year_end": is_year_end,
            "is_year_start": is_year_start,
            "cat_mean": cat_mean,
            "cat_std": cat_std,
            "cat_median": cat_median,
            "cv": cv,
        }
        
        # Add lag features from latest data
        if len(lag_row) > 0:
            features.update({
                "lag_1": lag_row["lag_1"].values[0] or cat_mean,
                "lag_2": lag_row["lag_2"].values[0] or cat_mean,
                "lag_3": lag_row["lag_3"].values[0] or cat_mean,
                "rolling_mean_3": lag_row["rolling_mean_3"].values[0] or cat_mean,
                "rolling_mean_6": lag_row["rolling_mean_6"].values[0] or cat_mean,
                "rolling_std_3": lag_row["rolling_std_3"].values[0] or cat_std,
                "rolling_max_3": lag_row["rolling_max_3"].values[0] or cat_mean,
                "rolling_min_3": lag_row["rolling_min_3"].values[0] or cat_mean,
                "mom_change": lag_row["mom_change"].values[0] or 0,
            })
            
            if "lag_12" in feature_cols:
                features["lag_12"] = lag_row.get("lag_12", pd.Series([cat_mean])).values[0] or cat_mean
                features["yoy_ratio"] = lag_row.get("yoy_ratio", pd.Series([1.0])).values[0] or 1.0
        else:
            # Fallback to category mean
            features.update({
                "lag_1": cat_mean,
                "lag_2": cat_mean,
                "lag_3": cat_mean,
                "rolling_mean_3": cat_mean,
                "rolling_mean_6": cat_mean,
                "rolling_std_3": cat_std,
                "rolling_max_3": cat_mean,
                "rolling_min_3": cat_mean,
                "mom_change": 0,
            })
            if "lag_12" in feature_cols:
                features["lag_12"] = cat_mean
                features["yoy_ratio"] = 1.0
        
        # Create DataFrame with correct column order
        X = pd.DataFrame([features])[feature_cols].fillna(0)
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Get predictions from all trees for confidence estimation
        predictions_all_trees = np.array([tree.predict(X_scaled)[0] for tree in model.estimators_])
        
        prediction = np.mean(predictions_all_trees)
        prediction_std = np.std(predictions_all_trees)
        
        # Calculate confidence based on prediction variance
        coefficient_of_variation = prediction_std / max(prediction, 1)
        
        if coefficient_of_variation < 0.15:
            confidence = "wysoka"
        elif coefficient_of_variation < 0.3:
            confidence = "średnia"
        else:
            confidence = "niska"
        
        return max(0, round(prediction, 2)), confidence
    
    def _predict_with_statistics(
        self,
        person_id: int,
        category_name: str,
        month: int
    ) -> Dict:
        """Fallback prediction using statistical averages."""
        df = self._get_user_transactions(person_id)
        
        if df.empty:
            return {
                "estimated_amount": 0,
                "method": "no_data",
                "confidence": "brak",
                "has_data": False
            }
        
        cat_df = df[df["category"] == category_name]
        
        if cat_df.empty:
            return {
                "estimated_amount": 0,
                "method": "no_category_data",
                "confidence": "brak",
                "has_data": False
            }
        
        # Aggregate to monthly totals
        monthly_totals = cat_df.groupby(["year", "month"])["amount"].sum().reset_index()
        
        # Try month-specific average first
        month_data = monthly_totals[monthly_totals["month"] == month]
        
        if len(month_data) >= 2:
            # Weighted average favoring recent data
            weights = np.array(range(1, len(month_data) + 1))
            amount = round(np.average(month_data["amount"], weights=weights), 2)
            method = "weighted_monthly_average"
            confidence = "średnia"
        elif len(monthly_totals) >= 3:
            # Use recent months average
            recent = monthly_totals.sort_values(["year", "month"]).tail(3)
            amount = round(recent["amount"].mean(), 2)
            method = "recent_average"
            confidence = "niska"
        elif len(monthly_totals) > 0:
            amount = round(monthly_totals["amount"].mean(), 2)
            method = "category_average"
            confidence = "niska"
        else:
            amount = 0
            method = "no_monthly_data"
            confidence = "brak"
        
        return {
            "estimated_amount": amount,
            "method": method,
            "confidence": confidence,
            "has_data": True,
            "transaction_count": len(cat_df),
            "months_of_data": len(monthly_totals)
        }
    
    def predict_for_month(
        self,
        person_id: int,
        category_name: str,
        month: int
    ) -> Dict:
        """Predict spending for a specific category and month."""
        model_data = self._get_or_train_model(person_id)
        
        if model_data:
            result = self._predict_with_ml(model_data, category_name, month)
            
            if result is not None:
                prediction, confidence = result
                return {
                    "estimated_amount": prediction,
                    "method": "random_forest_v2",
                    "confidence": confidence,
                    "has_data": True,
                    "model_metrics": model_data["metrics"],
                    "is_ml": True
                }
        
        # Fallback to statistics
        stats_pred = self._predict_with_statistics(person_id, category_name, month)
        stats_pred["is_ml"] = False
        return stats_pred
    
    def predict_all_categories(
        self,
        person_id: int,
        month: int,
        year: int
    ) -> List[Dict]:
        """
        Predict spending for all expense categories for a SPECIFIC target date.
        Handles recursive prediction for future dates.
        """
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month
        
        # Oblicz ile miesięcy w przyszłość wybiegamy
        months_diff = (year - current_year) * 12 + (month - current_month)
        
        # Pobierz kategorie
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM categories WHERE type = 'expense'")
        categories = cursor.fetchall()
        conn.close()
        
        predictions = []
        
        for cat_id, cat_name in categories:
            # Jeśli data jest w przeszłości lub to obecny miesiąc
            if months_diff <= 0:
                pred = self.predict_for_month(person_id, cat_name, month)
            else:
                future_preds = self.predict_next_months(
                    person_id=person_id, 
                    category_name=cat_name, 
                    months_ahead=months_diff
                )
                
                # Bierzemy ostatni element z listy (nasz docelowy miesiąc)
                if future_preds:
                    # Znajdź predykcję pasującą do żądanego roku i miesiąca
                    target_pred = next(
                        (p for p in future_preds if p["month"] == month and p["year"] == year), 
                        future_preds[-1]
                    )
                    
                    # Dostosuj format do wyjścia predict_for_month
                    pred = {
                        "estimated_amount": target_pred["estimated_amount"],
                        "method": target_pred.get("method", "future_sim"),
                        "confidence": target_pred.get("confidence", "niska"),
                        "has_data": target_pred.get("has_data", False),
                        "is_ml": target_pred.get("is_ml", False)
                    }
                else:
                    pred = {
                        "estimated_amount": 0, 
                        "has_data": False, 
                        "confidence": "brak", 
                        "method": "no_data"
                    }

            predictions.append({
                "category_id": cat_id,
                "category": cat_name,
                **pred
            })
        
        # Sortowanie: ML na górze, potem kwota
        predictions.sort(key=lambda x: (
            not x.get("is_ml", False),
            not x.get("has_data", False),
            -x["estimated_amount"]
        ))
        
        return predictions
    
    def predict_next_months(
        self,
        person_id: int,
        category_name: str,
        months_ahead: int = 6
    ) -> List[Dict]:
        """Predict spending for next N months."""
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        predictions = []
        
        for i in range(months_ahead):
            future_month = ((current_month - 1 + i) % 12) + 1
            year_offset = (current_month - 1 + i) // 12
            future_year = current_year + year_offset
            
            pred = self.predict_for_month(person_id, category_name, future_month)
            
            predictions.append({
                "month": future_month,
                "year": future_year,
                "month_name": self._get_month_name(future_month),
                **pred
            })
        
        return predictions
    
    def get_category_stats(
        self,
        person_id: int,
        category_name: str
    ) -> Dict:
        """Get detailed statistics for a category."""
        df = self._get_user_transactions(person_id)
        cat_df = df[df["category"] == category_name]
        
        if cat_df.empty:
            return {
                "has_data": False,
                "count": 0,
                "total": 0,
                "average": 0,
                "min": 0,
                "max": 0,
                "trend": None,
                "trend_label": "brak danych"
            }
        
        # Monthly aggregates for trend
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
        
        # Calculate trend using linear regression
        if len(monthly) >= 3:
            x = np.arange(len(monthly))
            y = monthly["amount"].values
            
            # Simple linear regression
            slope = np.polyfit(x, y, 1)[0]
            avg = np.mean(y)
            
            if avg > 0:
                trend_pct = (slope * len(monthly) / avg) * 100
                stats["trend"] = round(trend_pct, 1)
                
                if trend_pct > 15:
                    stats["trend_label"] = "silnie rosnący"
                elif trend_pct > 5:
                    stats["trend_label"] = "rosnący"
                elif trend_pct < -15:
                    stats["trend_label"] = "silnie malejący"
                elif trend_pct < -5:
                    stats["trend_label"] = "malejący"
                else:
                    stats["trend_label"] = "stabilny"
            else:
                stats["trend"] = 0
                stats["trend_label"] = "stabilny"
        else:
            stats["trend"] = None
            stats["trend_label"] = "za mało danych"
        
        return stats
    
    def get_user_summary(self, person_id: int) -> Dict:
        """Get complete spending summary including model status."""
        df = self._get_user_transactions(person_id)
        
        if df.empty:
            return {
                "has_data": False,
                "total_transactions": 0,
                "total_spent": 0,
                "monthly_average": 0,
                "uses_ml": False,
                "ml_status": "Brak transakcji",
                "categories": []
            }
        
        model_data = self._get_or_train_model(person_id)
        uses_ml = model_data is not None
        
        if uses_ml:
            r2 = model_data['metrics']['r2']
            cv_mae = model_data['metrics']['cv_mae']
            ml_status = f"Model ML aktywny (R²: {r2:.1%}, CV MAE: {cv_mae:.2f} zł)"
        else:
            remaining = self.MIN_TRANSACTIONS_FOR_ML - len(df)
            ml_status = f"Potrzeba jeszcze {max(remaining, 0)} transakcji dla modelu ML"
        
        # Per-category breakdown
        cat_stats = df.groupby("category").agg({
            "amount": ["sum", "mean", "count"]
        }).reset_index()
        cat_stats.columns = ["category", "total", "average", "count"]
        
        categories = []
        for _, row in cat_stats.iterrows():
            stats = self.get_category_stats(person_id, row["category"])
            categories.append({
                "name": row["category"],
                "total_spent": round(float(row["total"]), 2),
                "average": round(float(row["average"]), 2),
                "monthly_average": stats.get("monthly_average", 0),
                "transaction_count": int(row["count"]),
                "trend": stats["trend_label"]
            })
        
        categories.sort(key=lambda x: x["total_spent"], reverse=True)
        
        # Monthly average
        monthly = df.groupby(["year", "month"])["amount"].sum()
        monthly_avg = monthly.mean() if len(monthly) > 0 else 0
        
        result = {
            "has_data": True,
            "total_transactions": len(df),
            "total_spent": round(float(df["amount"].sum()), 2),
            "monthly_average": round(float(monthly_avg), 2),
            "uses_ml": uses_ml,
            "ml_status": ml_status,
            "categories": categories,
            "date_range": {
                "from": df["date"].min().strftime("%Y-%m-%d"),
                "to": df["date"].max().strftime("%Y-%m-%d")
            }
        }
        
        if model_data:
            result["model_metrics"] = model_data["metrics"]
            result["feature_importance"] = model_data["feature_importance"]
        
        return result
    
    def retrain_user_model(self, person_id: int) -> Dict:
        """Force retrain ML model for user."""
        if person_id in self._user_models:
            del self._user_models[person_id]
        
        model_data = self._train_user_model(person_id)
        
        if model_data:
            self._user_models[person_id] = model_data
            return {
                "success": True,
                "message": "Model ML przeszkolony pomyślnie",
                "metrics": model_data["metrics"],
                "feature_importance": model_data["feature_importance"]
            }
        else:
            df = self._get_user_transactions(person_id)
            remaining = self.MIN_TRANSACTIONS_FOR_ML - len(df)
            return {
                "success": False,
                "message": f"Za mało danych. Potrzeba jeszcze {max(remaining, 0)} transakcji.",
                "current_count": len(df),
                "required": self.MIN_TRANSACTIONS_FOR_ML
            }
    
    def get_feature_importance(self, person_id: int) -> Optional[Dict]:
        """Get feature importance from trained model."""
        model_data = self._get_or_train_model(person_id)
        
        if model_data:
            return {
                "importance": model_data["feature_importance"],
                "description": {
                    "lag_1": "Wydatki z poprzedniego miesiąca",
                    "lag_2": "Wydatki sprzed 2 miesięcy",
                    "lag_3": "Wydatki sprzed 3 miesięcy",
                    "lag_12": "Wydatki z tego samego miesiąca rok temu",
                    "rolling_mean_3": "Średnia 3-miesięczna",
                    "rolling_mean_6": "Średnia 6-miesięczna",
                    "cat_mean": "Średnia dla kategorii",
                    "month": "Numer miesiąca",
                    "season": "Pora roku",
                    "is_holiday_month": "Czy miesiąc wakacyjny/świąteczny"
                }
            }
        return None
    
    @staticmethod
    def _get_month_name(month: int) -> str:
        """Get Polish month name."""
        months = [
            "Styczeń", "Luty", "Marzec", "Kwiecień",
            "Maj", "Czerwiec", "Lipiec", "Sierpień",
            "Wrzesień", "Październik", "Listopad", "Grudzień"
        ]
        return months[month - 1] if 1 <= month <= 12 else ""


# Alias for compatibility
UserMLPredictor = EnhancedMLPredictor
UserPredictor = EnhancedMLPredictor
