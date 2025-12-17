"""
Pydantic schemas for request validation and response serialization.
"""
from pydantic import BaseModel
from datetime import date
from typing import Optional


# User Schemas

class UserLogin(BaseModel):
    """Login request payload."""
    username: str
    password: str

class UserCreate(BaseModel):
    """Registration request payload."""
    username: str
    password: str
    first_name: str
    last_name: str
    date_of_birth: date | None = None
    gender: str | None = None

class UserOut(BaseModel):
    """User data returned in API responses."""
    id: int
    username: str
    class Config:
        from_attributes = True


# Transaction Schemas

class TransactionBase(BaseModel):
    """Common transaction fields."""
    title: Optional[str] = None
    amount: float
    category_id: Optional[int] = None
    date: date

class TransactionCreate(TransactionBase):
    """Transaction creation/update payload."""
    pass

class TransactionOut(TransactionBase):
    """Transaction data returned in API responses."""
    id: int
    person_id: int
    class Config:
        from_attributes = True


# Category Schemas

class CategoryOut(BaseModel):
    """Category data returned in API responses."""
    id: int
    name: str
    type: str
    class Config:
        from_attributes = True
