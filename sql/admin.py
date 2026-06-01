"""
routers/admin.py — Quản lý users, xem toàn bộ logs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sql.database import get_db
from sql.models import User, RecommendationLog, Interaction, EvaluationResult
from sql.core.permissions import require_admin, require_staff
from sql.core.auth import hash_password

from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ── Users CRUD ───────────────────────────────────────────────
@router.get("/users")
def list_users(
    role: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, le=100),
    db:   Session = Depends(get_db),
    _:    User = Depends(require_admin)
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    total = q.count()
    users = q.offset((page-1)*size).limit(size).all()
    return {
        "total": total,
        "items": [{
            "id": u.id, "email": u.email, "full_name": u.full_name,
            "role": u.role, "is_active": u.is_active,
            "created_at": u.created_at
        } for u in users]
    }

class UpdateUserRequest(BaseModel):
    role:      Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None

@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    body: UpdateUserRequest,
    db:   Session = Depends(get_db),
    _:    User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User không tồn tại")
    if body.role:      user.role      = body.role
    if body.is_active is not None: user.is_active = body.is_active
    if body.full_name: user.full_name = body.full_name
    db.commit()
    return {"message": "Cập nhật thành công"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if user_id == current_user.id:
        raise HTTPException(400, "Không thể xóa chính mình")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User không tồn tại")
    db.delete(user)
    db.commit()
    return {"message": "Đã xóa user"}

class CreateUserRequest(BaseModel):
    email:     str
    password:  str
    full_name: str
    role:      str = "customer"

@router.post("/users")
def create_user(
    body: CreateUserRequest,
    db:   Session = Depends(get_db),
    _:    User = Depends(require_admin)
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email đã tồn tại")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role
    )
    db.add(user)
    db.commit()
    return {"message": "Tạo user thành công", "id": user.id}


# ── Stats ────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _:  User = Depends(require_admin)
):
    return {
        "total_users":       db.query(User).count(),
        "total_customers":   db.query(User).filter(User.role=="customer").count(),
        "total_staff":       db.query(User).filter(User.role=="staff").count(),
        "total_rec_logs":    db.query(RecommendationLog).count(),
        "total_interactions":db.query(Interaction).count(),
    }
