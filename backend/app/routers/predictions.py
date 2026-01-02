"""
Predictions router - API endpoints for ML-based spending forecasts.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..models import User, Category, Transaction
from ..dependencies import get_current_user
from ..predictor import UserMLPredictor

router = APIRouter(prefix="/predictions", tags=["Predictions"])

_predictor: Optional[UserMLPredictor] = None


def get_predictor() -> UserMLPredictor:
    global _predictor
    if _predictor is None:
        _predictor = UserMLPredictor()
    return _predictor


@router.get("/forecast/{category_id}")
async def get_forecast_for_category(
    category_id: int,
    months: int = Query(default=12, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ML-based spending forecast for a specific category."""
    predictor = get_predictor()
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category.type != "expense":
        raise HTTPException(status_code=400, detail="Predictions available only for expenses")
    
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
        "trend_direction": stats["trend_direction"],
        "forecast": forecast
    }


@router.get("/forecast-all")
async def get_forecast_all_categories(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2030),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ML-based forecast for all expense categories for specific month and year."""
    predictor = get_predictor()
    
    predictions = predictor.predict_all_categories(
        person_id=current_user.person_id,
        month=month,
        year=year
    )
    
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
            
            # Get trend info for this category
            cat_stats = predictor.get_category_stats(current_user.person_id, cat_name)
            
            result.append({
                "category_id": db_cat_map[cat_name],
                "category": cat_name,
                "estimated_amount": pred["estimated_amount"],
                "has_data": pred.get("has_data", False),
                "confidence": pred.get("confidence", "none"),
                "method": pred.get("method", "no_data"),
                "is_ml": pred.get("is_ml", False),
                # Trend info
                "trend_direction": cat_stats.get("trend_direction", "none"),
                "trend_percent": cat_stats.get("trend"),  # percentage change
                "monthly_average": cat_stats.get("monthly_average", 0)
            })
    
    total = sum(p["estimated_amount"] for p in result)
    
    # Get actual spending for this month if it's current or past month
    now = datetime.now()
    is_current_or_past = (year < now.year) or (year == now.year and month <= now.month)
    
    actual_spending = {}
    if is_current_or_past:
        # Query actual spending per category for this month
        actual_query = db.query(
            Category.id,
            func.sum(Transaction.amount).label("actual")
        ).join(
            Transaction, Transaction.category_id == Category.id
        ).filter(
            Transaction.person_id == current_user.person_id,
            Category.type == "expense",
            extract('month', Transaction.date) == month,
            extract('year', Transaction.date) == year
        ).group_by(Category.id).all()
        
        actual_spending = {row.id: float(row.actual) for row in actual_query}
    
    # Add actual spending to results
    for pred in result:
        pred["actual_amount"] = actual_spending.get(pred["category_id"])
    
    total_actual = sum(actual_spending.values()) if actual_spending else None
    
    return {
        "user_id": current_user.person_id,
        "month": month,
        "year": year,
        "is_current_month": year == now.year and month == now.month,
        "is_past_month": (year < now.year) or (year == now.year and month < now.month),
        "predictions": result,
        "total_estimated": round(total, 2),
        "total_actual": round(total_actual, 2) if total_actual else None,
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
        raise HTTPException(status_code=404, detail="Category not found")
    
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
            "estimated_amount": pred["estimated_amount"],
            "has_data": pred.get("has_data", False),
            "confidence": pred.get("confidence", "none"),
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
    """Get spending summary with ML model status."""
    predictor = get_predictor()
    summary = predictor.get_user_summary(current_user.person_id)
    return {"user_id": current_user.person_id, **summary}


@router.post("/retrain")
async def retrain_user_model(
    current_user: User = Depends(get_current_user)
):
    """Force retrain ML model for current user."""
    predictor = get_predictor()
    result = predictor.retrain_user_model(current_user.person_id)
    return {"user_id": current_user.person_id, **result}


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
        raise HTTPException(status_code=404, detail="Category not found")
    
    stats = predictor.get_category_stats(current_user.person_id, category.name)
    return {"user_id": current_user.person_id, "category_id": category_id, 
            "category": category.name, **stats}


@router.get("/categories")
async def get_available_prediction_categories(db: Session = Depends(get_db)):
    """Get list of expense categories available for prediction."""
    categories = db.query(Category).filter(Category.type == "expense").all()
    return {"categories": [{"id": c.id, "name": c.name} for c in categories]}


@router.get("/feature-importance")
async def get_feature_importance(current_user: User = Depends(get_current_user)):
    """Get feature importance from the ML model."""
    predictor = get_predictor()
    importance = predictor.get_feature_importance(current_user.person_id)
    
    if importance is None:
        # Model not trained yet - return empty instead of error
        return {"user_id": current_user.person_id, "importance": {}, "trained": False}
    
    return {"user_id": current_user.person_id, **importance, "trained": True}
