"""
schemas.py
- Pydantic models used for request validation and response serialization.
- Keep these schemas aligned with your ORM models and frontend expectations.
- Use `orm_mode = True` on response models to allow returning ORM objects directly.
"""

from pydantic import BaseModel
from datetime import date
from typing import Optional
from typing import Literal

class UserCreate(BaseModel):
    """
    Input schema used for registration and login requests.
    - Fields should match what frontend sends (e.g. username + password).
    """
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    class Config:
        orm_mode = True

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
    title: Optional[str] = None
    amount: float
    category_id: Optional[int] = None
    date: date

class TransactionCreate(TransactionBase):
    """
    Client uses 'income' | 'expense' values for type.
    """
    type: Literal["income", "expense"] = "expense"

class TransactionOut(TransactionBase):
    id: int
    person_id: int
    type: Literal["income", "expense"]
    class Config:
        orm_mode = True

class CategoryOut(BaseModel):
    id: int
    name: str
    type: str
    class Config:
        orm_mode = True
