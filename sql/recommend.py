"""
routers/recommend.py — Gọi ML inference và trả về gợi ý
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import time, json
from sql.database import get_db
from sql.models import Product, RecommendationLog, Interaction, ProductFeatureVGG, ProductFeatureCLIP
from sql.core.permissions import get_current_user
from sql.models import User

import numpy as np

router = APIRouter()

# ── Load features vào RAM khi khởi động ──────────────────────
_vgg_cache  = {}   # asin -> np.array(4096)
_clip_cache = {}   # asin -> np.array(512)
_cache_loaded = False

def load_feature_cache(db: Session):
    global _vgg_cache, _clip_cache, _cache_loaded
    if _cache_loaded:
        return
    print("Loading feature cache from DB...")
    for row in db.query(ProductFeatureVGG).all():
        _vgg_cache[row.asin] = np.array(json.loads(row.features), dtype=np.float32)
    for row in db.query(ProductFeatureCLIP).all():
        _clip_cache[row.asin] = np.array(json.loads(row.features), dtype=np.float32)
    _cache_loaded = True
    print(f"  VGG:  {len(_vgg_cache)} items")
    print(f"  CLIP: {len(_clip_cache)} items")


def cos_sim(a, b):
    na = np.linalg.norm(a); nb = np.linalg.norm(b)
    if na == 0 or nb == 0: return 0.0
    return float(np.dot(a, b) / (na * nb))

def scores_to_ranks(scores: dict) -> dict:
    sorted_items = sorted(scores, key=scores.get, reverse=True)
    return {item: rank+1 for rank, item in enumerate(sorted_items)}

# ── Recommendation methods ────────────────────────────────────
def vgg_recommend(top_asin, bot_asin, candidates, k=10):
    if top_asin not in _vgg_cache or bot_asin not in _vgg_cache:
        return [], {}
    avg_input = (_vgg_cache[top_asin] + _vgg_cache[bot_asin]) / 2
    scores = {}
    for asin in candidates:
        if asin in _vgg_cache:
            scores[asin] = cos_sim(avg_input, _vgg_cache[asin])
    top_k = sorted(scores, key=scores.get, reverse=True)[:k]
    return top_k, scores

def clip_recommend(top_asin, bot_asin, candidates, k=10):
    if top_asin not in _clip_cache or bot_asin not in _clip_cache:
        return [], {}
    avg_input = (_clip_cache[top_asin] + _clip_cache[bot_asin]) / 2
    scores = {}
    for asin in candidates:
        if asin in _clip_cache:
            scores[asin] = cos_sim(avg_input, _clip_cache[asin])
    top_k = sorted(scores, key=scores.get, reverse=True)[:k]
    return top_k, scores

def hybrid_recommend(top_asin, bot_asin, candidates, k=10, w_clip=0.6, w_vgg=0.4):
    """Weighted RRF fusion: CLIP + VGG"""
    _, vgg_scores  = vgg_recommend(top_asin, bot_asin, candidates, k=len(candidates))
    _, clip_scores = clip_recommend(top_asin, bot_asin, candidates, k=len(candidates))
    vgg_ranks  = scores_to_ranks(vgg_scores)
    clip_ranks = scores_to_ranks(clip_scores)
    rrf = {}
    for asin in candidates:
        r_vgg  = vgg_ranks.get(asin, 999)
        r_clip = clip_ranks.get(asin, 999)
        rrf[asin] = w_vgg / (60 + r_vgg) + w_clip / (60 + r_clip)
    top_k = sorted(rrf, key=rrf.get, reverse=True)[:k]
    return top_k, rrf, vgg_scores, clip_scores

METHODS = {
    "vgg_only":          lambda t, b, c, k: vgg_recommend(t, b, c, k),
    "clip_only":         lambda t, b, c, k: clip_recommend(t, b, c, k),
    "clip_vgg_hybrid":   lambda t, b, c, k: hybrid_recommend(t, b, c, k)[:2],
}

# ── Request/Response ─────────────────────────────────────────
class RecommendRequest(BaseModel):
    top_asin:    str
    bottom_asin: str
    method:      str = "clip_vgg_hybrid"
    k:           int = 10

@router.post("/")
def recommend(
    body: RecommendRequest,
    db:   Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    load_feature_cache(db)

    # Lấy candidate shoes từ DB (chỉ sản phẩm có features)
    shoes = db.query(Product.asin).filter(
        Product.main_cat == "Shoes",
        Product.has_vgg  == True
    ).all()
    candidates = [r[0] for r in shoes]

    if not candidates:
        raise HTTPException(500, "Không có dữ liệu shoes để gợi ý")

    if body.method not in METHODS:
        raise HTTPException(400, f"Method không hợp lệ. Chọn: {list(METHODS.keys())}")

    t0 = time.time()
    result_asins, scores = METHODS[body.method](
        body.top_asin, body.bottom_asin, candidates, body.k
    )
    latency = int((time.time() - t0) * 1000)

    # Lấy thông tin sản phẩm
    products = {
        p.asin: p for p in
        db.query(Product).filter(Product.asin.in_(result_asins)).all()
    }

    results = []
    for rank, asin in enumerate(result_asins, 1):
        p = products.get(asin)
        results.append({
            "rank":     rank,
            "asin":     asin,
            "title":    p.title    if p else "",
            "brand":    p.brand    if p else "",
            "img_url":  p.img_url  if p else "",
            "price":    p.price    if p else None,
            "score":    round(scores.get(asin, 0), 4),
        })

    # Ghi log
    log = RecommendationLog(
        user_id     = current_user.id if current_user else None,
        top_asin    = body.top_asin,
        bottom_asin = body.bottom_asin,
        method      = body.method,
        k           = body.k,
        results     = json.dumps(results),
        latency_ms  = latency
    )
    db.add(log)

    # Ghi interaction
    if current_user:
        for asin_item in [body.top_asin, body.bottom_asin]:
            interaction = Interaction(
                user_id=current_user.id, asin=asin_item, action="view"
            )
            db.add(interaction)
    db.commit()

    return {
        "method":     body.method,
        "latency_ms": latency,
        "top_asin":   body.top_asin,
        "bottom_asin":body.bottom_asin,
        "results":    results
    }


@router.post("/compare")
def compare_methods(
    body: RecommendRequest,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """So sánh kết quả tất cả methods cho cùng 1 input — dành cho staff/admin"""
    if current_user.role not in ("admin", "staff"):
        raise HTTPException(403, "Chỉ staff và admin mới xem được")

    load_feature_cache(db)
    shoes = db.query(Product.asin).filter(
        Product.main_cat=="Shoes", Product.has_vgg==True
    ).all()
    candidates = [r[0] for r in shoes]

    comparison = {}
    for method_name, fn in METHODS.items():
        t0 = time.time()
        asins, scores = fn(body.top_asin, body.bottom_asin, candidates, body.k)
        latency = int((time.time() - t0) * 1000)
        comparison[method_name] = {
            "latency_ms": latency,
            "results": [{"rank": i+1, "asin": a, "score": round(scores.get(a,0),4)}
                        for i, a in enumerate(asins)]
        }

    return comparison
