"""
database.py — SQL Server connection via SQLAlchemy + pyodbc
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# ── Cấu hình ────────────────────────────────────────────────
SERVER   = os.getenv("DB_SERVER",   "localhost")
DATABASE = os.getenv("DB_NAME",     "FashionRecommender")
DRIVER   = os.getenv("DB_DRIVER",   "ODBC Driver 17 for SQL Server")
TRUSTED  = os.getenv("DB_TRUSTED",  "true").lower() == "true"
DB_USER  = os.getenv("DB_USER",     "")
DB_PASS  = os.getenv("DB_PASSWORD", "")

if TRUSTED:
    conn_str = (
        f"mssql+pyodbc://@{SERVER}/{DATABASE}"
        f"?driver={DRIVER.replace(' ', '+')}"
        "&Trusted_Connection=yes"
    )
else:
    conn_str = (
        f"mssql+pyodbc://{DB_USER}:{DB_PASS}@{SERVER}/{DATABASE}"
        f"?driver={DRIVER.replace(' ', '+')}"
    )

engine = create_engine(conn_str, fast_executemany=True, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
