import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, GoldBtn, Input, Spinner, STitle, RoleBadge } from "../UI";

export default function StaffDashboard() {
  const { user, apiCall, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [error, setError] = useState("");

  const [method, setMethod] = useState("");
  const [logs, setLogs] = useState([]);

  const [topAsin, setTopAsin] = useState("");
  const [bottomAsin, setBottomAsin] = useState("");
  const [k, setK] = useState(10);
  const [comparison, setComparison] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError("");
      try {
        const data = await apiCall(`/staff/dashboard`);
        if (!mounted) return;
        setDash(data);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Không tải được staff dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [apiCall]);

  const fetchLogs = async () => {
    setError("");
    try {
      const data = await apiCall(`/staff/recommendation-logs?method=${encodeURIComponent(method || "")}&page=1&size=30`);
      setLogs(data?.items || []);
    } catch (e) {
      setError(e.message || "Không tải được logs");
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCompare = async () => {
    setError("");
    if (!topAsin || !bottomAsin) {
      setError("Chọn top_asin và bottom_asin để so sánh.");
      return;
    }
    setRecLoading(true);
    try {
      const data = await apiCall(`/recommend/compare`, {
        method: "POST",
        body: JSON.stringify({ top_asin: topAsin, bottom_asin: bottomAsin, k }),
      });
      setComparison(data);
    } catch (e) {
      setError(e.message || "So sánh thất bại");
    } finally {
      setRecLoading(false);
    }
  };

  return (
    <div style={{ color: "#2a1a00" }}>
      <header style={H.nav}>
        <div style={H.left}>
          <span style={H.logo}>✦ STYLEAI</span>
          <RoleBadge role={user?.role || "staff"} />
          <span style={H.title}>Staff — Dashboard</span>
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
          <STitle>Overview</STitle>
          {error && <div style={H.error}>⚠ {error}</div>}

          {loading ? (
            <div style={{ color: "#5a4723" }}>
              Đang tải... <Spinner size={18} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Card>
                <div style={K.h}>Avg latency</div>
                <div style={K.v}>{dash?.avg_latency_ms ?? 0} ms</div>
              </Card>
              <Card>
                <div style={K.h}>Total triplets</div>
                <div style={K.v}>{dash?.total_triplets ?? 0}</div>
              </Card>
              <Card>
                <div style={K.h}>Products by cat</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {Object.entries(dash?.product_counts || {}).map(([cat, cnt]) => (
                    <div key={cat} style={{ display: "flex", justifyContent: "space-between", color: "#5a4723", fontSize: 13 }}>
                      <span style={{ color: "#3b2b11" }}>{cat}</span>
                      <span style={{ color: "#c9a96e", fontWeight: 800 }}>{cnt}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          <div style={{ height: 18 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={K.h}>So sánh methods (Staff/Admin)</div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Input label="top_asin" value={topAsin} onChange={(e) => setTopAsin(e.target.value)} />
                  <Input label="bottom_asin" value={bottomAsin} onChange={(e) => setBottomAsin(e.target.value)} />
                </div>
                <div style={{ height: 12 }} />
                <Input label="k" type="number" min={1} max={50} value={k} onChange={(e) => setK(parseInt(e.target.value || "10", 10))} />

                <div style={{ height: 14 }} />
                <GoldBtn onClick={runCompare} loading={recLoading} disabled={recLoading}>
                  So sánh
                </GoldBtn>
              </div>

              {comparison && (
                <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {Object.entries(comparison).map(([methodName, payload]) => (
                    <div key={methodName} style={C.methodBox}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#5a4723" }}>
                        <div style={{ fontWeight: 800 }}>{methodName}</div>
                        <div style={{ color: "#3b2b11", fontSize: 12 }}>latency: {payload.latency_ms} ms</div>
                      </div>
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(payload.results || []).map((r) => (
                          <span key={r.asin} style={C.chip}>
                            #{r.rank} {r.asin}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div style={K.h}>Recommendation logs</div>
              <div style={{ marginTop: 12 }}>
                <Input label="Filter method (optional)" value={method} onChange={(e) => setMethod(e.target.value)} />
                <div style={{ height: 12 }} />
                <GoldBtn onClick={fetchLogs} disabled={!method}>
                  Tải logs
                </GoldBtn>

                <div style={{ marginTop: 14 }}>
                  {logs.length === 0 ? (
                    <div style={{ color: "#5a4723" }}>Chưa có logs</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, maxHeight: 420, overflowY: "auto" }}>
                      {logs.map((l) => (
                        <div key={l.id} style={C.logRow}>
                          <div style={{ minWidth: 60, color: "#c9a96e", fontWeight: 800 }}>{l.method}</div>
                          <div style={{ color: "#3b2b11", fontSize: 12 }}>k={l.k}</div>
                          <div style={{ color: "#5a4723", fontSize: 12 }}>latency={l.latency_ms}ms</div>
                          <div style={{ color: "#6b5937", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            top={l.top_asin} bottom={l.bottom_asin}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
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

const K = {
  h: { fontSize: 12, letterSpacing: ".08em", color: "#c9a96e", fontWeight: 800, marginBottom: 8 },
  v: { fontSize: 34, fontWeight: 900, color: "#2a1a00" },
};

const C = {
  methodBox: { border: "1px solid #e1c789", background: "#fff4b0", borderRadius: 14, padding: 14 },
  chip: { border: "1px solid #e1c789", background: "#fff4b0", color: "#5a4723", borderRadius: 999, padding: "6px 10px", fontSize: 12 },
  logRow: { border: "1px solid #e1c789", background: "#fff4b0", borderRadius: 12, padding: 12, display: "flex", gap: 12, alignItems: "center" },
};

