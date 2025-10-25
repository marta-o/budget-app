"""
auth.py router
- Provides /auth endpoints for registration and login.
- Uses crud functions to access DB.
- Returns a simple access_token (dummy-token) currently; replace with real JWT if needed.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta
from .. import schemas, crud, models
from ..database import get_db
from ..config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    - Checks if username already exists.
    - Calls crud.create_user to persist user in DB.
    - Returns created user object (as-is).
    """
    db_user = crud.get_user_by_username(db, user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db, user)

@router.post("/login")
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Login endpoint.
    - Expects JSON body matching schemas.UserCreate (username, password).
    - Verifies username exists and password matches via crud.verify_password.
    - On success returns a JSON containing access_token.
    - On failure raises HTTPException(401).
    """
    db_user = crud.get_user_by_username(db, user.username)
    if not db_user or not crud.verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": "dummy-token"}
