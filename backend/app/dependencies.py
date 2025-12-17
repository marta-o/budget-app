"""
FastAPI dependencies for authentication and authorization.
"""
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Optional
from jose import jwt, JWTError

from .database import get_db
from . import crud, models, config

SECRET_KEY = config.settings.SECRET_KEY
ALGORITHM = config.settings.ALGORITHM

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> models.User:
    """
    Extract and validate JWT token from Authorization header.
    Returns the authenticated user or raises 401 if invalid.
    """
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user