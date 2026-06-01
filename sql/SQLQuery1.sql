-- ============================================================
-- FASHION RECOMMENDER SYSTEM - SQL SERVER SCHEMA
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'FashionRecommender')
    CREATE DATABASE FashionRecommender;
GO

USE FashionRecommender;
GO

-- ============================================================
-- 1. USERS & AUTH
-- ============================================================

IF OBJECT_ID('sessions', 'U') IS NOT NULL DROP TABLE sessions;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;

CREATE TABLE users (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    email         NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    full_name     NVARCHAR(255) NOT NULL,
    role          NVARCHAR(20)  NOT NULL DEFAULT 'customer'
                  CONSTRAINT chk_role CHECK (role IN ('admin','staff','customer')),
    is_active     BIT           NOT NULL DEFAULT 1,
    avatar_url    NVARCHAR(500) NULL,
    created_at    DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIME2     NOT NULL DEFAULT GETDATE()
);

CREATE TABLE sessions (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  NVARCHAR(512) NOT NULL UNIQUE,
    ip_address  NVARCHAR(45)  NULL,
    user_agent  NVARCHAR(500) NULL,
    created_at  DATETIME2     NOT NULL DEFAULT GETDATE(),
    expires_at  DATETIME2     NOT NULL,
    is_revoked  BIT           NOT NULL DEFAULT 0
);

-- ============================================================
-- 2. PRODUCTS (từ meta_clothing.json)
-- ============================================================

IF OBJECT_ID('products', 'U') IS NOT NULL DROP TABLE products;

CREATE TABLE products (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    asin         NVARCHAR(20)   NOT NULL UNIQUE,
    title        NVARCHAR(1000) NULL,
    brand        NVARCHAR(255)  NULL,
    price        FLOAT          NULL,
    img_url      NVARCHAR(1000) NULL,
    main_cat     NVARCHAR(50)   NULL          -- 'Tops','Bottoms','Shoes','Other'
                 CONSTRAINT chk_cat CHECK (main_cat IN ('Tops','Bottoms','Shoes','Other') OR main_cat IS NULL),
    description  NVARCHAR(MAX)  NULL,
    categories   NVARCHAR(MAX)  NULL,         -- JSON string
    also_bought  NVARCHAR(MAX)  NULL,         -- JSON string (list of ASINs)
    also_viewed  NVARCHAR(MAX)  NULL,         -- JSON string
    sales_rank   NVARCHAR(500)  NULL,
    has_vgg      BIT            NOT NULL DEFAULT 0,
    has_clip     BIT            NOT NULL DEFAULT 0,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE()
);

CREATE INDEX ix_products_asin    ON products(asin);
CREATE INDEX ix_products_maincat ON products(main_cat);

-- ============================================================
-- 3. IMAGE FEATURES (tách riêng vì data lớn)
-- ============================================================

IF OBJECT_ID('product_features_vgg', 'U') IS NOT NULL DROP TABLE product_features_vgg;
IF OBJECT_ID('product_features_clip', 'U') IS NOT NULL DROP TABLE product_features_clip;

-- VGG 4096-dim: lưu dạng binary blob hoặc json
CREATE TABLE product_features_vgg (
    asin         NVARCHAR(20) NOT NULL PRIMARY KEY REFERENCES products(asin),
    features     NVARCHAR(MAX) NOT NULL,   -- JSON array of 4096 floats
    created_at   DATETIME2    NOT NULL DEFAULT GETDATE()
);

-- CLIP/Latent 512-dim
CREATE TABLE product_features_clip (
    asin         NVARCHAR(20) NOT NULL PRIMARY KEY REFERENCES products(asin),
    features     NVARCHAR(MAX) NOT NULL,   -- JSON array of 512 floats
    created_at   DATETIME2    NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 4. TRIPLETS (từ triplets.csv)
-- ============================================================

IF OBJECT_ID('triplets', 'U') IS NOT NULL DROP TABLE triplets;

CREATE TABLE triplets (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    top_asin   NVARCHAR(20) NOT NULL,
    bottom_asin NVARCHAR(20) NOT NULL,
    shoe_asin  NVARCHAR(20) NOT NULL,
    source     NVARCHAR(20) NOT NULL DEFAULT 'original'
               CONSTRAINT chk_source CHECK (source IN ('original','also_bought','augmented')),
    created_at DATETIME2    NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uq_triplet UNIQUE (top_asin, bottom_asin, shoe_asin)
);

CREATE INDEX ix_triplets_top  ON triplets(top_asin);
CREATE INDEX ix_triplets_shoe ON triplets(shoe_asin);

-- ============================================================
-- 5. USER INTERACTIONS (hành vi người dùng)
-- ============================================================

IF OBJECT_ID('interactions', 'U') IS NOT NULL DROP TABLE interactions;

CREATE TABLE interactions (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asin       NVARCHAR(20) NOT NULL,
    action     NVARCHAR(20) NOT NULL
               CONSTRAINT chk_action CHECK (action IN ('view','like','dislike','purchase','cart','share')),
    session_id INT          NULL REFERENCES sessions(id),
    created_at DATETIME2    NOT NULL DEFAULT GETDATE()
);

CREATE INDEX ix_interactions_user ON interactions(user_id);
CREATE INDEX ix_interactions_asin ON interactions(asin);
CREATE INDEX ix_interactions_date ON interactions(created_at);

-- ============================================================
-- 6. RECOMMENDATION LOGS
-- ============================================================

IF OBJECT_ID('recommendation_logs', 'U') IS NOT NULL DROP TABLE recommendation_logs;

CREATE TABLE recommendation_logs (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT           NULL REFERENCES users(id),
    top_asin    NVARCHAR(20)  NOT NULL,
    bottom_asin NVARCHAR(20)  NOT NULL,
    method      NVARCHAR(50)  NOT NULL,  -- 'clip_text_hybrid_v2','lfm_only', etc.
    k           INT           NOT NULL DEFAULT 10,
    results     NVARCHAR(MAX) NOT NULL,  -- JSON: [{asin, rank, score_lfm, score_clip, score_vgg}]
    latency_ms  INT           NULL,
    created_at  DATETIME2     NOT NULL DEFAULT GETDATE()
);

CREATE INDEX ix_reclogs_user   ON recommendation_logs(user_id);
CREATE INDEX ix_reclogs_method ON recommendation_logs(method);
CREATE INDEX ix_reclogs_date   ON recommendation_logs(created_at);

-- ============================================================
-- 7. EVALUATION RESULTS (kết quả từ notebook)
-- ============================================================

IF OBJECT_ID('evaluation_results', 'U') IS NOT NULL DROP TABLE evaluation_results;

CREATE TABLE evaluation_results (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    method      NVARCHAR(100) NOT NULL,
    version     NVARCHAR(10)  NOT NULL DEFAULT 'v2',  -- 'v1','v2'
    k           INT           NOT NULL,
    precision_k FLOAT         NOT NULL,
    recall_k    FLOAT         NOT NULL,
    accuracy_k  FLOAT         NOT NULL,
    sample_size INT           NULL,
    recorded_at DATETIME2     NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 8. SEED DATA
-- ============================================================

-- Tài khoản mặc định (password: Admin@123 | Staff@123 | Customer@123)
-- Hash bcrypt sẽ được update qua script Python, đây là placeholder
INSERT INTO users (email, full_name, role, password_hash) VALUES
('admin@fashion.ai',    N'Quản trị viên',  'admin',    '$2b$12$placeholder_admin'),
('staff@fashion.ai',    N'Nhân viên 1',    'staff',    '$2b$12$placeholder_staff'),
('staff2@fashion.ai',   N'Nhân viên 2',    'staff',    '$2b$12$placeholder_staff2'),
('customer@fashion.ai', N'Khách hàng Demo','customer', '$2b$12$placeholder_cust');

-- Kết quả evaluation từ notebook (điền thực tế)
INSERT INTO evaluation_results (method, version, k, precision_k, recall_k, accuracy_k, sample_size) VALUES
('LFM only',             'v1', 10, 0.0, 0.0, 0.0, 200),
('Paper Hybrid VGG',     'v1', 10, 0.0, 0.0, 0.0, 200),
('CLIP Hybrid',          'v1', 10, 0.0, 0.0, 0.0, 200),
('CLIP+Text Hybrid',     'v1', 10, 0.0, 0.0, 0.0, 200),
('LFM only',             'v2', 10, 0.0, 0.0, 0.0, 200),
('Paper Hybrid VGG',     'v2', 10, 0.0, 0.0, 0.0, 200),
('CLIP Hybrid',          'v2', 10, 0.0, 0.0, 0.0, 200),
('CLIP+Text Hybrid',     'v2', 10, 0.0, 0.0, 0.0, 200);
-- TODO: cập nhật số liệu thực từ notebook vào đây

GO
PRINT 'Schema created successfully!';

SELECT email, password_hash, role, is_active
FROM users
WHERE email = 'admin@fashion.ai';
