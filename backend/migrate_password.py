import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import User
import bcrypt

def migrate():
    db = SessionLocal()
    users = db.query(User).all()
    count = 0
    for user in users:
        if user.password and not user.password.startswith("$2"):
            print(f"Hashing password for user: {user.username}")
            pwd_bytes = user.password.encode('utf-8')
            hashed = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt())
            user.password = hashed.decode('utf-8')
            count += 1
    
    db.commit()
    db.close()
    print(f"Zmigrowano {count} haseł")

if __name__ == "__main__":
    migrate()