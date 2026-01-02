"""
FastAPI application entry point.
Configures CORS middleware and registers all API routers.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, transactions, categories, predictions

app = FastAPI(title="Budget App API", version="1.0.0")

# CORS configuration for frontend development servers
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
app.include_router(categories.router)
app.include_router(predictions.router)


@app.get("/")
def root():
    return {"message": "Budget API running!"}
