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
    """
    Generate bcrypt hash for given plaintext password.
    - Used when creating new users (recommended for production).
    """
    return pwd_context.hash(password)

def verify_password(plain_password, stored_password):
    """
    Development helper: compare plaintext password provided by client with
    the value stored in DB (stored_password).
    - This does NOT perform secure hash verification.
    - Accepts stored_password as str or bytes and normalizes whitespace.
    - Returns True only if normalized stored_password equals plain_password.
    - Use hashed verification (passlib.verify) for production.
    """
    if stored_password is None:
        return False
    try:
        if isinstance(stored_password, (bytes, bytearray)):
            sp = stored_password.decode("utf-8", errors="ignore")
        else:
            sp = str(stored_password)
    except Exception:
        sp = str(stored_password)
    return plain_password == sp.strip()

def get_user_by_username(db: Session, username: str):
    """
    Query the users (logins) table and return the first user matching username.
    - Returns SQLAlchemy model instance or None.
    """
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    """
    Create a new user record in the DB.
    - Hashes password using get_password_hash before saving (currently creates hashed value).
    - Returns the created models.User instance.
    """
    hashed_pw = get_password_hash(user.password)
    db_user = models.User(username=user.username, password=hashed_pw)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_transaction(db: Session, transaction: schemas.TransactionCreate, person_id: int):
    """
    Create a new Transaction/Expense record associated with a person.
    - Automatically sets date to current UTC time and type to 'expense'.
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
    Return transaction rows for person_id applying optional filters.
    Supported filters: tx_type ('income'|'expense'), category_id, start (date), end (date), q (text search).
    Supports pagination via skip/limit.
    Returns list[dict] serializable by Pydantic.
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
    Update an existing transaction record.
    - Only allows updating transactions owned by person_id.
    - Returns updated models.Transaction or None if not found.
    """
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