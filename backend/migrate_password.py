import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def migrate():
    db = SessionLocal()
    users = db.query(User).all()
    count = 0
    for user in users:
        # Sprawdź czy hasło już jest hashowane (bcrypt zaczyna się od $2b$)
        if user.password and not user.password.startswith("$2"):
            print(f"Hashing password for user: {user.username}")
            user.password = pwd_context.hash(user.password)
            count += 1
    
    db.commit()
    db.close()
    print(f"✅ Zmigrowano {count} haseł")

if __name__ == "__main__":
    migrate()