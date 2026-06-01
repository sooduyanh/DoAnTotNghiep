"""
main.py — FastAPI entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sql.routers import auth, products, recommend, admin, staff

app = FastAPI(
    title="Fashion Recommender API",
    description="Hệ thống gợi ý thời trang dựa trên hành vi người dùng và dữ liệu thị giác",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(recommend.router,prefix="/api/recommend",tags=["Recommend"])
app.include_router(staff.router,    prefix="/api/staff",    tags=["Staff"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["Admin"])

@app.get("/")
def root():
    return {"message": "Fashion Recommender API v1.0"}
