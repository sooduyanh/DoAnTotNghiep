/* ── Reusable UI atoms ──────────────────────────────────────── */
import { useState } from "react";

/* Navbar */
export function Navbar({ title, badge, userName, onLogout, extra }) {
  return (
    <nav style={nS.nav}>
      <div style={nS.left}>
        <span style={nS.logo}>✦ STYLEAI</span>
        {badge && <span style={nS.badge}>{badge}</span>}
        {title && <span style={nS.title}>{title}</span>}
      </div>
      <div style={nS.right}>
        {extra}
        {userName && <span style={nS.user}>👤 {userName}</span>}
        <button onClick={onLogout} style={nS.logoutBtn}>Đăng xuất</button>
      </div>
    </nav>
  );
}
const nS = {
  nav:       { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 28px", borderBottom:"1px solid #dac288", background:"#fff1c3", position:"sticky", top:0, zIndex:100 },
  left:      { display:"flex", alignItems:"center", gap:12 },
  logo:      { fontWeight:800, letterSpacing:".2em", color:"#c9a96e", fontSize:15 },
  badge:     { fontSize:10, letterSpacing:".15em", border:"1px solid #c9a96e", color:"#c9a96e", background:"#1a1400", padding:"3px 8px", borderRadius:4 },
  title:     { fontSize:11, letterSpacing:".12em", color:"#5a4723", background:"#ffe2a4", padding:"3px 10px", borderRadius:4 },
  right:     { display:"flex", alignItems:"center", gap:14 },
  user:      { fontSize:13, color:"#5a4723" },
  logoutBtn: { background:"transparent", border:"1px solid #d1a454", color:"#6b5937", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:12 },
};

/* Sidebar layout */
export function SidebarLayout({ tabs, activeTab, onTab, children }) {
  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 57px)" }}>
      <aside style={slS.sidebar}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)}
            style={{ ...slS.btn, ...(activeTab===t.id ? slS.btnActive : {}) }}>
            {t.label}
          </button>
        ))}
      </aside>
      <main style={slS.main}>{children}</main>
    </div>
  );
}
const slS = {
  sidebar: { width:220, borderRight:"1px solid #dac288", padding:"20px 14px", display:"flex", flexDirection:"column", gap:4 },
  btn:     { background:"transparent", border:"none", color:"#5a4723", padding:"11px 14px", borderRadius:8, cursor:"pointer", textAlign:"left", fontSize:13, transition:"all .15s" },
  btnActive:{ background:"#e5c07b", color:"#2a1a00", fontWeight:700 },
  main:    { flex:1, padding:"32px 36px", overflowX:"auto" },
};

/* Card */
export function Card({ children, style }) {
  return <div style={{ background:"#fff4b0", border:"1px solid #e1c789", borderRadius:16, padding:"20px 22px", ...style }}>{children}</div>;
}

/* Section title */
export function STitle({ children, style }) {
  return <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, ...style }}>{children}</h2>;
}

/* Stats grid */
export function StatsGrid({ items }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${items.length},1fr)`, gap:14, marginBottom:28 }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{ background:"#fff4b0", border:"1px solid #e1c789", borderRadius:14, padding:"18px 14px", textAlign:"center" }}>
          <p style={{ fontSize:32, fontWeight:800, color: color||"#c9a96e", marginBottom:4 }}>{value ?? "—"}</p>
          <p style={{ fontSize:12, color:"#6b5532" }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

/* Data table */
export function DataTable({ headers, rows, renderRow }) {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <thead>
        <tr>{headers.map(h => <th key={h} style={{ textAlign:"left", padding:"10px 12px", fontSize:11, letterSpacing:".08em", color:"#5a4723", borderBottom:"1px solid #e1c789" }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i%2===0?"#fff4c8":"#fff1b2" }}>
            {renderRow(row).map((cell, j) => (
              <td key={j} style={{ padding:"11px 12px", fontSize:13, color:"#4b3a1f", borderBottom:"1px solid #e9d6a6" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* Role badge */
export function RoleBadge({ role }) {
  const map = { admin:["#e5c07b","#2a1a00"], staff:["#61afef","#001a2a"], customer:["#98c379","#0a1a00"] };
  const [color, bg] = map[role] || ["#888","#1a1a1a"];
  return (
    <span style={{ color, background: bg+"bb", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600, border:`1px solid ${color}44` }}>{role}</span>
  );
}

/* Loading spinner */
export function Spinner({ size=16 }) {
  return (
    <span style={{ display:"inline-block", width:size, height:size, border:"2px solid #a57d39", borderTopColor:"#f4ae52",
      borderRadius:"50%", animation:"spin .7s linear infinite", verticalAlign:"middle" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

/* Toast notification */
export function Toast({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", bottom:24, right:24, background:"#f8e4c0", border:"1px solid #d9ae63",
      color:"#6b4f1f", padding:"12px 20px", borderRadius:10, cursor:"pointer", fontSize:14, zIndex:9999, maxWidth:340 }}>
      ✓ {msg} <span style={{ color:"#7a6241", marginLeft:8, fontSize:11 }}>click để tắt</span>
    </div>
  );
}

/* GoldButton */
export function GoldBtn({ children, onClick, disabled, style, loading }) {
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{
      background:"#c9a96e", border:"none", borderRadius:10, padding:"12px 24px",
      color:"#0a0a0a", fontSize:14, fontWeight:700, cursor: (disabled||loading)?"not-allowed":"pointer",
      opacity: (disabled||loading)?.5:1, letterSpacing:".06em", display:"flex", alignItems:"center", gap:8, ...style
    }}>
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

/* Input */
export function Input({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
      {label && <label style={{ fontSize:11, color:"#5a4723", letterSpacing:".05em" }}>{label}</label>}
      <input {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e  => { setFocused(false); props.onBlur?.(e); }}
        style={{ background:"#fff2be", border:`1px solid ${focused?"#f4ae52":"#d3b16a"}`, borderRadius:8,
          padding:"11px 14px", color:"#3b2b11", fontSize:14, outline:"none", width:"100%", ...props.style }}
      />
    </div>
  );
}

/* Select */
export function Select({ label, children, ...props }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
      {label && <label style={{ fontSize:11, color:"#5a4723", letterSpacing:".05em" }}>{label}</label>}
      <select {...props} style={{ background:"#fff2be", border:"1px solid #d3b16a", borderRadius:8,
        padding:"11px 14px", color:"#3b2b11", fontSize:14, outline:"none", width:"100%", ...props.style }}>
        {children}
      </select>
    </div>
  );
}

/* Confirm dialog */
export function useConfirm() {
  return (msg) => window.confirm(msg);
}
