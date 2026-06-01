"""
import_data.py — Đọc dữ liệu thật từ CSV/JSON/NPY → SQL Server
Chạy: python import_data.py
"""

import json
import ast
import numpy as np
import pandas as pd
import pyodbc
from tqdm import tqdm
import os

# ============================================================
# CẤU HÌNH — chỉnh lại cho máy bạn
# ============================================================
SQL_SERVER   = "localhost"           # hoặc tên server SSMS
SQL_DATABASE = "FashionRecommender"
SQL_DRIVER   = "ODBC Driver 17 for SQL Server"
SQL_TRUSTED  = True                  # dùng Windows Authentication
# Nếu dùng SQL Login thì đặt SQL_TRUSTED = False và điền:
SQL_USER     = ""
SQL_PASSWORD = ""

BASE_DIR = r"C:\Users\ler64\OneDrive\Máy tính\ĐATN\Dataset\images"
META_PATH    = os.path.join(BASE_DIR, "meta_clothing.json", "meta_Clothing_Shoes_and_Jewelry.json")
TRIPLETS_PATH = os.path.join(BASE_DIR, "triplets.csv")
VGG_PATH     = os.path.join(BASE_DIR, "image_features.npy")
LATENT_PATH  = os.path.join(BASE_DIR, "latent_image_features.npy")

# ============================================================
# KẾT NỐI
# ============================================================
def get_connection():
    if SQL_TRUSTED:
        conn_str = (
            f"DRIVER={{{SQL_DRIVER}}};"
            f"SERVER={SQL_SERVER};"
            f"DATABASE={SQL_DATABASE};"
            "Trusted_Connection=yes;"
        )
    else:
        conn_str = (
            f"DRIVER={{{SQL_DRIVER}}};"
            f"SERVER={SQL_SERVER};"
            f"DATABASE={SQL_DATABASE};"
            f"UID={SQL_USER};PWD={SQL_PASSWORD};"
        )
    return pyodbc.connect(conn_str)


# ============================================================
# PHÂN LOẠI CATEGORY
# ============================================================
def classify_category(categories):
    if not isinstance(categories, list) or len(categories) == 0:
        return "Other"
    flat = [item.lower().strip() for sub in categories for item in sub]
    text = " ".join(flat)
    if any(w in text for w in ["shirt","blouse","top","t-shirt","sweater",
                                "hoodie","jacket","coat","cardigan","tank",
                                "camisole","dress","blazer"]):
        return "Tops"
    elif any(w in text for w in ["pants","trousers","jeans","shorts","leggings",
                                  "skirt","bottom","capri","joggers"]):
        return "Bottoms"
    elif any(w in text for w in ["shoes","boots","sandals","sneakers","heels",
                                  "loafers","flats","slippers","oxfords","pumps"]):
        return "Shoes"
    return "Other"


# ============================================================
# 1. IMPORT PRODUCTS từ meta JSON
# ============================================================
def import_products(conn):
    print("\n[1/4] Import products từ meta JSON...")
    cursor = conn.cursor()

    # Lấy ASINs đã có trong DB
    cursor.execute("SELECT asin FROM products")
    existing = {row[0] for row in cursor.fetchall()}
    print(f"  Đã có: {len(existing)} sản phẩm")

    inserted = 0
    errors   = 0
    batch    = []
    BATCH_SIZE = 500

    def flush_batch():
        nonlocal inserted
        if not batch:
            return
        cursor.executemany("""
            INSERT INTO products
                (asin, title, brand, price, img_url, main_cat,
                 description, categories, also_bought, also_viewed, sales_rank)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, batch)
        conn.commit()
        inserted += len(batch)
        batch.clear()

    with open(META_PATH, "r", encoding="utf-8") as f:
        for line in tqdm(f, desc="  Reading meta"):
            line = line.strip()
            if not line:
                continue
            try:
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    rec = ast.literal_eval(line)
            except Exception:
                errors += 1
                continue

            asin = str(rec.get("asin", "")).strip()
            if not asin or asin in existing:
                continue

            cats     = rec.get("categories", [])
            related  = rec.get("related", {}) or {}
            rank_raw = rec.get("salesRank", {})

            batch.append((
                asin,
                str(rec.get("title", "") or "")[:1000],
                str(rec.get("brand", "") or "")[:255],
                float(rec.get("price", 0) or 0) or None,
                str(rec.get("imUrl", "") or "")[:1000],
                classify_category(cats),
                str(rec.get("description", "") or ""),
                json.dumps(cats),
                json.dumps(related.get("also_bought", [])),
                json.dumps(related.get("also_viewed", [])),
                json.dumps(rank_raw),
            ))
            existing.add(asin)

            if len(batch) >= BATCH_SIZE:
                flush_batch()

    flush_batch()
    print(f"  ✅ Inserted: {inserted:,} | Errors: {errors:,}")


# ============================================================
# 2. IMPORT TRIPLETS từ CSV
# ============================================================
def import_triplets(conn):
    print("\n[2/4] Import triplets từ CSV...")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM triplets")
    if cursor.fetchone()[0] > 0:
        print("  ⚠️  Triplets đã có dữ liệu, bỏ qua.")
        return

    df = pd.read_csv(TRIPLETS_PATH)
    print(f"  Tổng: {len(df):,} triplets")

    batch = [
        (row["top"], row["bottom"], row["shoe"], "original")
        for _, row in df.iterrows()
    ]

    cursor.executemany("""
        IF NOT EXISTS (
            SELECT 1 FROM triplets
            WHERE top_asin=? AND bottom_asin=? AND shoe_asin=?
        )
        INSERT INTO triplets (top_asin, bottom_asin, shoe_asin, source)
        VALUES (?,?,?,?)
    """, [(r[0],r[1],r[2],r[0],r[1],r[2],r[3]) for r in batch])
    conn.commit()
    print(f"  ✅ Inserted: {len(batch):,} triplets")


# ============================================================
# 3. IMPORT VGG FEATURES
# ============================================================
def import_vgg_features(conn):
    print("\n[3/4] Import VGG features (4096-dim)...")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM product_features_vgg")
    if cursor.fetchone()[0] > 0:
        print("  ⚠️  VGG features đã có, bỏ qua.")
        return

    print("  Loading .npy file...")
    raw = np.load(VGG_PATH, allow_pickle=True).item()
    print(f"  Loaded: {len(raw):,} items")

    # Normalize L2
    from sklearn.preprocessing import normalize
    asins  = list(raw.keys())
    matrix = np.stack([raw[a].astype(np.float32) for a in asins])
    matrix = normalize(matrix, norm="l2")

    batch = []
    BATCH_SIZE = 100
    inserted = 0

    for i, asin in enumerate(tqdm(asins, desc="  Inserting VGG")):
        feat_json = json.dumps(matrix[i].tolist())
        batch.append((asin, feat_json))

        if len(batch) >= BATCH_SIZE:
            cursor.executemany("""
                IF NOT EXISTS (SELECT 1 FROM product_features_vgg WHERE asin=?)
                INSERT INTO product_features_vgg (asin, features) VALUES (?,?)
            """, [(r[0], r[0], r[1]) for r in batch])
            conn.commit()
            inserted += len(batch)
            batch.clear()

    if batch:
        cursor.executemany("""
            IF NOT EXISTS (SELECT 1 FROM product_features_vgg WHERE asin=?)
            INSERT INTO product_features_vgg (asin, features) VALUES (?,?)
        """, [(r[0], r[0], r[1]) for r in batch])
        conn.commit()
        inserted += len(batch)

    # Cập nhật flag has_vgg
    cursor.execute("""
        UPDATE products SET has_vgg=1
        WHERE asin IN (SELECT asin FROM product_features_vgg)
    """)
    conn.commit()
    print(f"  ✅ Inserted: {inserted:,} VGG features")


# ============================================================
# 4. IMPORT CLIP/LATENT FEATURES
# ============================================================
def import_clip_features(conn):
    print("\n[4/4] Import CLIP/Latent features (512-dim)...")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM product_features_clip")
    if cursor.fetchone()[0] > 0:
        print("  ⚠️  CLIP features đã có, bỏ qua.")
        return

    print("  Loading .npy file...")
    d = np.load(LATENT_PATH, allow_pickle=True).item()
    asins  = d["asin"]
    feats  = d["features"]
    print(f"  Loaded: {len(asins):,} items")

    from sklearn.preprocessing import normalize
    matrix = np.stack([np.array(f, dtype=np.float32) for f in feats])
    matrix = normalize(matrix, norm="l2")

    batch = []
    BATCH_SIZE = 100
    inserted = 0

    for i, asin in enumerate(tqdm(asins, desc="  Inserting CLIP")):
        feat_json = json.dumps(matrix[i].tolist())
        batch.append((asin, feat_json))

        if len(batch) >= BATCH_SIZE:
            cursor.executemany("""
                IF NOT EXISTS (SELECT 1 FROM product_features_clip WHERE asin=?)
                INSERT INTO product_features_clip (asin, features) VALUES (?,?)
            """, [(r[0], r[0], r[1]) for r in batch])
            conn.commit()
            inserted += len(batch)
            batch.clear()

    if batch:
        cursor.executemany("""
            IF NOT EXISTS (SELECT 1 FROM product_features_clip WHERE asin=?)
            INSERT INTO product_features_clip (asin, features) VALUES (?,?)
        """, [(r[0], r[0], r[1]) for r in batch])
        conn.commit()
        inserted += len(batch)

    cursor.execute("""
        UPDATE products SET has_clip=1
        WHERE asin IN (SELECT asin FROM product_features_clip)
    """)
    conn.commit()
    print(f"  ✅ Inserted: {inserted:,} CLIP features")


# ============================================================
# 5. SEED USERS với password thật
# ============================================================
def seed_users(conn):
    print("\n[+] Seed users với bcrypt password...")
    import bcrypt

    cursor = conn.cursor()
    users = [
        ("admin@fashion.ai",    "Admin@123",    "admin",    "Quản trị viên"),
        ("staff@fashion.ai",    "Staff@123",    "staff",    "Nhân viên 1"),
        ("staff2@fashion.ai",   "Staff@123",    "staff",    "Nhân viên 2"),
        ("customer@fashion.ai", "Customer@123", "customer", "Khách hàng Demo"),
    ]
    for email, password, role, name in users:
        cursor.execute("SELECT COUNT(*) FROM users WHERE email=?", email)
        if cursor.fetchone()[0] > 0:
            pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            cursor.execute(
                "UPDATE users SET password_hash=? WHERE email=?",
                pw_hash, email
            )
        else:
            pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            cursor.execute("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES (?,?,?,?)
            """, email, pw_hash, name, role)
    conn.commit()
    print("  ✅ Users seeded!")
    print("     admin@fashion.ai    / Admin@123")
    print("     staff@fashion.ai    / Staff@123")
    print("     customer@fashion.ai / Customer@123")


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    print("=" * 55)
    print("  Fashion Recommender — Data Import Script")
    print("=" * 55)

    conn = get_connection()
    print("✅ Kết nối SQL Server thành công!")

    import_products(conn)
    import_triplets(conn)
    import_vgg_features(conn)
    import_clip_features(conn)
    seed_users(conn)

    conn.close()
    print("\n✅ Import hoàn tất!")
