"""
User-based ML prediction module for budget forecasting.
Uses Random Forest trained on individual user's transaction history.
Falls back to statistical analysis when insufficient data.
"""
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

from .config import settings


class UserMLPredictor:
    """
    Machine Learning predictor trained on individual user's spending history.
    
    Uses Random Forest with features:
    - Category (encoded)
    - Month (1-12)
    - Day of week pattern
    - Season
    - Historical spending patterns
    
    Falls back to statistical averages when user has <30 transactions.
    """
    
    # Minimum transactions required for ML model
    MIN_TRANSACTIONS_FOR_ML = 30
    
    def __init__(self, db_path: str = None):
        """
        Initialize predictor with database connection.
        
        Args:
            db_path: Path to SQLite database. Uses config.py settings by default.
        """
        if db_path is None:
            # Extract path from SQLAlchemy URL: sqlite:///path/to/db.db
            db_url = settings.SQLALCHEMY_DATABASE_URL
            db_path = db_url.replace("sqlite:///", "")
        
        self.db_path = str(db_path)
        
        # Cache for user models (person_id -> trained model)
        self._user_models: Dict[int, dict] = {}
    
    def _get_user_transactions(
        self,
        person_id: int,
        expense_only: bool = True
    ) -> pd.DataFrame:
        """
        Fetch user's transaction history from database.
        
        Args:
            person_id: User's database ID
            expense_only: If True, only return expense transactions
            
        Returns:
            DataFrame with transaction history
        """
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
            df["day_of_week"] = df["date"].dt.dayofweek
            df["year"] = df["date"].dt.year
            df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
        
        return df
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create ML features from transaction data.
        
        Features created:
        - month: Month number (1-12)
        - season: Season (0=winter, 1=spring, 2=summer, 3=autumn)
        - is_weekend: Transaction on weekend
        - is_month_start: First week of month
        - is_month_end: Last week of month
        - category_encoded: Numeric category ID
        """
        df = df.copy()
        
        # Season from month
        df["season"] = df["month"].apply(lambda m: 
            0 if m in [12, 1, 2] else      # Winter
            1 if m in [3, 4, 5] else       # Spring
            2 if m in [6, 7, 8] else       # Summer
            3                               # Autumn
        )
        
        # Day patterns
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        
        # Week of month patterns
        df["day_of_month"] = df["date"].dt.day
        df["is_month_start"] = (df["day_of_month"] <= 7).astype(int)
        df["is_month_end"] = (df["day_of_month"] >= 24).astype(int)
        
        # Quarter
        df["quarter"] = (df["month"] - 1) // 3 + 1
        
        # Holiday months (typically higher spending)
        df["is_holiday_month"] = df["month"].isin([12, 1, 7, 8]).astype(int)
        
        return df
    
    def _train_user_model(self, person_id: int) -> Optional[dict]:
        """
        Train a Random Forest model on user's MONTHLY spending aggregates.
        Predicts total monthly spending per category, not individual transactions.
        
        Args:
            person_id: User's database ID
            
        Returns:
            Dict with trained model and encoders, or None if insufficient data
        """
        df = self._get_user_transactions(person_id)
        
        if len(df) < self.MIN_TRANSACTIONS_FOR_ML:
            return None
        
        # Aggregate to monthly totals per category
        monthly_df = df.groupby(["category", "year", "month"]).agg({
            "amount": "sum",
            "id": "count"  # transaction count
        }).reset_index()
        monthly_df.columns = ["category", "year", "month", "monthly_total", "tx_count"]
        
        # Need at least 6 months of data for meaningful ML
        if len(monthly_df) < 6:
            return None
        
        # Encode categories
        label_encoder = LabelEncoder()
        monthly_df["category_encoded"] = label_encoder.fit_transform(monthly_df["category"])
        
        # Add features
        monthly_df["season"] = monthly_df["month"].apply(lambda m: 
            0 if m in [12, 1, 2] else 1 if m in [3, 4, 5] else 2 if m in [6, 7, 8] else 3
        )
        monthly_df["quarter"] = (monthly_df["month"] - 1) // 3 + 1
        monthly_df["is_holiday_month"] = monthly_df["month"].isin([12, 1, 7, 8]).astype(int)
        
        # Calculate category statistics
        cat_stats = monthly_df.groupby("category")["monthly_total"].agg(["mean", "std"]).reset_index()
        cat_stats.columns = ["category", "cat_mean", "cat_std"]
        cat_stats["cat_std"] = cat_stats["cat_std"].fillna(0)
        monthly_df = monthly_df.merge(cat_stats, on="category", how="left")
        
        # Feature columns for monthly prediction
        feature_cols = [
            "category_encoded", "month", "season", "quarter",
            "is_holiday_month", "cat_mean", "cat_std"
        ]
        
        X = monthly_df[feature_cols]
        y = monthly_df["monthly_total"]  # Target: monthly sum
        
        # Train Random Forest
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=8,
            min_samples_split=3,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X, y)
        
        # Calculate model quality metrics
        predictions = model.predict(X)
        mae = np.mean(np.abs(predictions - y))
        r2 = model.score(X, y)
        
        # Store model components
        model_data = {
            "model": model,
            "label_encoder": label_encoder,
            "feature_cols": feature_cols,
            "cat_stats": cat_stats,
            "categories": list(label_encoder.classes_),
            "monthly_data": monthly_df,  # Store for reference
            "metrics": {
                "mae": round(mae, 2),
                "r2": round(r2, 4),
                "training_months": len(monthly_df),
                "training_samples": len(df)
            },
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
    ) -> Optional[float]:
        """
        Make MONTHLY prediction using trained ML model.
        Predicts total spending for the month, not individual transactions.
        
        Args:
            model_data: Trained model components
            category_name: Category to predict
            month: Month number (1-12)
            
        Returns:
            Predicted monthly total or None if category unknown
        """
        model = model_data["model"]
        label_encoder = model_data["label_encoder"]
        cat_stats = model_data["cat_stats"]
        
        # Check if category exists in model
        if category_name not in label_encoder.classes_:
            return None
        
        # Encode category
        cat_encoded = label_encoder.transform([category_name])[0]
        
        # Get category stats (monthly averages)
        cat_row = cat_stats[cat_stats["category"] == category_name]
        cat_mean = cat_row["cat_mean"].values[0] if len(cat_row) > 0 else 0
        cat_std = cat_row["cat_std"].values[0] if len(cat_row) > 0 else 0
        
        # Calculate features
        season = 0 if month in [12, 1, 2] else 1 if month in [3, 4, 5] else 2 if month in [6, 7, 8] else 3
        quarter = (month - 1) // 3 + 1
        is_holiday = 1 if month in [12, 1, 7, 8] else 0
        
        # Create feature vector for monthly prediction
        features = pd.DataFrame([{
            "category_encoded": cat_encoded,
            "month": month,
            "season": season,
            "quarter": quarter,
            "is_holiday_month": is_holiday,
            "cat_mean": cat_mean,
            "cat_std": cat_std
        }])
        
        prediction = model.predict(features)[0]
        return max(0, round(prediction, 2))
    
    def _predict_with_statistics(
        self,
        person_id: int,
        category_name: str,
        month: int
    ) -> Dict:
        """
        Fallback prediction using statistical MONTHLY averages.
        Used when user has insufficient data for ML.
        
        Args:
            person_id: User's database ID
            category_name: Category to predict
            month: Month number (1-12)
            
        Returns:
            Prediction dict with statistical estimate of monthly total
        """
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
            amount = round(month_data["amount"].mean(), 2)
            method = "monthly_average"
            confidence = "średnia"
        elif len(monthly_totals) > 0:
            # Use overall monthly average
            amount = round(monthly_totals["amount"].mean(), 2)
            method = "category_monthly_average"
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
        """
        Predict spending for a specific category and month.
        Uses ML model if available, otherwise statistical fallback.
        
        Args:
            person_id: User's database ID
            category_name: Category name
            month: Month number (1-12)
            
        Returns:
            Dict with prediction details including method used
        """
        model_data = self._get_or_train_model(person_id)
        
        if model_data:
            # Use ML prediction
            ml_prediction = self._predict_with_ml(model_data, category_name, month)
            
            if ml_prediction is not None:
                return {
                    "estimated_amount": ml_prediction,
                    "method": "random_forest",
                    "confidence": "wysoka",
                    "has_data": True,
                    "model_metrics": model_data["metrics"],
                    "is_ml": True
                }
            else:
                # Category not in training data - use statistics
                stats_pred = self._predict_with_statistics(person_id, category_name, month)
                stats_pred["is_ml"] = False
                return stats_pred
        else:
            # Not enough data for ML - use statistics
            stats_pred = self._predict_with_statistics(person_id, category_name, month)
            stats_pred["is_ml"] = False
            return stats_pred
    
    def predict_all_categories(
        self,
        person_id: int,
        month: int = None
    ) -> List[Dict]:
        """
        Predict spending for all expense categories.
        
        Args:
            person_id: User's database ID
            month: Target month (default: current)
            
        Returns:
            List of predictions per category
        """
        if month is None:
            month = datetime.now().month
        
        # Get all expense categories
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM categories WHERE type = 'expense'")
        categories = cursor.fetchall()
        conn.close()
        
        predictions = []
        
        for cat_id, cat_name in categories:
            pred = self.predict_for_month(person_id, cat_name, month)
            predictions.append({
                "category_id": cat_id,
                "category": cat_name,
                **pred
            })
        
        # Sort: ML predictions first, then by amount
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
        """
        Predict spending for next N months.
        
        Args:
            person_id: User's database ID
            category_name: Category name
            months_ahead: Number of months to predict
            
        Returns:
            List of monthly predictions
        """
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
        """
        Get detailed statistics for a category.
        
        Args:
            person_id: User's database ID
            category_name: Category name
            
        Returns:
            Statistics dict with count, average, trend, etc.
        """
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
        
        stats = {
            "has_data": True,
            "count": len(cat_df),
            "total": round(float(cat_df["amount"].sum()), 2),
            "average": round(float(cat_df["amount"].mean()), 2),
            "min": round(float(cat_df["amount"].min()), 2),
            "max": round(float(cat_df["amount"].max()), 2),
        }
        
        # Calculate trend
        if len(cat_df) >= 4:
            cat_df = cat_df.sort_values("date")
            mid = len(cat_df) // 2
            older_avg = cat_df.iloc[:mid]["amount"].mean()
            recent_avg = cat_df.iloc[mid:]["amount"].mean()
            
            if older_avg > 0:
                trend_pct = ((recent_avg - older_avg) / older_avg) * 100
                stats["trend"] = round(trend_pct, 1)
                
                if trend_pct > 10:
                    stats["trend_label"] = "rosnący"
                elif trend_pct < -10:
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
        """
        Get complete spending summary including model status.
        
        Args:
            person_id: User's database ID
            
        Returns:
            Summary with totals, model info, and per-category breakdown
        """
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
        
        # Check ML model status
        model_data = self._get_or_train_model(person_id)
        uses_ml = model_data is not None
        
        if uses_ml:
            ml_status = f"Model ML aktywny (R²: {model_data['metrics']['r2']:.1%})"
        else:
            remaining = self.MIN_TRANSACTIONS_FOR_ML - len(df)
            ml_status = f"Potrzeba jeszcze {remaining} transakcji dla modelu ML"
        
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
                "transaction_count": int(row["count"]),
                "trend": stats["trend_label"]
            })
        
        categories.sort(key=lambda x: x["total_spent"], reverse=True)
        
        # Monthly average
        monthly = df.groupby(["year", "month"])["amount"].sum()
        monthly_avg = monthly.mean() if len(monthly) > 0 else 0
        
        return {
            "has_data": True,
            "total_transactions": len(df),
            "total_spent": round(float(df["amount"].sum()), 2),
            "monthly_average": round(float(monthly_avg), 2),
            "uses_ml": uses_ml,
            "ml_status": ml_status,
            "model_metrics": model_data["metrics"] if model_data else None,
            "categories": categories,
            "date_range": {
                "from": df["date"].min().strftime("%Y-%m-%d"),
                "to": df["date"].max().strftime("%Y-%m-%d")
            }
        }
    
    def retrain_user_model(self, person_id: int) -> Dict:
        """
        Force retrain ML model for user.
        
        Args:
            person_id: User's database ID
            
        Returns:
            Training result with metrics
        """
        # Clear cached model
        if person_id in self._user_models:
            del self._user_models[person_id]
        
        # Train new model
        model_data = self._train_user_model(person_id)
        
        if model_data:
            self._user_models[person_id] = model_data
            return {
                "success": True,
                "message": "Model ML przeszkolony pomyślnie",
                "metrics": model_data["metrics"]
            }
        else:
            df = self._get_user_transactions(person_id)
            remaining = self.MIN_TRANSACTIONS_FOR_ML - len(df)
            return {
                "success": False,
                "message": f"Za mało danych. Potrzeba jeszcze {remaining} transakcji.",
                "current_count": len(df),
                "required": self.MIN_TRANSACTIONS_FOR_ML
            }
    
    @staticmethod
    def _get_month_name(month: int) -> str:
        """Get Polish month name."""
        months = [
            "Styczeń", "Luty", "Marzec", "Kwiecień",
            "Maj", "Czerwiec", "Lipiec", "Sierpień",
            "Wrzesień", "Październik", "Listopad", "Grudzień"
        ]
        return months[month - 1] if 1 <= month <= 12 else ""


# Alias for backward compatibility
UserPredictor = UserMLPredictor