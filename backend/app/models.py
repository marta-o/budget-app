"""
models.py
- SQLAlchemy ORM model definitions for the application's database tables.
- Each class maps to a DB table and defines columns + relationships used by CRUD and routers.
- Keep attributes and column names aligned with the actual DB schema (if DB uses 'password'
  column for logins, keep Column("password", ...) here).
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from .database import Base

class Person(Base):
    """
    Represents a person (owner of transactions, categories and possibly a login).
    Table name: people
    Columns:
      - id: PK
      - first_name, last_name, age, household_status: basic profile fields
    Relationships:
      - user: one-to-one to User (login) via person_id
      - transactions: one-to-many to Transaction
      - categories: one-to-many to Category
    """
    __tablename__ = "people"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    age = Column(Integer)
    household_status = Column(String)

    user = relationship("User", back_populates="person", uselist=False)
    transactions = relationship("Transaction", back_populates="person")

class User(Base):
    """
    Represents login credentials.
    Table name: logins
    Important: align column names with the real DB.
      - If DB column is 'password' (plaintext or hashed), map it here as Column("password", ...)
    Attributes:
      - id: PK
      - person_id: FK -> people.id
      - username: login name
      - password: stored password (could be plaintext or hashed depending on DB)
    """
    __tablename__ = "logins"
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id"))
    username = Column(String, unique=True, index=True)
    password = Column(String)

    person = relationship("Person", back_populates="user")

class Category(Base):
    """
    User-specific category table.
    Table name: categories
    Columns:
      - id: PK
      - name: category name
      - person_id: FK -> people.id (category owner)
    Relationships:
      - transactions: transactions that reference this category
    """
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    type = Column(String, default="expense")

    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    """
    Transactions table (expenses / incomes).
    Table name: transactions
    Columns:
      - id: PK
      - person_id: FK -> people.id
      - category_id: FK -> categories.id (nullable)
      - title: short description
      - amount: numeric amount
      - date: datetime of transaction
      - type: 'expense' | 'income' (string)
    Relationships:
      - person: owner of the transaction
      - category: optional category
    """
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    title = Column(String)
    amount = Column(Float)
    date = Column(Date)
    type = Column(String, default="expense")

    person = relationship("Person", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")