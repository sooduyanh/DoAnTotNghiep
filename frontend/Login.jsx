import { useState } from "react";
import { useAuth } from "./context/AuthContext";

import { useNavigate } from "react-router-dom";
import { Spinner } from "./UI";


const DEMO = [
  ["Admin",    "admin@fashion.ai",    "Admin@123",    "#e5c07b"],
  ["Staff",    "staff@fashion.ai",    "Staff@123",    "#61afef"],
  ["Customer", "customer@fashion.ai", "Customer@123", "#98c379"],
];

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await login(email, password);
      if      (user.role === "admin") navigate("/admin");
      else if (user.role === "staff") navigate("/staff");
      else                            navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.root}>
      <div style={S.grid} />

      {/* LEFT */}
      <div style={S.left}>
        <div style={S.logo}>
          <span style={{ fontSize:28, color:"#c9a96e" }}>✦</span>
          <span style={{ fontSize:18, fontWeight:800, letterSpacing:".3em" }}>STYLEAI</span>
        </div>
        <h1 style={S.headline}>
          Hệ Thống<br />
          <em style={S.accent}>Gợi Ý</em><br />
          Thời Trang AI
        </h1>
        <p style={S.sub}>
          Kết hợp hành vi người dùng &amp; dữ liệu thị giác<br />
          để tìm outfit hoàn hảo của bạn.
        </p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
          {["E-LFM", "VGG-DAE", "CLIP-DAE", "Weighted RRF", "SQL Server"].map(t => (
            <span key={t} style={S.pill}>{t}</span>
          ))}
        </div>

        {/* Architecture mini-diagram */}
        <div style={S.archBox}>
          {[
            ["Áo + Quần", "#c9a96e"],
            ["CLIP/VGG DAE", "#61afef"],
            ["E-LFM", "#c678dd"],
            ["RRF Fusion", "#98c379"],
            ["Top-K Shoes", "#c9a96e"],
          ].map(([label, color], i, arr) => (
            <span key={label} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:11, color, padding:"4px 10px", border:`1px solid ${color}44`, borderRadius:6, whiteSpace:"nowrap" }}>{label}</span>
              {i < arr.length-1 && <span style={{ color:"#5a4723", fontSize:14 }}>→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={S.right}>
        <form onSubmit={handleSubmit} style={S.card}>
          <p style={S.cardLabel}>ĐĂNG NHẬP HỆ THỐNG</p>
          <h2 style={S.cardTitle}>Chào mừng trở lại</h2>

          <div style={{ marginBottom:18 }}>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="admin@fashion.ai" required
              style={S.input}
              onFocus={e=>e.target.style.borderColor="#c9a96e"}
              onBlur={e=>e.target.style.borderColor="#d3b16a"} />
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={S.label}>Mật khẩu</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" required
              style={S.input}
              onFocus={e=>e.target.style.borderColor="#c9a96e"}
              onBlur={e=>e.target.style.borderColor="#d3b16a"} />
          </div>

          {error && (
            <div style={S.error}>⚠ {error}</div>
          )}

          <button type="submit" disabled={loading} style={{ ...S.btn, opacity:loading?.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            {loading && <Spinner size={16} />}
            {loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP →"}
          </button>

          {/* Demo accounts */}
          <div style={{ borderTop:"1px solid #d1a454", paddingTop:20, marginTop:4 }}>
            <p style={{ fontSize:11, color:"#5a4723", marginBottom:12, letterSpacing:".1em" }}>TÀI KHOẢN DEMO</p>
            {DEMO.map(([role, mail, pw, color]) => (
              <button key={role} type="button"
                onClick={() => { setEmail(mail); setPassword(pw); }}
                style={S.demoBtn}>
                <span style={{ color, fontWeight:600, fontSize:12 }}>{role}</span>
                <span style={{ color:"#6b5937", fontSize:11 }}>{mail}</span>
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}

const S = {
  root:      { display:"flex", minHeight:"100vh", background:"#FFF7C5", color:"#2a1a00", position:"relative", overflow:"hidden" },
  grid:      { position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(201,169,110,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(201,169,110,.04) 1px,transparent 1px)", backgroundSize:"60px 60px", pointerEvents:"none" },
  left:      { flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 72px", position:"relative", zIndex:1, color: "#1a1a1a" },
  logo:      { display:"flex", alignItems:"center", gap:12, marginBottom:56 },
  headline:  { fontSize:"clamp(36px,4.5vw,68px)", fontWeight:800, lineHeight:1.1, marginBottom:24 },
  accent:    { fontStyle:"italic", color:"#c9a96e", fontFamily:"Georgia,serif" },
  sub:       { color:"#5a4723", fontSize:15, lineHeight:1.7, marginBottom:32 },
  pill:      { padding:"5px 14px", border:"1px solid #d1a454", borderRadius:100, fontSize:11, color:"#3b2b11", letterSpacing:".05em" },
  archBox:   { display:"flex", flexWrap:"wrap", alignItems:"center", gap:8, marginTop:32, padding:"16px", background:"#fff4b0", border:"1px solid #e1c789", borderRadius:12 },
  right:     { width:460, display:"flex", alignItems:"center", justifyContent:"center", padding:40, position:"relative", zIndex:1 },
  card:      { width:"100%", background:"#fff7d2", border:"1px solid #e1c789", borderRadius:20, padding:"44px 40px" },
  cardLabel: { fontSize:10, letterSpacing:".2em", color:"#c9a96e", marginBottom:12 },
  cardTitle: { fontSize:26, fontWeight:700, marginBottom:34, color:"#2a1a00" },
  label:     { display:"block", fontSize:11, color:"#5a4723", marginBottom:8, letterSpacing:".05em" },
  input:     { width:"100%", background:"#fff3cd", border:"1px solid #d3b16a", borderRadius:10, padding:"13px 15px", color:"#3b2b11", fontSize:14, outline:"none", transition:"border-color .2s" },
  error:     { background:"#2a1515", border:"1px solid #5c2222", color:"#ff6b6b", padding:"12px 16px", borderRadius:8, fontSize:13, marginBottom:18 },
  btn:       { width:"100%", background:"#c9a96e", border:"none", borderRadius:10, padding:"15px", color:"#0a0a0a", fontSize:14, fontWeight:700, letterSpacing:".1em", cursor:"pointer", marginBottom:28, transition:"all .2s" },
  demoBtn:   { display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", background:"#fff4b0", border:"1px solid #e1c789", borderRadius:8, padding:"10px 14px", cursor:"pointer", marginBottom:8, color:"#3b2b11" },
};
