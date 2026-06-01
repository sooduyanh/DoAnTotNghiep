import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { mockLogin, mockMe } from "../mock/authMock";

const AuthContext = createContext(null);
const API_BASE = "/api";

// Chỉ dùng mock cho phần login/me và một số bảng điều khiển nội bộ khi backend chưa đủ.
const MOCK_AUTH_ONLY = true;

const mockApiCall = async (path, opts = {}) => {
  if (path.startsWith("/staff/dashboard")) {
    return {
      avg_latency_ms: 78,
      total_triplets: 8421,
      product_counts: { "Áo": 120, "Quần": 85, "Giày": 42 },
    };
  }

  if (path.startsWith("/staff/recommendation-logs")) {
    return {
      items: [
        { id: 1, method: "E-LFM", k: 10, latency_ms: 54, top_asin: "B001", bottom_asin: "B002" },
        { id: 2, method: "RRF Fusion", k: 10, latency_ms: 62, top_asin: "B003", bottom_asin: "B004" },
      ],
    };
  }

  if (path.startsWith("/recommend/compare")) {
    return {
      "E-LFM": { latency_ms: 28, results: [{ asin: "B001", rank: 1 }, { asin: "B002", rank: 2 }] },
      "RRF Fusion": { latency_ms: 35, results: [{ asin: "B003", rank: 1 }, { asin: "B004", rank: 2 }] },
    };
  }

  if (path.startsWith("/admin/stats")) {
    return {
      total_users: 128,
      total_customers: 102,
      total_staff: 18,
      total_rec_logs: 532,
      total_interactions: 1740,
    };
  }

  if (path.startsWith("/admin/users") && opts.method === "POST") {
    return { message: "Tạo user demo thành công" };
  }

  if (path.startsWith("/admin/users")) {
    return {
      items: [
        { id: 1, email: "customer@fashion.ai", full_name: "Khách hàng Demo", role: "customer", is_active: true },
        { id: 2, email: "staff@fashion.ai", full_name: "Nhân viên", role: "staff", is_active: true },
        { id: 3, email: "admin@fashion.ai", full_name: "Quản trị viên", role: "admin", is_active: true },
      ],
    };
  }

  return null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("sa_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (MOCK_AUTH_ONLY) {
      try {
        const data = mockMe(token);
        setUser(data);
      } catch {
        localStorage.removeItem("sa_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          console.warn("[AuthContext] /auth/me failed", r.status, t);
          throw new Error(`auth/me http ${r.status}`);
        }
        return r.json();
      })
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem("sa_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      if (MOCK_AUTH_ONLY) {
        const data = mockLogin(email, password);
        localStorage.setItem("sa_token", data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return data.user;
      }

      const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) throw new Error(data.detail || "Đăng nhập thất bại");

    localStorage.setItem("sa_token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);

    return data.user;
  } finally {
    setLoading(false);
  }
  }, []);

  const logout = useCallback(() => {
    if (!MOCK_AUTH_ONLY) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    localStorage.removeItem("sa_token");
    setToken(null);
    setUser(null);
  }, [token]);

  const apiCall = useCallback(
    async (path, opts = {}) => {
      if (MOCK_AUTH_ONLY) {
        const mock = await mockApiCall(path, opts);
        if (mock !== null) return mock;
      }

      const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...opts.headers,
        },
      });

      if (res.status === 401) {
        logout();
        return null;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      return res.json();
    },
    [token, logout]
  );

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiCall, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

