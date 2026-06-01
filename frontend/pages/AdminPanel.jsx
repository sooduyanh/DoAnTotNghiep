import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, GoldBtn, Input, Select, Spinner, STitle, RoleBadge, Toast } from "../UI";

export default function AdminPanel() {
  const { user, apiCall, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [toast, setToast] = useState("");

  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "customer" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await apiCall(`/admin/stats`);
        if (!mounted) return;
        setStats(s);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Không tải được stats");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [apiCall]);

  const fetchUsers = async () => {
    setError("");
    try {
      const url = `/admin/users?role=${encodeURIComponent(roleFilter || "")}&page=${page}&size=${size}`;
      const data = await apiCall(url);
      setUsers(data?.items || []);
    } catch (e) {
      setError(e.message || "Không tải được users");
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const createUser = async () => {
    setError("");
    try {
      const data = await apiCall(`/admin/users`, {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      setToast(data?.message || "Tạo user thành công");
      setNewUser({ email: "", password: "", full_name: "", role: "customer" });
      fetchUsers();
    } catch (e) {
      setError(e.message || "Tạo user thất bại");
    }
  };

  return (
    <div style={{ color: "#2a1a00" }}>
      <header style={H.nav}>
        <div style={H.left}>
          <span style={H.logo}>✦ STYLEAI</span>
          <RoleBadge role={user?.role || "admin"} />
          <span style={H.title}>Admin — Quản trị</span>
        </div>
        <div style={H.right}>
          {user?.full_name && <span style={H.user}>👤 {user.full_name}</span>}
          <button onClick={logout} style={H.logoutBtn}>
            Đăng xuất
          </button>
        </div>
      </header>

      <div style={H.page}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <STitle>Thống kê</STitle>
          {error && <div style={H.error}>⚠ {error}</div>}

          {loading ? (
            <div style={{ color: "#5a4723" }}>
              Đang tải... <Spinner size={18} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
              {stats && (
                <>
                  <StatBox label="Total users" value={stats.total_users} />
                  <StatBox label="Customers" value={stats.total_customers} />
                  <StatBox label="Staff" value={stats.total_staff} />
                  <StatBox label="Rec logs" value={stats.total_rec_logs} />
                  <StatBox label="Interactions" value={stats.total_interactions} />
                </>
              )}
            </div>
          )}

          <div style={{ height: 18 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={K.h}>Tạo user demo</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }}>
                <Input label="Email" value={newUser.email} onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))} />
                <Input label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))} />
                <Input label="Full name" value={newUser.full_name} onChange={(e) => setNewUser((s) => ({ ...s, full_name: e.target.value }))} />
                <Select label="Role" value={newUser.role} onChange={(e) => setNewUser((s) => ({ ...s, role: e.target.value }))}>
                  <option value="customer">customer</option>
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </Select>
                <GoldBtn onClick={createUser}>Tạo user</GoldBtn>
              </div>
            </Card>

            <Card>
              <div style={K.h}>Danh sách users</div>
              <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Input label="Filter role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} />
                </div>
                <GoldBtn onClick={() => { setPage(1); fetchUsers(); }}>Lọc</GoldBtn>
              </div>

              <div style={{ height: 14 }} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {users.map((u) => (
                  <div key={u.id} style={U.box}>
                    <div style={{ fontWeight: 900, color: "#2a1a00" }}>{u.full_name}</div>
                    <div style={{ color: "#5a4723", fontSize: 12, marginTop: 4 }}>{u.email}</div>
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#c9a96e", fontWeight: 800 }}>{u.role}</span>
                      <span style={{ fontSize: 12, color: "#3b2b11" }}>active: {String(u.is_active)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: 14 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} style={B.pageBtn}>
                  Prev
                </button>
                <span style={{ color: "#5a4723", fontSize: 13 }}>Page {page}</span>
                <button onClick={() => setPage((p) => p + 1)} style={B.pageBtn}>
                  Next
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Toast msg={toast} onClose={() => setToast("")} />
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={S.stat}>
      <div style={S.value}>{value ?? "—"}</div>
      <div style={S.label}>{label}</div>
    </div>
  );
}

const H = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 28px",
    borderBottom: "1px solid #dac288",
    background: "#fff1c3",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  left: { display: "flex", alignItems: "center", gap: 14 },
  logo: { fontWeight: 800, letterSpacing: ".2em", color: "#c9a96e", fontSize: 15 },
  title: { fontSize: 11, letterSpacing: ".12em", color: "#5a4723", background: "#ffe2a4", padding: "3px 10px", borderRadius: 4 },
  right: { display: "flex", alignItems: "center", gap: 14 },
  user: { fontSize: 13, color: "#5a4723" },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #d1a454",
    color: "#6b5937",
    padding: "7px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
  },
  page: { padding: "28px 36px" },
  error: { background: "#2a1515", border: "1px solid #5c2222", color: "#ff6b6b", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 18 },
};

const K = { h: { fontSize: 12, letterSpacing: ".08em", color: "#c9a96e", fontWeight: 800, marginBottom: 8 } };

const S = {
  stat: { background: "#fff4b0", border: "1px solid #e1c789", borderRadius: 14, padding: 14, textAlign: "center" },
  value: { fontSize: 28, fontWeight: 900, color: "#2a1a00" },
  label: { color: "#5a4723", fontSize: 12, marginTop: 6 },
};

const U = { box: { background: "#fff4b0", border: "1px solid #e1c789", borderRadius: 14, padding: 14 } };

const B = {
  pageBtn: {
    background: "transparent",
    border: "1px solid #d1a454",
    color: "#5a4723",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
  },
};

