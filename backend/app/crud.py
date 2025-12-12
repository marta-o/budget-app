"""
crud.py
- Contains database access helper functions used by routers.
- Keeps DB logic isolated from HTTP layer.
- Note: verify_password currently compares plaintext (dev-only). See comments below.
"""

from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas
from passlib.context import CryptContext
from datetime import date
from typing import Optional, List, Dict

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify bcrypt hashed password"""
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_user_by_username(db: Session, username: str):
    """
    Query the users (logins) table and return the first user matching username.
    - Returns SQLAlchemy model instance or None.
    """
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    """Create person + hashed login"""
    db_person = models.Person(
        first_name=user.first_name,
        last_name=user.last_name,
        age=user.age,
        gender=user.gender,
    )
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    
    hashed_pw = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        password=hashed_pw,
        person_id=db_person.id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_transaction(db: Session, transaction: schemas.TransactionCreate, person_id: int):
    """
    Create a new transaction for the given person_id.
    - Returns the created models.Transaction instance.
    """
    tx_date = transaction.date if getattr(transaction, "date", None) else date.today()
    if isinstance(tx_date, str):
        try:
            tx_date = date.fromisoformat(tx_date)
        except Exception:
            tx_date = date.today()
    db_tx = models.Transaction(
        title=transaction.title,
        amount=transaction.amount,
        person_id=person_id,
        date=tx_date,
        type=transaction.type,
        category_id=transaction.category_id
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

def get_transactions(db: Session, person_id: int, tx_type: Optional[str] = None, category_id: Optional[int] = None,
                     start: Optional[date] = None, end: Optional[date] = None, q: Optional[str] = None,
                     skip: int = 0, limit: int = 100):
    """
    Retrieve transactions for a given person_id with optional filters.
    - tx_type: filter by 'income' or 'expense'
    - category_id: filter by specific category
    - start, end: date range filter
    - q: search query in title or category name
    - skip, limit: pagination
    - Returns list of dicts with transaction and category name.
    """
    query = (
        db.query(models.Transaction, models.Category)
        .outerjoin(models.Category, models.Transaction.category_id == models.Category.id)
        .filter(models.Transaction.person_id == person_id)
    )

    if tx_type:
        query = query.filter(models.Transaction.type == tx_type)
    if category_id is not None:
        query = query.filter(models.Transaction.category_id == category_id)
    if start:
        query = query.filter(models.Transaction.date >= start)
    if end:
        query = query.filter(models.Transaction.date <= end)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(models.Transaction.title.ilike(like), models.Category.name.ilike(like)))

    rows = query.order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

    out: List[Dict] = []
    for tx, cat in rows:
        out.append({
            "id": tx.id,
            "title": tx.title,
            "amount": tx.amount,
            "type": tx.type,
            "category_id": tx.category_id,
            "category": cat.name if cat is not None else None,
            "date": tx.date.isoformat() if hasattr(tx.date, "isoformat") else str(tx.date),
        })
    return out

def update_transaction(db: Session, tx_id: int, transaction: schemas.TransactionCreate, person_id: int):
    """
    Update an existing transaction by ID for the given person_id.
    - Returns updated transaction or None if not found."""
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.person_id == person_id).first()
    if not db_tx:
        return None
    if getattr(transaction, "title", None) is not None:
        db_tx.title = transaction.title
    if getattr(transaction, "amount", None) is not None:
        db_tx.amount = transaction.amount
    if getattr(transaction, "category_id", None) is not None:
        db_tx.category_id = transaction.category_id
    if getattr(transaction, "date", None):
        tx_date = transaction.date
        if isinstance(tx_date, str):
            try:
                tx_date = date.fromisoformat(tx_date)
            except Exception:
                tx_date = db_tx.date
        db_tx.date = tx_date
    if getattr(transaction, "type", None) is not None:
        db_tx.type = transaction.type
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

def delete_transaction(db: Session, tx_id: int, person_id: int):
    """
    Delete a transaction by ID for the given person_id.
    - Returns True if deleted, False if not found.
    """
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.person_id == person_id).first()
    if not db_tx:
        return False
    db.delete(db_tx)
    db.commit()
    return True

def get_categories(db: Session, type_filter: Optional[str] = None):
    """
    Return all categories, optionally filtered by type.
    - type_filter can be 'expense' or 'income' to filter categories.
    - Returns a list of models.Category objects ordered by name.
    """
    q = db.query(models.Category)
    if type_filter:
        q = q.filter(models.Category.type == type_filter)
    return q.order_by(models.Category.name).all()