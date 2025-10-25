"""
database.py
- Creates SQLAlchemy engine, session factory and Base for ORM models.
- Exposes get_db() generator to use as FastAPI dependency to get a DB session.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# BASE_DIR = Path(__file__).parent.parent.parent
# DATABASE_PATH = BASE_DIR / "MoneyManagement.db"

# SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    FastAPI dependency generator that yields a DB session.
    - Yields a session and ensures it is closed after use.
    - Use in endpoints: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()