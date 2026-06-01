"""
routers/products.py — CRUD sản phẩm
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sql.database import get_db
from sql.models import Product
from sql.core.permissions import get_current_user, require_staff

router = APIRouter()


@router.get("/")
def list_products(
    category: str = Query(None, description="Tops | Bottoms | Shoes"),
    search:   str = Query(None),
    page:     int = Query(1, ge=1),
    size:     int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    q = db.query(Product)
    if category:
        q = q.filter(Product.main_cat == category)
    if search:
        q = q.filter(or_(
            Product.title.ilike(f"%{search}%"),
            Product.brand.ilike(f"%{search}%")
        ))
    # MSSQL OFFSET/FETCH bắt buộc có ORDER BY
    q = q.order_by(Product.id)
    total = q.count()
    items = q.offset((page-1)*size).limit(size).all()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [_product_dict(p) for p in items]
    }


@router.get("/{asin}")
def get_product(asin: str, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.asin == asin).first()
    if not p:
        from fastapi import HTTPException
        raise HTTPException(404, "Sản phẩm không tìm thấy")
    return _product_dict(p)


@router.get("/by-category/{category}")
def get_by_category(
    category: str,
    limit: int = Query(50, le=200),
    has_features: bool = Query(True, description="Chỉ lấy sản phẩm có features"),
    db: Session = Depends(get_db)
):
    q = db.query(Product).filter(Product.main_cat == category)
    if has_features:
        q = q.filter(Product.has_vgg == True)
    items = q.limit(limit).all()
    return [_product_dict(p) for p in items]


def _product_dict(p: Product):
    return {
        "asin":     p.asin,
        "title":    p.title,
        "brand":    p.brand,
        "price":    p.price,
        "img_url":  p.img_url,
        "main_cat": p.main_cat,
        "has_vgg":  p.has_vgg,
        "has_clip": p.has_clip,
    }
