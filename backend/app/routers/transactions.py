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

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Optional
from .. import crud, schemas, models
from ..database import get_db
from ..config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

router = APIRouter(prefix="/transactions", tags=["transactions"])

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    token = authorization.replace("Bearer ", "")
    # if you return dummy token during dev, handle it here (e.g. token == "dummy-token")
    if token == "dummy-token":
        # for dummy: assume username passed in a custom header or use a default test user
        user = crud.get_user_by_username(db, "anowak")
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Dummy user not found")
        return user
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = crud.get_user_by_username(db, username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

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
