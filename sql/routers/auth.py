"""routers/auth.py

Auth endpoints cho frontend.
Frontend gọi:
- POST /api/auth/login
- GET  /api/auth/me
- POST /api/auth/logout

Router này dùng JWT (core/auth.py) + SQLAlchemy (sql/database.py + sql/models.py).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os

from sql.core.auth import verify_password, create_access_token

# ensure bcrypt verifies password_hash correctly (wrapper depends on sql.core.auth)


from sql.database import get_db
from sql.models import User, Session as SessionModel

from sql.core.permissions import get_current_user


router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive")

    try:
        ok = verify_password(body.password, user.password_hash)
    except Exception:
        # Nếu verify_password lỗi vì schema/định dạng password_hash không khớp,
        # vẫn không chặn demo bằng cách trả 401 rõ ràng.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bcrypt verify failed")

    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bcrypt verify failed")





    access_token = create_access_token(user.id, user.role)

    # Lưu token hash để logout/revoke.
    # Tránh 500 do expires_at NOT NULL.
    import datetime
    try:
        session_row = SessionModel(
            user_id=user.id,
            token_hash=access_token,
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7),
        )
        db.add(session_row)
        db.commit()
    except Exception as e:
        # Nếu DB bảng sessions chưa khớp schema, vẫn cho login để web demo chạy.
        db.rollback()
        # Không raise để tránh 500
        print("[auth/login] session insert failed:", type(e).__name__, str(e)[:200])


    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.get("/me")
def me(current_user: Optional[User] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chưa đăng nhập")

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    # revoke đơn giản: mark is_revoked nếu tồn tại
    row = db.query(SessionModel).filter(SessionModel.token_hash == token).first()
    if row:
        row.is_revoked = True
        db.commit()

    return {"message": "ok"}


