from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import AdminUser

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=True)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    creds_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        email = payload.get("sub")
        if not email:
            raise creds_error
    except JWTError as e:
        raise creds_error from e

    user = db.query(AdminUser).filter(AdminUser.email == email).first()
    if not user:
        raise creds_error
    return user


def seed_admin_if_missing(db: Session) -> None:
    existing = db.query(AdminUser).first()
    if existing:
        return
    admin = AdminUser(
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
    )
    db.add(admin)
    db.commit()
