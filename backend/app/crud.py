"""
Database CRUD operations for users, transactions, and categories.
Keeps database logic separated from the HTTP/router layer.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date
from typing import Optional, List, Dict
import bcrypt

from . import models, schemas


# Password Hashing

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt with auto-generated salt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash. Returns False on any error."""
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


# User Operations

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    """Find a user by username. Returns None if not found."""
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Create a new person record and associated login credentials."""
    db_person = models.Person(
        first_name=user.first_name,
        last_name=user.last_name,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
    )
    db.add(db_person)
    db.commit()
    db.refresh(db_person)

    db_user = models.User(
        username=user.username,
        password=get_password_hash(user.password),
        person_id=db_person.id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Transaction Operations

def create_transaction(db: Session, transaction: schemas.TransactionCreate, person_id: int) -> models.Transaction:
    """Create a new transaction for the specified person."""
    tx_date = transaction.date or date.today()
    if isinstance(tx_date, str):
        try:
            tx_date = date.fromisoformat(tx_date)
        except ValueError:
            tx_date = date.today()

    db_tx = models.Transaction(
        title=transaction.title,
        amount=transaction.amount,
        person_id=person_id,
        date=tx_date,
        category_id=transaction.category_id
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

def get_transactions(
    db: Session,
    person_id: int,
    category_id: Optional[int] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    q: Optional[str] = None,
) -> List[Dict]:
    """Retrieve all transactions with optional filtering and search."""
    query = (
        db.query(models.Transaction, models.Category)
        .outerjoin(models.Category, models.Transaction.category_id == models.Category.id)
        .filter(models.Transaction.person_id == person_id)
    )

    if category_id is not None:
        query = query.filter(models.Transaction.category_id == category_id)
    if start:
        query = query.filter(models.Transaction.date >= start)
    if end:
        query = query.filter(models.Transaction.date <= end)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(models.Transaction.title.ilike(like), models.Category.name.ilike(like)))

    rows = query.order_by(models.Transaction.date.desc()).all()

    return [
        {
            "id": tx.id,
            "title": tx.title,
            "amount": tx.amount,
            "category_id": tx.category_id,
            "category": cat.name if cat else None,
            "date": tx.date.isoformat() if hasattr(tx.date, "isoformat") else str(tx.date),
        }
        for tx, cat in rows
    ]

def update_transaction(
    db: Session,
    tx_id: int,
    transaction: schemas.TransactionCreate,
    person_id: int
) -> Optional[models.Transaction]:
    """Update a transaction. Returns None if not found or not owned by user."""
    db_tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.person_id == person_id
    ).first()
    
    if not db_tx:
        return None

    if transaction.title is not None:
        db_tx.title = transaction.title
    if transaction.amount is not None:
        db_tx.amount = transaction.amount
    if transaction.category_id is not None:
        db_tx.category_id = transaction.category_id
    if transaction.date:
        tx_date = transaction.date
        if isinstance(tx_date, str):
            try:
                tx_date = date.fromisoformat(tx_date)
            except ValueError:
                tx_date = db_tx.date
        db_tx.date = tx_date

    db.commit()
    db.refresh(db_tx)
    return db_tx

def delete_transaction(db: Session, tx_id: int, person_id: int) -> bool:
    """Delete a transaction. Returns True if deleted, False if not found."""
    db_tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.person_id == person_id
    ).first()
    
    if not db_tx:
        return False
    
    db.delete(db_tx)
    db.commit()
    return True


# Category Operations

def get_categories(db: Session, type_filter: Optional[str] = None) -> List[models.Category]:
    """Get all categories, optionally filtered by type (expense/income)."""
    query = db.query(models.Category)
    if type_filter:
        query = query.filter(models.Category.type == type_filter)
    return query.order_by(models.Category.name).all()