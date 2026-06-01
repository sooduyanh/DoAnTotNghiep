"""core/auth.py

Backend hiện tại đã có file sql/auth.py (bcrypt + JWT).
Nhưng project đang import từ `core.auth`:

  from core.auth import hash_password

Tạo wrapper để export hash_password theo đúng import.
"""

from sql.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)


