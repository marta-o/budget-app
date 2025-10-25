"""
main.py
- FastAPI app factory and global configuration.
- Registers CORS and includes routers so endpoints like /auth and /transactions are available.
- Ensure allow_origins contains your frontend origin (e.g. http://127.0.0.1:5173 or http://127.0.0.1:3000).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, transactions
from .config import settings

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)

@app.get("/")
def root():
    return {"message": "Budget API running!"}
