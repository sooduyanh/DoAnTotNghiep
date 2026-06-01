import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function AdminPanel() {
  const { user, logout, apiCall } = useAuth();
  const [tab, setTab]   = useState("users");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email:"", password:"", full_name:"", role:"customer" });
  const [msg, setMsg]   = useState("");

  useEffect(() => {
    apiCall("/admin/stats").then(setStats);
  }, []);

  useEffect(() => {
    if (tab === "users") {
      apiCall("/admin/users?size=50").then(d => setUsers(d?.items || []));
    }
  }, [tab]);

  const toggleActive = async (u) => {
    await apiCall(`/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !u.is_active })
    });
    setUsers(prev => prev.map(x => x.id===u.id ? {...x, is_active:!x.is_active} : x));
  };

  const deleteUser = async (id) => {
    if (!confirm("Xóa user này?")) return;
    await apiCall(`/admin/users/${id}`, { method: "DELETE" });
    setUsers(prev => prev.filter(x => x.id !== id));
  };

  const createUser = async () => {
    const res = await apiCall("/admin/users", {
      method: "POST", body: JSON.stringify(newUser)
    });
    setMsg(res?.message || "Đã tạo");
    setShowCreate(false);
    apiCall("/admin/users?size=50").then(d => setUsers(d?.items || []));
  };

  const TABS = [
    { id:"users", label:"👥 Quản lý Users" },
    { id:"stats", label:"📊 Thống kê" },
  ];

  const roleColor = { admin:"#e5c07b", staff:"#61afef", customer:"#98c379" };

  return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <span style={S.logo}>✦ STYLEAI</span>
          <span style={S.adminBadge}>ADMIN</span>
        </div>
        <div style={S.navRight}>
          <span style={S.navUser}>{user?.full_name}</span>
          <button onClick={logout} style={S.logoutBtn}>Đăng xuất</button>
        </div>
      </nav>

      <div style={S.layout}>
        <aside style={S.sidebar}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{...S.sideBtn, ...(tab===t.id ? S.sideBtnActive : {})}}
            >
              {t.label}
            </button>
          ))}
        </aside>

        <main style={S.main}>
          {msg && (
            <div style={S.msgBox} onClick={() => setMsg("")}>
              ✓ {msg} (click để tắt)
            </div>
          )}

          {tab === "users" && (
            <>
              <div style={S.topRow}>
                <h2 style={S.sectionTitle}>Quản lý Users</h2>
                <button onClick={() => setShowCreate(true)} style={S.createBtn}>
                  + Tạo User mới
                </button>
              </div>

              {showCreate && (
                <div style={S.createBox}>
                  <p style={S.createTitle}>TẠO USER MỚI</p>
                  <div style={S.createGrid}>
                    {[
                      ["Email",     "email",     "text",     "email@example.com"],
                      ["Họ tên",    "full_name", "text",     "Nguyễn Văn A"],
                      ["Mật khẩu", "password",  "password", "••••••••"],
                    ].map(([label, key, type, ph]) => (
                      <div key={key} style={S.field}>
                        <label style={S.label}>{label}</label>
                        <input
                          type={type} placeholder={ph}
                          value={newUser[key]}
                          onChange={e => setNewUser(p => ({...p,[key]:e.target.value}))}
                          style={S.input}
                        />
                      </div>
                    ))}
                    <div style={S.field}>
                      <label style={S.label}>Role</label>
                      <select
                        value={newUser.role}
                        onChange={e => setNewUser(p => ({...p,role:e.target.value}))}
                        style={S.select}
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:16}}>
                    <button onClick={createUser} style={S.saveBtn}>Tạo</button>
                    <button onClick={() => setShowCreate(false)} style={S.cancelBtn}>Hủy</button>
                  </div>
                </div>
              )}

              <table style={S.table}>
                <thead>
                  <tr>
                    {["ID","Email","Họ tên","Role","Trạng thái","Ngày tạo","Thao tác"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{background: i%2===0?"#111":"#0f0f0f"}}>
                      <td style={S.td}>{u.id}</td>
                      <td style={S.td}>{u.email}</td>
                      <td style={S.td}>{u.full_name}</td>
                      <td style={S.td}>
                        <span style={{
                          color: roleColor[u.role], background: roleColor[u.role]+"22",
                          padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600
                        }}>{u.role}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{color: u.is_active ? "#98c379" : "#e06c75"}}>
                          {u.is_active ? "● Hoạt động" : "○ Khóa"}
                        </span>
                      </td>
                      <td style={{...S.td, fontSize:11, color:"#666"}}>
                        {new Date(u.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td style={S.td}>
                        <div style={{display:"flex", gap:8}}>
                          <button onClick={() => toggleActive(u)} style={S.actionBtn}>
                            {u.is_active ? "Khóa" : "Mở"}
                          </button>
                          {u.id !== user?.id && (
                            <button onClick={() => deleteUser(u.id)} style={{...S.actionBtn, color:"#e06c75", borderColor:"#3a1a1a"}}>
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {tab === "stats" && stats && (
            <div>
              <h2 style={S.sectionTitle}>Thống kê Hệ thống</h2>
              <div style={S.statsGrid}>
                {[
                  ["Tổng Users",        stats.total_users,        "#c9a96e"],
                  ["Customers",         stats.total_customers,     "#98c379"],
                  ["Staff",             stats.total_staff,         "#61afef"],
                  ["Lượt Gợi ý",        stats.total_rec_logs,      "#c678dd"],
                  ["Lượt Tương tác",    stats.total_interactions,  "#e5c07b"],
                ].map(([label, val, color]) => (
                  <div key={label} style={S.bigStat}>
                    <p style={{...S.bigNum, color}}>{val?.toLocaleString() ?? "—"}</p>
                    <p style={S.bigLabel}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const S = {
  root:      { minHeight:"100vh", background:"#0a0a0a", color:"#fff", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  nav:       { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 32px", borderBottom:"1px solid #1a1a1a" },
  navLeft:   { display:"flex", alignItems:"center", gap:16 },
  logo:      { fontWeight:800, letterSpacing:"0.2em", color:"#c9a96e" },
  adminBadge:{ background:"#2a1400", border:"1px solid #c9a96e", color:"#c9a96e", fontSize:10, letterSpacing:"0.15em", padding:"4px 10px", borderRadius:4 },
  navRight:  { display:"flex", alignItems:"center", gap:16 },
  navUser:   { fontSize:14, color:"#888" },
  logoutBtn: { background:"transparent", border:"1px solid #2a2a2a", color:"#888", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:13 },
  layout:    { display:"flex", minHeight:"calc(100vh - 57px)" },
  sidebar:   { width:220, borderRight:"1px solid #1a1a1a", padding:"24px 16px", display:"flex", flexDirection:"column", gap:6 },
  sideBtn:   { background:"transparent", border:"none", color:"#888", padding:"11px 14px", borderRadius:8, cursor:"pointer", textAlign:"left", fontSize:14, transition:"all 0.15s" },
  sideBtnActive: { background:"#1a1400", color:"#c9a96e", fontWeight:600 },
  main:      { flex:1, padding:"36px 40px", overflowX:"auto" },
  msgBox:    { background:"#0f2a0f", border:"1px solid #2a5a2a", color:"#98c379", padding:"12px 16px", borderRadius:8, marginBottom:20, cursor:"pointer", fontSize:14 },
  topRow:    { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 },
  sectionTitle: { fontSize:22, fontWeight:700, margin:0 },
  createBtn: { background:"#c9a96e", border:"none", color:"#0a0a0a", padding:"10px 20px", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 },
  createBox: { background:"#111", border:"1px solid #c9a96e22", borderRadius:14, padding:24, marginBottom:24 },
  createTitle: { fontSize:11, letterSpacing:"0.15em", color:"#c9a96e", marginBottom:20 },
  createGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  field:     { display:"flex", flexDirection:"column", gap:8 },
  label:     { fontSize:11, color:"#888", letterSpacing:"0.05em" },
  input:     { background:"#0a0a0a", border:"1px solid #2a2a2a", borderRadius:8, padding:"11px 14px", color:"#fff", fontSize:14, outline:"none" },
  select:    { background:"#0a0a0a", border:"1px solid #2a2a2a", borderRadius:8, padding:"11px 14px", color:"#fff", fontSize:14, outline:"none" },
  saveBtn:   { background:"#c9a96e", border:"none", color:"#0a0a0a", padding:"10px 24px", borderRadius:8, cursor:"pointer", fontWeight:600 },
  cancelBtn: { background:"transparent", border:"1px solid #2a2a2a", color:"#888", padding:"10px 24px", borderRadius:8, cursor:"pointer" },
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { textAlign:"left", padding:"10px 14px", fontSize:11, letterSpacing:"0.08em", color:"#666", borderBottom:"1px solid #1e1e1e" },
  td:        { padding:"12px 14px", fontSize:13, color:"#ccc", borderBottom:"1px solid #141414" },
  actionBtn: { background:"transparent", border:"1px solid #2a2a2a", color:"#888", padding:"5px 12px", borderRadius:6, cursor:"pointer", fontSize:12 },
  statsGrid: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:20 },
  bigStat:   { background:"#111", border:"1px solid #1e1e1e", borderRadius:16, padding:"28px 20px", textAlign:"center" },
  bigNum:    { fontSize:40, fontWeight:800, margin:"0 0 8px" },
  bigLabel:  { fontSize:13, color:"#666", margin:0 },
};
