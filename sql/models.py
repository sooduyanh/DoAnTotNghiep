"""
models/models.py — SQLAlchemy ORM cho SQL Server
"""
from sqlalchemy import (Column, Integer, String, Float, DateTime,
                        Boolean, ForeignKey, Text, func)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    email         = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name     = Column(String(255), nullable=False)
    role          = Column(String(20),  nullable=False, default="customer")
    is_active     = Column(Boolean, default=True)
    avatar_url    = Column(String(500), nullable=True)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now())

    interactions  = relationship("Interaction", back_populates="user")
    rec_logs      = relationship("RecommendationLog", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(512), unique=True, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)


class Product(Base):
    __tablename__ = "products"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    asin        = Column(String(20), unique=True, nullable=False)
    title       = Column(String(1000))
    brand       = Column(String(255))
    price       = Column(Float)
    img_url     = Column(String(1000))
    main_cat    = Column(String(50))
    description = Column(Text)
    categories  = Column(Text)   # JSON string
    also_bought = Column(Text)   # JSON string
    also_viewed = Column(Text)   # JSON string
    sales_rank  = Column(String(500))
    has_vgg     = Column(Boolean, default=False)
    has_clip    = Column(Boolean, default=False)
    created_at  = Column(DateTime, server_default=func.now())


class ProductFeatureVGG(Base):
    __tablename__ = "product_features_vgg"
    asin       = Column(String(20), ForeignKey("products.asin"), primary_key=True)
    features   = Column(Text, nullable=False)  # JSON array
    created_at = Column(DateTime, server_default=func.now())


class ProductFeatureCLIP(Base):
    __tablename__ = "product_features_clip"
    asin       = Column(String(20), ForeignKey("products.asin"), primary_key=True)
    features   = Column(Text, nullable=False)  # JSON array
    created_at = Column(DateTime, server_default=func.now())


class Triplet(Base):
    __tablename__ = "triplets"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    top_asin    = Column(String(20), nullable=False)
    bottom_asin = Column(String(20), nullable=False)
    shoe_asin   = Column(String(20), nullable=False)
    source      = Column(String(20), default="original")
    created_at  = Column(DateTime, server_default=func.now())


class Interaction(Base):
    __tablename__ = "interactions"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    asin       = Column(String(20), nullable=False)
    action     = Column(String(20), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    user       = relationship("User", back_populates="interactions")


class RecommendationLog(Base):
    __tablename__ = "recommendation_logs"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    top_asin    = Column(String(20), nullable=False)
    bottom_asin = Column(String(20), nullable=False)
    method      = Column(String(50), nullable=False)
    k           = Column(Integer, default=10)
    results     = Column(Text, nullable=False)  # JSON
    latency_ms  = Column(Integer)
    created_at  = Column(DateTime, server_default=func.now())
    user        = relationship("User", back_populates="rec_logs")


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    method      = Column(String(100), nullable=False)
    version     = Column(String(10), default="v2")
    k           = Column(Integer, nullable=False)
    precision_k = Column(Float, nullable=False)
    recall_k    = Column(Float, nullable=False)
    accuracy_k  = Column(Float, nullable=False)
    sample_size = Column(Integer)
    recorded_at = Column(DateTime, server_default=func.now())
