"""core/permissions.py

Implement các dependency auth cho FastAPI.
Backend hiện tại đang import:
- from core.permissions import get_current_user
- from core.permissions import require_staff
- from core.permissions import require_admin

File này được tạo để project chạy được end-to-end.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import jwt

from sql.database import get_db
from sql.models import User
from sql.core.auth import decode_token


security = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if creds is None or not creds.credentials:
        return None

    payload = decode_token(creds.credentials)
    if not payload:
        return None

    try:
        user_id = int(payload.get("sub"))
    except Exception:
        return None

    # Demo: nếu DB schema không có is_active hoặc giá trị khác kỳ vọng, vẫn trả user để tránh vòng lặp login.
    try:
        user = db.query(User).filter(User.id == user_id).first()
    except Exception:
        user = None
    if user is None:
        return None
    # Nếu có cột is_active thì kiểm tra thêm
    if hasattr(user, "is_active"):
        try:
            if getattr(user, "is_active") is False:
                return None
        except Exception:
            pass
    return user


def require_staff(current_user: User = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chưa đăng nhập")
    if current_user.role not in ("staff", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cần quyền staff")
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chưa đăng nhập")
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cần quyền admin")
    return current_user

