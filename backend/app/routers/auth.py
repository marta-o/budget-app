"""
Auth router - handles user registration, login, and authentication.
Uses JWT tokens for session management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone
from .. import schemas, crud, models
from ..database import get_db
from ..config import settings
from ..dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """Generate a JWT token with the username as subject and expiration time."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user. Returns 400 if username already exists."""
    if crud.get_user_by_username(db, user.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    return crud.create_user(db, user)

@router.post("/login")
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token. Returns 401 if credentials are invalid."""
    db_user = crud.get_user_by_username(db, credentials.username)
    if not db_user or not crud.verify_password(credentials.password, db_user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(db_user.username)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    """Return currently authenticated user's information."""
    return user