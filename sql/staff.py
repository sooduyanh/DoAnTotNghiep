"""
routers/staff.py — Dashboard staff: logs, metrics, so sánh method
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sql.database import get_db
from sql.models import RecommendationLog, EvaluationResult, Product, Triplet
from sql.core.permissions import require_staff
from sql.models import User


router = APIRouter()

@router.get("/dashboard")
def staff_dashboard(
    db: Session = Depends(get_db),
    _:  User = Depends(require_staff)
):
    """Tổng quan cho staff"""
    method_counts = (
        db.query(RecommendationLog.method, func.count(RecommendationLog.id))
        .group_by(RecommendationLog.method)
        .all()
    )
    avg_latency = (
        db.query(func.avg(RecommendationLog.latency_ms))
        .scalar()
    )
    product_counts = (
        db.query(Product.main_cat, func.count(Product.id))
        .filter(Product.main_cat != None)
        .group_by(Product.main_cat)
        .all()
    )
    return {
        "method_usage":    {m: c for m, c in method_counts},
        "avg_latency_ms":  round(avg_latency or 0, 1),
        "product_counts":  {cat: cnt for cat, cnt in product_counts},
        "total_triplets":  db.query(Triplet).count(),
    }


@router.get("/evaluation-results")
def get_evaluation_results(
    version: str = Query("v2"),
    db: Session = Depends(get_db),
    _:  User = Depends(require_staff)
):
    rows = (
        db.query(EvaluationResult)
        .filter(EvaluationResult.version == version)
        .order_by(EvaluationResult.method, EvaluationResult.k)
        .all()
    )
    return [{
        "method":      r.method,
        "version":     r.version,
        "k":           r.k,
        "precision_k": round(r.precision_k * 100, 2),
        "recall_k":    round(r.recall_k    * 100, 2),
        "accuracy_k":  round(r.accuracy_k  * 100, 2),
    } for r in rows]


@router.get("/recommendation-logs")
def get_rec_logs(
    method: str = Query(None),
    page:   int = Query(1, ge=1),
    size:   int = Query(20, le=100),
    db: Session = Depends(get_db),
    _:  User = Depends(require_staff)
):
    q = db.query(RecommendationLog)
    if method:
        q = q.filter(RecommendationLog.method == method)
    total = q.count()
    logs  = q.order_by(RecommendationLog.created_at.desc()).offset((page-1)*size).limit(size).all()
    return {
        "total": total,
        "items": [{
            "id":          l.id,
            "user_id":     l.user_id,
            "top_asin":    l.top_asin,
            "bottom_asin": l.bottom_asin,
            "method":      l.method,
            "k":           l.k,
            "latency_ms":  l.latency_ms,
            "created_at":  l.created_at,
        } for l in logs]
    }


@router.put("/evaluation-results")
def update_eval_results(
    results: list,
    db: Session = Depends(get_db),
    _:  User = Depends(require_staff)
):
    """Cập nhật kết quả evaluation từ notebook vào DB"""
    for r in results:
        row = (
            db.query(EvaluationResult)
            .filter(
                EvaluationResult.method  == r["method"],
                EvaluationResult.version == r.get("version", "v2"),
                EvaluationResult.k       == r["k"]
            ).first()
        )
        if row:
            row.precision_k = r["precision_k"]
            row.recall_k    = r["recall_k"]
            row.accuracy_k  = r["accuracy_k"]
        else:
            db.add(EvaluationResult(**r))
    db.commit()
    return {"message": f"Cập nhật {len(results)} kết quả thành công"}
