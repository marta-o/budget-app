"""
crud.py
- Contains database access helper functions used by routers.
- Keeps DB logic isolated from HTTP layer.
- Note: verify_password currently compares plaintext (dev-only). See comments below.
"""

from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext
from datetime import datetime

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
    db_type = "wydatek" if transaction.type == "expense" else "przychód"
    db_tx = models.Transaction(
        title=getattr(transaction, "title", transaction.description if hasattr(transaction, "description") else None),
        amount=transaction.amount,
        person_id=person_id,
        date=transaction.date or datetime.utcnow(),
        type=db_type,
        category_id=getattr(transaction, "category_id", None)
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    db_tx.type = "expense" if db_tx.type == "wydatek" else "income"
    return db_tx

def get_transactions(db: Session, person_id: int):
    """
    Return all transaction rows for the given person_id.
    - Returns a list of models.Transaction objects.
    """
    rows = db.query(models.Transaction).filter(models.Transaction.person_id == person_id).order_by(models.Transaction.date.desc()).all()
    for r in rows:
        if r.type == "wydatek":
            r.type = "expense"
        elif r.type == "przychód":
            r.type = "income"
    return rows

def update_transaction(db: Session, tx_id: int, transaction: schemas.TransactionCreate, person_id: int):
    """
    Update an existing transaction record.
    - Only allows updating transactions owned by person_id.
    - Returns updated models.Transaction or None if not found.
    """
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.person_id == person_id).first()
    if not db_tx:
        return None
    db_tx.title = getattr(transaction, "title", transaction.description if hasattr(transaction, "description") else db_tx.title)
    db_tx.amount = transaction.amount
    db_tx.category_id = getattr(transaction, "category_id", db_tx.category_id)
    db_tx.date = transaction.date or db_tx.date
    db_tx.type = "wydatek" if transaction.type == "expense" else "przychód"
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    # map for response
    db_tx.type = "expense" if db_tx.type == "wydatek" else "income"
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

def get_categories(db: Session, person_id: int):
    """
    Get all categories for a specific user.
    """
    return db.query(models.Category).filter(models.Category.person_id == person_id).order_by(models.Category.name).all()