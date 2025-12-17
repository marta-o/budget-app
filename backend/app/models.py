"""
SQLAlchemy ORM models representing database tables.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship

from .database import Base

class Person(Base):
    """User profile information (linked to login credentials and transactions)."""
    __tablename__ = "people"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)

    logins = relationship("User", back_populates="person")
    transactions = relationship("Transaction", back_populates="person")

class User(Base):
    """Login credentials linked to a Person."""
    __tablename__ = "logins"
    
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id"))
    username = Column(String, unique=True, index=True)
    password = Column(String)  # bcrypt hashed

    person = relationship("Person", back_populates="logins")

class Category(Base):
    """Transaction category (expense or income type)."""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    type = Column(String, default="expense")  # 'expense' or 'income'

    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    """Financial transaction record (expense or income)."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    title = Column(String)
    amount = Column(Float)
    date = Column(Date)

    person = relationship("Person", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")