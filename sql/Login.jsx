import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await login(email, password);
      if      (user.role === "admin")    navigate("/admin");
      else if (user.role === "staff")    navigate("/staff");
      else                               navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Background grid */}
      <div style={styles.gridBg} />

      <div style={styles.left}>
        <div style={styles.logoArea}>
          <span style={styles.logoMark}>✦</span>
          <span style={styles.logoText}>STYLEAI</span>
        </div>
        <h1 style={styles.headline}>
          Hệ Thống<br />
          <em style={styles.accent}>Gợi Ý</em><br />
          Thời Trang
        </h1>
        <p style={styles.sub}>
          Kết hợp hành vi người dùng &amp; dữ liệu thị giác<br />
          để tìm outfit hoàn hảo của bạn.
        </p>
        <div style={styles.pillRow}>
          {["E-LFM", "VGG-DAE", "CLIP", "Weighted RRF"].map(t => (
            <span key={t} style={styles.pill}>{t}</span>
          ))}
        </div>
      </div>

      <div style={styles.right}>
        <form onSubmit={handleSubmit} style={styles.card}>
          <p style={styles.cardLabel}>ĐĂNG NHẬP HỆ THỐNG</p>
          <h2 style={styles.cardTitle}>Chào mừng trở lại</h2>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@fashion.ai"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = "#c9a96e"}
              onBlur={e  => e.target.style.borderColor = "#2a2a2a"}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = "#c9a96e"}
              onBlur={e  => e.target.style.borderColor = "#2a2a2a"}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{...styles.btn, opacity: loading ? 0.7 : 1}}
          >
            {loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP →"}
          </button>

          <div style={styles.demoAccounts}>
            <p style={styles.demoTitle}>Tài khoản demo:</p>
            {[
              ["Admin",    "admin@fashion.ai",    "Admin@123"],
              ["Staff",    "staff@fashion.ai",    "Staff@123"],
              ["Customer", "customer@fashion.ai", "Customer@123"],
            ].map(([role, mail, pw]) => (
              <button
                key={role}
                type="button"
                style={styles.demoBtn}
                onClick={() => { setEmail(mail); setPassword(pw); }}
              >
                <span style={{color: roleColor(role)}}>{role}</span>
                <span style={{color:"#666", fontSize:11}}>{mail}</span>
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}

const roleColor = r => ({Admin:"#e5c07b",Staff:"#61afef",Customer:"#98c379"})[r] || "#fff";

const styles = {
  root: {
    display: "flex", minHeight: "100vh",
    background: "#0a0a0a", color: "#fff",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative", overflow: "hidden"
  },
  gridBg: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(201,169,110,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,0.04) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
    pointerEvents: "none"
  },
  left: {
    flex: 1, display: "flex", flexDirection: "column",
    justifyContent: "center", padding: "60px 80px",
    position: "relative", zIndex: 1
  },
  logoArea: { display: "flex", alignItems: "center", gap: 10, marginBottom: 60 },
  logoMark: { fontSize: 28, color: "#c9a96e" },
  logoText:  { fontSize: 18, fontWeight: 700, letterSpacing: "0.3em", color: "#fff" },
  headline: {
    fontSize: "clamp(40px, 5vw, 72px)", fontWeight: 800,
    lineHeight: 1.1, margin: "0 0 24px"
  },
  accent: {
    fontStyle: "italic", color: "#c9a96e",
    fontFamily: "'Georgia', serif"
  },
  sub: { color: "#888", fontSize: 16, lineHeight: 1.7, margin: "0 0 40px" },
  pillRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  pill: {
    padding: "6px 16px", border: "1px solid #2a2a2a",
    borderRadius: 100, fontSize: 12, color: "#aaa",
    letterSpacing: "0.05em"
  },
  right: {
    width: "460px", display: "flex", alignItems: "center",
    justifyContent: "center", padding: 40,
    position: "relative", zIndex: 1
  },
  card: {
    width: "100%", background: "#111",
    border: "1px solid #1e1e1e", borderRadius: 20,
    padding: "48px 40px"
  },
  cardLabel: {
    fontSize: 10, letterSpacing: "0.2em", color: "#c9a96e",
    marginBottom: 12
  },
  cardTitle: { fontSize: 28, fontWeight: 700, margin: "0 0 36px" },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 12, color: "#888", marginBottom: 8, letterSpacing: "0.05em" },
  input: {
    width: "100%", background: "#0a0a0a",
    border: "1px solid #2a2a2a", borderRadius: 10,
    padding: "14px 16px", color: "#fff", fontSize: 15,
    outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box"
  },
  errorBox: {
    background: "#2a1515", border: "1px solid #5c2222",
    color: "#ff6b6b", padding: "12px 16px",
    borderRadius: 8, fontSize: 14, marginBottom: 20
  },
  btn: {
    width: "100%", background: "#c9a96e",
    border: "none", borderRadius: 10,
    padding: "16px", color: "#0a0a0a",
    fontSize: 14, fontWeight: 700,
    letterSpacing: "0.1em", cursor: "pointer",
    transition: "all 0.2s", marginBottom: 32
  },
  demoAccounts: { borderTop: "1px solid #1e1e1e", paddingTop: 24 },
  demoTitle: { fontSize: 11, color: "#555", marginBottom: 12, letterSpacing: "0.1em" },
  demoBtn: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", width: "100%",
    background: "transparent", border: "1px solid #1e1e1e",
    borderRadius: 8, padding: "10px 14px",
    cursor: "pointer", marginBottom: 8,
    color: "#fff", fontSize: 13
  }
};
