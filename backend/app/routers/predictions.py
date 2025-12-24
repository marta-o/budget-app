"""
Predictions router - API endpoints for ML-based spending forecasts.
Uses Random Forest trained on individual user's transaction history.
Falls back to statistical analysis when insufficient data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..models import User, Category
from ..dependencies import get_current_user
from ..user_predictor import UserMLPredictor

router = APIRouter(prefix="/predictions", tags=["Predictions"])

# Lazy-loaded predictor instance
_predictor: Optional[UserMLPredictor] = None


def get_predictor() -> UserMLPredictor:
    """Get or create predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = UserMLPredictor()
    return _predictor


@router.get("/forecast/{category_id}")
async def get_forecast_for_category(
    category_id: int,
    months: int = Query(default=6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get ML-based spending forecast for a specific category.
    
    Uses Random Forest if user has ≥30 transactions,
    otherwise falls back to statistical averages.
    """
    predictor = get_predictor()
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategoria nie znaleziona")
    
    if category.type != "expense":
        raise HTTPException(status_code=400, detail="Prognozy dostępne tylko dla wydatków")
    
    forecast = predictor.predict_next_months(
        person_id=current_user.person_id,
        category_name=category.name,
        months_ahead=months
    )
    
    stats = predictor.get_category_stats(current_user.person_id, category.name)
    
    return {
        "user_id": current_user.person_id,
        "category": category.name,
        "category_id": category_id,
        "has_data": stats["has_data"],
        "transaction_count": stats["count"],
        "category_average": stats["average"],
        "trend": stats["trend_label"],
        "forecast": forecast
    }


@router.get("/forecast-all")
async def get_forecast_all_categories(
    month: Optional[int] = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get ML-based forecast for all expense categories.
    """
    predictor = get_predictor()
    target_month = month or datetime.now().month
    
    predictions = predictor.predict_all_categories(
        person_id=current_user.person_id,
        month=target_month
    )
    
    # Add category IDs from database
    db_categories = db.query(Category).filter(Category.type == "expense").all()
    db_cat_map = {c.name: c.id for c in db_categories}
    
    result = []
    ml_count = 0
    data_count = 0
    
    for pred in predictions:
        cat_name = pred["category"]
        if cat_name in db_cat_map:
            if pred.get("is_ml"):
                ml_count += 1
            if pred.get("has_data"):
                data_count += 1
            
            result.append({
                "category_id": db_cat_map[cat_name],
                "category": cat_name,
                "estimated_amount": pred["estimated_amount"],
                "has_data": pred.get("has_data", False),
                "confidence": pred.get("confidence", "brak"),
                "method": pred.get("method", "no_data"),
                "is_ml": pred.get("is_ml", False)
            })
    
    total = sum(p["estimated_amount"] for p in result)
    
    return {
        "user_id": current_user.person_id,
        "month": target_month,
        "month_name": _get_month_name(target_month),
        "predictions": result,
        "total_estimated": round(total, 2),
        "categories_with_data": data_count,
        "categories_with_ml": ml_count,
        "total_categories": len(result)
    }


@router.get("/yearly/{category_id}")
async def get_yearly_forecast(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get 12-month ML forecast for a category."""
    predictor = get_predictor()
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategoria nie znaleziona")
    
    monthly_predictions = []
    yearly_total = 0
    
    for month in range(1, 13):
        pred = predictor.predict_for_month(
            person_id=current_user.person_id,
            category_name=category.name,
            month=month
        )
        
        monthly_predictions.append({
            "month": month,
            "month_name": _get_month_name(month),
            "estimated_amount": pred["estimated_amount"],
            "has_data": pred.get("has_data", False),
            "confidence": pred.get("confidence", "brak"),
            "is_ml": pred.get("is_ml", False)
        })
        yearly_total += pred["estimated_amount"]
    
    stats = predictor.get_category_stats(current_user.person_id, category.name)
    
    return {
        "user_id": current_user.person_id,
        "category_id": category_id,
        "category": category.name,
        "has_data": stats["has_data"],
        "transaction_count": stats["count"],
        "monthly_predictions": monthly_predictions,
        "yearly_total": round(yearly_total, 2),
        "monthly_average": round(yearly_total / 12, 2)
    }


@router.get("/summary")
async def get_user_spending_summary(
    current_user: User = Depends(get_current_user)
):
    """
    Get spending summary with ML model status.
    Shows whether user has enough data for ML predictions.
    """
    predictor = get_predictor()
    summary = predictor.get_user_summary(current_user.person_id)
    
    return {
        "user_id": current_user.person_id,
        **summary
    }


@router.post("/retrain")
async def retrain_user_model(
    current_user: User = Depends(get_current_user)
):
    """
    Force retrain ML model for current user.
    Useful after adding many new transactions.
    """
    predictor = get_predictor()
    result = predictor.retrain_user_model(current_user.person_id)
    
    return {
        "user_id": current_user.person_id,
        **result
    }


@router.get("/category-stats/{category_id}")
async def get_category_statistics(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed statistics for a category."""
    predictor = get_predictor()
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategoria nie znaleziona")
    
    stats = predictor.get_category_stats(current_user.person_id, category.name)
    
    return {
        "user_id": current_user.person_id,
        "category_id": category_id,
        "category": category.name,
        **stats
    }


@router.get("/categories")
async def get_available_prediction_categories(
    db: Session = Depends(get_db)
):
    """Get list of expense categories available for prediction."""
    categories = db.query(Category).filter(Category.type == "expense").all()
    
    return {
        "categories": [{"id": c.id, "name": c.name} for c in categories]
    }


def _get_month_name(month: int) -> str:
    """Get Polish month name."""
    months = [
        "Styczeń", "Luty", "Marzec", "Kwiecień",
        "Maj", "Czerwiec", "Lipiec", "Sierpień",
        "Wrzesień", "Październik", "Listopad", "Grudzień"
    ]
    return months[month - 1] if 1 <= month <= 12 else ""