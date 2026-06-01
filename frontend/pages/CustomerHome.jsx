import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, GoldBtn, Spinner, STitle, Toast, RoleBadge } from "../UI";
import ANH_GIAY_FILES from "../src/anhGiayPool";

const API_METHODS = [
  { id: "clip_only", label: "CLIP only" },
  { id: "vgg_only", label: "VGG only" },
  { id: "clip_vgg_hybrid", label: "Weighted RRF (CLIP + VGG)" },
];

const CAT_TOP = "Tops";
const CAT_BOTTOM = "Bottoms";
const RECOMMEND_PATH = `/api/recommend/`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function CustomerHome() {
  const { user, apiCall, logout } = useAuth();

  const [method, setMethod] = useState("clip_vgg_hybrid");
  const [topAsin, setTopAsin] = useState("");
  const [bottomAsin, setBottomAsin] = useState("");
  const [k, setK] = useState(10);

  // paging to ensure >= 100 items per type (Tops + Bottoms)
  const [topPage, setTopPage] = useState(1);
  const [bottomPage, setBottomPage] = useState(1);
  const [pageSize] = useState(20);

  const [topsTotal, setTopsTotal] = useState(0);
  const [bottomsTotal, setBottomsTotal] = useState(0);

  const [tops, setTops] = useState([]);
  const [bottoms, setBottoms] = useState([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTops, setLoadingTops] = useState(false);
  const [loadingBottoms, setLoadingBottoms] = useState(false);

  const [loadingRec, setLoadingRec] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [results, setResults] = useState([]);
  const [shoePool, setShoePool] = useState([]);
  const [displayedShoes, setDisplayedShoes] = useState([]);

  const badge = useMemo(() => (user?.role ? user.role : "customer"), [user?.role]);

  // backend /products doesn't provide total for by-category endpoint.
  // We still implement paging UI (Next/Prev) by requesting successive pages.
  // To avoid huge dropdown, the goal is just: show + select >= 100 by browsing.
  // If you have total count later, we can compute it precisely.
  const fetchPage = async (category, page) => {
    // Backend: GET /api/products/?category=...&page=...&size=...
    // Returns { total, page, size, items }
    return apiCall(
      `/products/?category=${encodeURIComponent(category)}&page=${page}&size=${pageSize}`
    );
  };


  useEffect(() => {
    let mounted = true;

    (async () => {
      setError("");
      setLoadingInit(true);
      try {
        const [topsResp, bottomsResp] = await Promise.all([
          fetchPage(CAT_TOP, 1),
          fetchPage(CAT_BOTTOM, 1),
        ]);

        if (!mounted) return;
        setTops(Array.isArray(topsResp?.items) ? topsResp.items : []);
        setBottoms(Array.isArray(bottomsResp?.items) ? bottomsResp.items : []);

          setTopsTotal(topsResp?.total ?? 0);
        setBottomsTotal(bottomsResp?.total ?? 0);

        // Load shoe pool from local static list (images should be placed in public/anh_giay)
        const localPool = ANH_GIAY_FILES.map((it, i) => ({
          asin: `LOCAL-${i}-${it.file}`,
          title: it.title || it.file,
          brand: "",
          price: null,
          img_url: `/anh_giay/${it.file}`,
        }));
        setShoePool(localPool);

      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Không tải được danh sách áo/quần");
      } finally {
        if (mounted) setLoadingInit(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiCall, pageSize]);

  const refetchTops = async (p) => {
    setLoadingTops(true);
    try {
      const resp = await fetchPage(CAT_TOP, p);
      setTops(Array.isArray(resp?.items) ? resp.items : []);
      setTopsTotal(typeof resp?.total === "number" ? resp.total : 0);
    } catch (e) {
      setError(e.message || "Không tải được Tops");
    } finally {
      setLoadingTops(false);
    }
  };


  const refetchBottoms = async (p) => {
    setLoadingBottoms(true);
    try {
      const resp = await fetchPage(CAT_BOTTOM, p);
      setBottoms(Array.isArray(resp?.items) ? resp.items : []);
      setBottomsTotal(typeof resp?.total === "number" ? resp.total : 0);
    } catch (e) {
      setError(e.message || "Không tải được Bottoms");
    } finally {
      setLoadingBottoms(false);
    }
  };


  const handleRecommend = async () => {
    setError("");
    setToast("");

    if (!topAsin || !bottomAsin) {
      setError("Chọn Top ASIN (Áo) và Bottom ASIN (Quần) trước khi gợi ý.");
      return;
    }

    setLoadingRec(true);
    try {
      const data = await apiCall(`/recommend/`, {
        method: "POST",
        body: JSON.stringify({ top_asin: topAsin, bottom_asin: bottomAsin, method, k }),
      });

      setResults(data?.results || []);
      // Set displayed shoes: prefer shoePool (first 10), otherwise use backend results
      if (Array.isArray(shoePool) && shoePool.length > 0) {
        setDisplayedShoes(shoePool.slice(0, Math.min(10, shoePool.length)));
      } else {
        setDisplayedShoes((data?.results || []).slice(0, 10));
      }
      setToast("Gợi ý thành công!");
    } catch (e) {
      setError(e.message || "Gợi ý thất bại");
    } finally {
      setLoadingRec(false);
    }
  };

  const maxTopPage = topsTotal ? Math.ceil(topsTotal / pageSize) : 6; // fallback
  const maxBottomPage = bottomsTotal ? Math.ceil(bottomsTotal / pageSize) : 6; // fallback

  // When shoePool is loaded, set default displayedShoes to first 10 items.
  useEffect(() => {
    if (Array.isArray(shoePool) && shoePool.length > 0) {
      // pick 10 random unique items from the pool
      const pool = [...shoePool];
      const picked = [];
      const take = Math.min(10, pool.length);
      for (let i = 0; i < take; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
      }
      setDisplayedShoes(picked);
    }
  }, [shoePool]);

  return (
    <div style={{ color: "#2a1a00" }}>
      <header style={H.nav}>
        <div style={H.left}>
          <span style={H.logo}>✦ STYLEAI</span>
          <RoleBadge role={badge} />
          <span style={H.title}>Customer — Gợi ý thời trang</span>
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
          <STitle>Chọn Top (Áo) + Bottom (Quần)</STitle>

          {error && <div style={H.error}>⚠ {error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {/* TOPS */}
            <Card>
              <div style={Sel.titleRow}>
                <div style={Sel.title}>Top (Áo)</div>
                <div style={Sel.chosen}>Chọn: {topAsin ? topAsin : "—"}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <button
                  style={Sel.pageBtn}
                  disabled={loadingTops || topPage <= 1}
                  onClick={() => {
                    const p = clamp(topPage - 1, 1, maxTopPage);
                    setTopPage(p);
                    refetchTops(p);
                  }}
                >
                  Prev
                </button>
                <div style={Sel.pageText}>Page {topPage}/{maxTopPage}</div>
                <button
                  style={Sel.pageBtn}
                  disabled={loadingTops || topPage >= maxTopPage}
                  onClick={() => {
                    const p = clamp(topPage + 1, 1, maxTopPage);
                    setTopPage(p);
                    refetchTops(p);
                  }}
                >
                  Next
                </button>
              </div>

              <div style={{ height: 10 }} />

              {(loadingInit || loadingTops) ? (
                <div style={{ color: "#5a4723" }}>
                  Đang tải Tops... <Spinner size={18} />
                </div>
              ) : (
                <div style={Sel.grid}>
                  {tops.map((p) => (
                    <button
                      key={p.asin}
                      style={{
                        ...Sel.itemBtn,
                        ...(p.asin === topAsin ? Sel.itemBtnActive : {}),
                      }}
                      onClick={() => {
                        setTopAsin(p.asin);
                      }}
                    >
                      <img
                        src={p.img_url}
                        alt={p.title}
                        style={Sel.img}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <div style={Sel.itemText}>{p.title?.slice(0, 24) || p.asin}</div>
                    </button>
                  ))}
                </div>
              )}

              
            </Card>

            {/* BOTTOMS */}
            <Card>
              <div style={Sel.titleRow}>
                <div style={Sel.title}>Bottom (Quần)</div>
                <div style={Sel.chosen}>Chọn: {bottomAsin ? bottomAsin : "—"}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <button
                  style={Sel.pageBtn}
                  disabled={loadingBottoms || bottomPage <= 1}
                  onClick={() => {
                    const p = clamp(bottomPage - 1, 1, maxBottomPage);
                    setBottomPage(p);
                    refetchBottoms(p);
                  }}
                >
                  Prev
                </button>
                <div style={Sel.pageText}>Page {bottomPage}/{maxBottomPage}</div>
                <button
                  style={Sel.pageBtn}
                  disabled={loadingBottoms || bottomPage >= maxBottomPage}
                  onClick={() => {
                    const p = clamp(bottomPage + 1, 1, maxBottomPage);
                    setBottomPage(p);
                    refetchBottoms(p);
                  }}
                >
                  Next
                </button>
              </div>

              <div style={{ height: 10 }} />

              {(loadingInit || loadingBottoms) ? (
                <div style={{ color: "#5a4723" }}>
                  Đang tải Bottoms... <Spinner size={18} />
                </div>
              ) : (
                <div style={Sel.grid}>
                  {bottoms.map((p) => (
                    <button
                      key={p.asin}
                      style={{
                        ...Sel.itemBtn,
                        ...(p.asin === bottomAsin ? Sel.itemBtnActive : {}),
                      }}
                      onClick={() => {
                        setBottomAsin(p.asin);
                      }}
                    >
                      <img
                        src={p.img_url}
                        alt={p.title}
                        style={Sel.img}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <div style={Sel.itemText}>{p.title?.slice(0, 24) || p.asin}</div>
                    </button>
                  ))}
                </div>
              )}

              
            </Card>

            {/* CONFIG + RECOMMEND */}
            <Card>
              <div style={Sel.title}>Cấu hình & Gợi ý giày</div>

              <div style={{ height: 12 }} />

              <label style={Sel.label}>Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={Sel.select}
              >
                {API_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <div style={{ height: 12 }} />

              <label style={Sel.label}>k (Top K)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={k}
                onChange={(e) => setK(parseInt(e.target.value || "10", 10))}
                style={Sel.input}
              />

              <div style={{ height: 16 }} />

              <GoldBtn onClick={handleRecommend} disabled={loadingInit || loadingRec || !topAsin || !bottomAsin} loading={loadingRec}>
                {loadingRec ? "Đang gợi ý..." : "Gợi ý giày"}
              </GoldBtn>

              <div style={{ height: 22 }} />

              <div>
                <p style={T.kv}>Results</p>
                <div style={{ color: "#5a4723", fontSize: 12, marginTop: 6 }}>
                  Gọi backend thật: <code style={{ color: "#c9a96e" }}>/api/recommend</code>
                </div>
              </div>
            </Card>
          </div>

          <div style={{ height: 18 }} />

          <Card>
            {loadingInit ? (
              <div style={{ marginTop: 20, color: "#5a4723" }}>Chờ tải danh sách...</div>
            ) : results.length === 0 ? (
              <div style={{ marginTop: 20, color: "#5a4723" }}>
                Chưa có kết quả. Chọn Top/Bottom rồi bấm Gợi ý.
              </div>
            ) : (
              <div style={Res.grid}>
                {displayedShoes.map((r, idx) => (
                  <div key={r.asin || idx} style={Res.item}>
                    <div style={Res.rank}>#{idx + 1}</div>
                    <img
                      src={r.img_url}
                      alt={r.title}
                      style={Res.img}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <div style={Res.meta}>
                      <div style={Res.title}>{r.title || r.asin}</div>
                      <div style={Res.brand}>{r.brand}</div>
                      <div style={Res.price}>{r.price ? `${r.price}` : "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Toast msg={toast} onClose={() => setToast("")} />
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

const T = {
  kv: { fontSize: 14, color: "#c9a96e", letterSpacing: ".08em", fontWeight: 700, marginBottom: 6 },
};

const Sel = {
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: 900, color: "#3b2b11" },
  chosen: { fontSize: 12, color: "#3b2b11", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 },
  label: { fontSize: 11, color: "#5a4723", letterSpacing: ".05em" },
  select: { width: "100%", background: "#fff2be", border: "1px solid #d3b16a", borderRadius: 8, padding: "11px 14px", color: "#3b2b11", outline: "none" },
  input: { width: "100%", background: "#fff2be", border: "1px solid #d3b16a", borderRadius: 8, padding: "11px 14px", color: "#3b2b11", outline: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 },
  itemBtn: {
    background: "#fff4b0",
    border: "1px solid #e1c789",
    borderRadius: 14,
    padding: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  itemBtnActive: {
    borderColor: "#c9a96e",
    boxShadow: "0 0 0 1px #c9a96e55 inset",
  },
  img: { width: "100%", height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid #e1c789" },
  itemText: { marginTop: 7, fontSize: 12, color: "#5a4723", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pageBtn: {
    background: "transparent",
    border: "1px solid #d1a454",
    color: "#6b5937",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
  },
  pageText: { color: "#5a4723", fontSize: 13, fontWeight: 800 },
  hint: { marginTop: 10, color: "#6b5937", fontSize: 12 },
};

const Res = {
  grid: { marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  item: { background: "#fff4b0", border: "1px solid #e1c789", borderRadius: 14, padding: 12, display: "flex", gap: 12, alignItems: "center" },
  rank: { color: "#c9a96e", fontWeight: 800, fontSize: 12, minWidth: 36 },
  img: { width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #e1c789" },
  meta: { flex: 1 },
  title: { fontWeight: 700, fontSize: 13, lineHeight: 1.25, color: "#3b2b11", marginBottom: 4 },
  brand: { fontSize: 12, color: "#5a4723", marginBottom: 4 },
  price: { fontSize: 12, color: "#c9a96e", marginBottom: 4 },
 
};

