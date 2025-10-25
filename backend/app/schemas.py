"""
schemas.py
- Pydantic models used for request validation and response serialization.
- Keep these schemas aligned with your ORM models and frontend expectations.
- Use `orm_mode = True` on response models to allow returning ORM objects directly.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    """
    Input schema used for registration and login requests.
    - Fields should match what frontend sends (e.g. username + password).
    """
    username: str
    password: str

class User(BaseModel):
    """
    Response schema for user data returned from API (safe subset).
    - orm_mode enables returning SQLAlchemy model instances directly.
    """
    id: int
    username: str
    class Config:
        orm_mode = True

class TransactionBase(BaseModel):
    """
    Shared fields for creating / returning transactions.
    """
    title: str
    amount: float

class TransactionCreate(TransactionBase):
    """
    Request body for creating a new transaction.
    - date is set server-side if not provided.
    """
    date: Optional[datetime] = None
    type: Optional[str] = "expense"

class Transaction(TransactionBase):
    """
    Response schema for transaction objects returned by the API.
    """
    id: int
    person_id: int
    date: Optional[datetime]
    type: str

    class Config:
        orm_mode = True


