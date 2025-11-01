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

from fastapi import APIRouter, Depends, HTTPException, Header, status, Path
from sqlalchemy.orm import Session
from .. import crud, schemas, models
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/")
def list_transactions(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Return list of transactions belonging to authenticated user.
    - Uses user.person_id to filter transactions.
    - Returns list[models.Transaction] (FastAPI / Pydantic will serialize).
    """
    return crud.get_transactions(db, user.person_id)

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