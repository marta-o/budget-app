"""
Transactions router - handles all transaction-related API endpoints.
Provides CRUD operations for user's financial records.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from .. import crud, schemas, models
from ..database import get_db
from ..dependencies import get_current_user
from ..predictor import UserMLPredictor

router = APIRouter(prefix="/transactions", tags=["transactions"])

_ml_predictor: Optional[UserMLPredictor] = None

def get_ml_predictor() -> UserMLPredictor:
    global _ml_predictor
    if _ml_predictor is None:
        _ml_predictor = UserMLPredictor()
    return _ml_predictor

def parse_date(value: Optional[str]) -> Optional[date]:
    """Safely parse ISO date string, returns None if invalid."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def parse_int(value: Optional[str]) -> Optional[int]:
    """Safely parse integer string, returns None if invalid."""
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None

@router.get("/")
def list_transactions(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    q: Optional[str] = Query(None, description="Search in title or category name"),
):
    """Get all transactions for the authenticated user with optional filters."""
    return crud.get_transactions(
        db, user.person_id,
        parse_int(category_id),
        parse_date(start),
        parse_date(end),
        q
    )

@router.post("/", response_model=schemas.TransactionOut, status_code=201)
def add_transaction(
    transaction: schemas.TransactionCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction for the authenticated user."""
    new_tx = crud.create_transaction(db, transaction, user.person_id)
    
    # Auto-retrain ML model after adding transaction
    try:
        predictor = get_ml_predictor()
        predictor.retrain_user_model(user.person_id)
    except Exception as e:
        print(f"Auto-retrain failed for user {user.person_id}: {e}")
    
    return new_tx

@router.put("/{tx_id}", response_model=schemas.TransactionOut)
def update_transaction(
    tx_id: int = Path(..., gt=0),
    transaction: schemas.TransactionCreate = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing transaction. Returns 404 if not found or not owned by user."""
    updated = crud.update_transaction(db, tx_id, transaction, user.person_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return updated

@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int = Path(..., gt=0),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction. Returns 404 if not found or not owned by user."""
    if not crud.delete_transaction(db, tx_id, user.person_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")