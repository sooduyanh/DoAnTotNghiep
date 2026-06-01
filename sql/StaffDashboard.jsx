import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function StaffDashboard() {
  const { user, logout, apiCall } = useAuth();
  const [tab, setTab]           = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [evalResults, setEvalResults] = useState([]);
  const [logs, setLogs]         = useState([]);
  const [version, setVersion]   = useState("v2");

  useEffect(() => {
    apiCall("/staff/dashboard").then(setDashboard);
  }, []);

  useEffect(() => {
    if (tab === "metrics") {
      apiCall(`/staff/evaluation-results?version=${version}`).then(setEvalResults);
    }
    if (tab === "logs") {
      apiCall("/staff/recommendation-logs?size=50").then(d => setLogs(d?.items || []));
    }
  }, [tab, version]);

  const TABS = [
    { id: "overview", label: "📊 Tổng quan" },
    { id: "metrics",  label: "📈 Kết quả Đánh giá" },
    { id: "logs",     label: "📋 Lịch sử Gợi ý" },
  ];

  return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <span style={S.logo}>✦ STYLEAI</span>
          <span style={S.navRole}>STAFF DASHBOARD</span>
        </div>
        <div style={S.navRight}>
          <span style={S.navUser}>{user?.full_name}</span>
          <button onClick={logout} style={S.logoutBtn}>Đăng xuất</button>
        </div>
      </nav>

      <div style={S.layout}>
        {/* Sidebar */}
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

        {/* Main */}
        <main style={S.main}>
          {tab === "overview" && dashboard && (
            <Overview data={dashboard} />
          )}
          {tab === "metrics" && (
            <Metrics results={evalResults} version={version} onVersionChange={setVersion} />
          )}
          {tab === "logs" && (
            <Logs items={logs} />
          )}
        </main>
      </div>
    </div>
  );
}

function Overview({ data }) {
  const cards = [
    { label: "Tổng Triplets",    value: data.total_triplets?.toLocaleString(), color: "#c9a96e" },
    { label: "Latency TB",       value: `${data.avg_latency_ms}ms`,            color: "#61afef" },
    { label: "Sản phẩm Tops",    value: data.product_counts?.Tops,             color: "#98c379" },
    { label: "Sản phẩm Bottoms", value: data.product_counts?.Bottoms,          color: "#e5c07b" },
    { label: "Sản phẩm Shoes",   value: data.product_counts?.Shoes,            color: "#c678dd" },
  ];
  return (
    <div>
      <h2 style={S.sectionTitle}>Tổng quan Hệ thống</h2>
      <div style={S.statGrid}>
        {cards.map(c => (
          <div key={c.label} style={S.statCard}>
            <p style={{...S.statValue, color: c.color}}>{c.value ?? "—"}</p>
            <p style={S.statLabel}>{c.label}</p>
          </div>
        ))}
      </div>
      <div style={S.methodUsageBox}>
        <p style={S.boxTitle}>Lượt sử dụng theo Method</p>
        {Object.entries(data.method_usage || {}).map(([method, count]) => (
          <div key={method} style={S.methodRow}>
            <span style={S.methodName}>{method}</span>
            <div style={S.barTrack}>
              <div style={{
                ...S.barFill,
                width: `${Math.min(count / Math.max(...Object.values(data.method_usage)) * 100, 100)}%`
              }} />
            </div>
            <span style={S.methodCount}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metrics({ results, version, onVersionChange }) {
  const methods = [...new Set(results.map(r => r.method))];
  const ks      = [10, 15, 20];

  const getVal = (method, k, metric) => {
    const row = results.find(r => r.method === method && r.k === k);
    return row ? `${row[metric]}%` : "—";
  };

  return (
    <div>
      <div style={S.metricsHeader}>
        <h2 style={S.sectionTitle}>Kết quả Đánh giá</h2>
        <div style={S.versionToggle}>
          {["v1","v2"].map(v => (
            <button
              key={v}
              onClick={() => onVersionChange(v)}
              style={{...S.vBtn, ...(version===v ? S.vBtnActive : {})}}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {["accuracy_k", "precision_k", "recall_k"].map(metric => (
        <div key={metric} style={S.tableBox}>
          <p style={S.tableTitle}>
            {metric === "accuracy_k"  ? "🎯 ACCURACY@K (Hit Rate)" :
             metric === "precision_k" ? "🔍 PRECISION@K" : "📡 RECALL@K"}
          </p>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Method</th>
                {ks.map(k => <th key={k} style={S.th}>k={k}</th>)}
              </tr>
            </thead>
            <tbody>
              {methods.map((method, i) => (
                <tr key={method} style={{background: i%2===0 ? "#111" : "#0f0f0f"}}>
                  <td style={S.td}>{method}</td>
                  {ks.map(k => (
                    <td key={k} style={{...S.td, color:"#c9a96e", fontWeight:600}}>
                      {getVal(method, k, metric)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Logs({ items }) {
  return (
    <div>
      <h2 style={S.sectionTitle}>Lịch sử Gợi ý</h2>
      <table style={S.table}>
        <thead>
          <tr>
            {["ID","User","Top","Bottom","Method","K","Latency","Thời gian"].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((l, i) => (
            <tr key={l.id} style={{background: i%2===0 ? "#111" : "#0f0f0f"}}>
              <td style={S.td}>{l.id}</td>
              <td style={S.td}>{l.user_id ?? "—"}</td>
              <td style={{...S.td, fontFamily:"monospace", fontSize:11}}>{l.top_asin}</td>
              <td style={{...S.td, fontFamily:"monospace", fontSize:11}}>{l.bottom_asin}</td>
              <td style={{...S.td, color:"#c9a96e"}}>{l.method}</td>
              <td style={S.td}>{l.k}</td>
              <td style={S.td}>{l.latency_ms}ms</td>
              <td style={{...S.td, fontSize:11, color:"#666"}}>
                {new Date(l.created_at).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const S = {
  root:    { minHeight:"100vh", background:"#0a0a0a", color:"#fff", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  nav:     { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 32px", borderBottom:"1px solid #1a1a1a" },
  navLeft: { display:"flex", alignItems:"center", gap:20 },
  logo:    { fontWeight:800, letterSpacing:"0.2em", color:"#c9a96e" },
  navRole: { fontSize:11, letterSpacing:"0.15em", color:"#444", background:"#1a1a1a", padding:"4px 10px", borderRadius:4 },
  navRight:  { display:"flex", alignItems:"center", gap:16 },
  navUser:   { fontSize:14, color:"#888" },
  logoutBtn: { background:"transparent", border:"1px solid #2a2a2a", color:"#888", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:13 },
  layout:  { display:"flex", minHeight:"calc(100vh - 57px)" },
  sidebar: { width:220, borderRight:"1px solid #1a1a1a", padding:"24px 16px", display:"flex", flexDirection:"column", gap:6 },
  sideBtn: { background:"transparent", border:"none", color:"#888", padding:"11px 14px", borderRadius:8, cursor:"pointer", textAlign:"left", fontSize:14, transition:"all 0.15s" },
  sideBtnActive: { background:"#1a1400", color:"#c9a96e", fontWeight:600 },
  main:    { flex:1, padding:"36px 40px", overflowX:"auto" },
  sectionTitle: { fontSize:22, fontWeight:700, marginBottom:28, margin:"0 0 28px" },
  statGrid: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16, marginBottom:32 },
  statCard: { background:"#111", border:"1px solid #1e1e1e", borderRadius:14, padding:"20px 16px", textAlign:"center" },
  statValue: { fontSize:28, fontWeight:800, margin:"0 0 6px" },
  statLabel: { fontSize:12, color:"#666", margin:0 },
  methodUsageBox: { background:"#111", border:"1px solid #1e1e1e", borderRadius:14, padding:24 },
  boxTitle:    { fontSize:12, letterSpacing:"0.1em", color:"#888", marginBottom:20 },
  methodRow:   { display:"flex", alignItems:"center", gap:16, marginBottom:14 },
  methodName:  { width:200, fontSize:13, color:"#ddd" },
  barTrack:    { flex:1, height:6, background:"#1e1e1e", borderRadius:3 },
  barFill:     { height:"100%", background:"#c9a96e", borderRadius:3, transition:"width 0.5s" },
  methodCount: { width:40, textAlign:"right", fontSize:13, color:"#c9a96e", fontWeight:600 },
  metricsHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 },
  versionToggle: { display:"flex", gap:8 },
  vBtn:       { background:"transparent", border:"1px solid #2a2a2a", color:"#888", padding:"6px 16px", borderRadius:6, cursor:"pointer", fontSize:13 },
  vBtnActive: { background:"#1a1400", border:"1px solid #c9a96e", color:"#c9a96e" },
  tableBox:  { background:"#111", border:"1px solid #1e1e1e", borderRadius:14, padding:24, marginBottom:24 },
  tableTitle:{ fontSize:12, letterSpacing:"0.1em", color:"#888", marginBottom:16 },
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { textAlign:"left", padding:"10px 14px", fontSize:11, letterSpacing:"0.08em", color:"#666", borderBottom:"1px solid #1e1e1e" },
  td:        { padding:"12px 14px", fontSize:13, color:"#ccc", borderBottom:"1px solid #141414" },
};
