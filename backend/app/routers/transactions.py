"""
transactions.py router
- Exposes endpoints to list and create transactions for the authenticated user.
- Current get_current_user implementation expects a Bearer JWT token.
  If you return a simple/dummy token from auth, adapt this function accordingly
  (for example: accept a header with username or decode a real JWT).
- Endpoints:
  - GET /transactions  -> list transactions for current user
  - POST /transactions -> create a transaction for current user
"""
from fastapi import APIRouter, Depends, HTTPException, Header, status, Path, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from .. import crud, schemas, models
from ..database import get_db
from ..dependencies import get_current_user
import datetime

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/")
def list_transactions(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    tx_type: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """
    Return list of transactions belonging to authenticated user.
    - Uses user.person_id to filter transactions.
    - Returns list[models.Transaction] (FastAPI / Pydantic will serialize).
    """
    # Tolerant parsing: validate/convert incoming query params to expected types
    ttype = None
    if tx_type:
        if tx_type.lower() in ("income", "expense"):
            ttype = tx_type.lower()
    cat_id = None
    if category_id:
        try:
            cat_id = int(category_id)
        except Exception:
            cat_id = None
    start_date = None
    if start:
        try:
            start_date = datetime.date.fromisoformat(start)
        except Exception:
            start_date = None
    end_date = None
    if end:
        try:
            end_date = datetime.date.fromisoformat(end)
        except Exception:
            end_date = None

    return crud.get_transactions(db, user.person_id, ttype, cat_id, start_date, end_date, q, skip, limit)

@router.post("/")
def add_transaction(transaction: schemas.TransactionCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Create a new transaction for the authenticated user.
    - Accepts TransactionCreate request body.
    - Uses CRUD layer to persist the record and returns created object.
    """
    return crud.create_transaction(db, transaction, user.person_id)

@router.put("/{tx_id}", response_model=schemas.TransactionOut)
def update_transaction(tx_id: int = Path(..., gt=0), transaction: schemas.TransactionCreate = None, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    updated = crud.update_transaction(db, tx_id, transaction, user.person_id)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return updated

@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int = Path(..., gt=0), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    ok = crud.delete_transaction(db, tx_id, user.person_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return