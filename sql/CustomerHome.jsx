import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000/api";

export default function CustomerHome() {
  const { user, logout, apiCall } = useAuth();
  const [tops,    setTops]    = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [selectedTop,    setSelectedTop]    = useState(null);
  const [selectedBottom, setSelectedBottom] = useState(null);
  const [method,    setMethod]    = useState("clip_vgg_hybrid");
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [step,      setStep]      = useState(1); // 1=select, 2=results

  useEffect(() => {
    fetch(`${API}/products/by-category/Tops?limit=20&has_features=true`)
      .then(r => r.json()).then(setTops);
    fetch(`${API}/products/by-category/Bottoms?limit=20&has_features=true`)
      .then(r => r.json()).then(setBottoms);
  }, []);

  const handleRecommend = async () => {
    if (!selectedTop || !selectedBottom) return;
    setLoading(true);
    const data = await apiCall("/recommend/", {
      method: "POST",
      body: JSON.stringify({
        top_asin: selectedTop.asin,
        bottom_asin: selectedBottom.asin,
        method, k: 10
      })
    });
    setResults(data?.results || []);
    setStep(2);
    setLoading(false);
  };

  return (
    <div style={S.root}>
      {/* Navbar */}
      <nav style={S.nav}>
        <span style={S.navLogo}>✦ STYLEAI</span>
        <div style={S.navRight}>
          <span style={S.navUser}>👤 {user?.full_name}</span>
          <button onClick={logout} style={S.navBtn}>Đăng xuất</button>
        </div>
      </nav>

      <div style={S.content}>
        {step === 1 ? (
          <>
            <div style={S.pageHeader}>
              <p style={S.pageLabel}>BƯỚC 1 — CHỌN OUTFIT</p>
              <h1 style={S.pageTitle}>Chọn áo và quần/váy</h1>
              <p style={S.pageSub}>Hệ thống sẽ gợi ý giày phù hợp nhất dựa trên AI</p>
            </div>

            <div style={S.twoCol}>
              <ProductPicker
                title="Chọn Áo (Top)"
                products={tops}
                selected={selectedTop}
                onSelect={setSelectedTop}
              />
              <ProductPicker
                title="Chọn Quần/Váy (Bottom)"
                products={bottoms}
                selected={selectedBottom}
                onSelect={setSelectedBottom}
              />
            </div>

            {/* Method selector */}
            <div style={S.methodBox}>
              <p style={S.methodLabel}>THUẬT TOÁN GỢI Ý</p>
              <div style={S.methodRow}>
                {[
                  ["clip_vgg_hybrid", "CLIP + VGG Hybrid", "Kết hợp cả 2 luồng thị giác"],
                  ["clip_only",       "CLIP Only",         "Chỉ dùng CLIP embedding"],
                  ["vgg_only",        "VGG Only",          "Chỉ dùng VGG features"],
                ].map(([val, label, desc]) => (
                  <button
                    key={val}
                    style={{...S.methodBtn, ...(method===val ? S.methodBtnActive : {})}}
                    onClick={() => setMethod(val)}
                  >
                    <span style={S.methodName}>{label}</span>
                    <span style={S.methodDesc}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRecommend}
              disabled={!selectedTop || !selectedBottom || loading}
              style={{...S.mainBtn, opacity: (!selectedTop||!selectedBottom) ? 0.4 : 1}}
            >
              {loading ? "Đang xử lý..." : "✨ GỢI Ý GIÀY PHÙ HỢP →"}
            </button>
          </>
        ) : (
          <>
            <div style={S.pageHeader}>
              <p style={S.pageLabel}>BƯỚC 2 — KẾT QUẢ GỢI Ý</p>
              <h1 style={S.pageTitle}>Top {results.length} Giày Phù Hợp</h1>
              <p style={S.pageSub}>Phương pháp: <strong style={{color:"#c9a96e"}}>{method}</strong></p>
            </div>

            {/* Selected outfit summary */}
            <div style={S.outfitSummary}>
              <OutfitCard label="Áo" product={selectedTop} />
              <span style={S.plus}>+</span>
              <OutfitCard label="Quần/Váy" product={selectedBottom} />
              <span style={S.arrow}>→</span>
              <div style={S.resultCount}>
                <span style={S.resultCountNum}>{results.length}</span>
                <span style={S.resultCountLabel}>gợi ý</span>
              </div>
            </div>

            {/* Results grid */}
            <div style={S.resultsGrid}>
              {results.map((r, i) => (
                <div key={r.asin} style={S.resultCard}>
                  <div style={S.rankBadge}>#{r.rank}</div>
                  <div style={S.productImg}>
                    {r.img_url
                      ? <img src={r.img_url} alt={r.title} style={S.img} onError={e=>e.target.style.display='none'}/>
                      : <div style={S.imgPlaceholder}>👟</div>
                    }
                  </div>
                  <div style={S.productInfo}>
                    <p style={S.productTitle} title={r.title}>
                      {r.title?.substring(0, 60)}{r.title?.length > 60 ? "..." : ""}
                    </p>
                    <p style={S.productBrand}>{r.brand || "—"}</p>
                    {r.price && <p style={S.productPrice}>${r.price.toFixed(2)}</p>}
                    <div style={S.scoreBar}>
                      <div style={{...S.scoreFill, width: `${Math.min(r.score * 100, 100)}%`}} />
                    </div>
                    <p style={S.scoreLabel}>Score: {r.score.toFixed(4)}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => { setStep(1); setResults([]); }} style={S.backBtn}>
              ← Chọn lại outfit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ProductPicker({ title, products, selected, onSelect }) {
  return (
    <div style={S.pickerBox}>
      <p style={S.pickerTitle}>{title}</p>
      <div style={S.pickerGrid}>
        {products.map(p => (
          <button
            key={p.asin}
            onClick={() => onSelect(p)}
            style={{...S.pickerCard, ...(selected?.asin===p.asin ? S.pickerCardActive : {})}}
          >
            <div style={S.pickerImgBox}>
              {p.img_url
                ? <img src={p.img_url} alt={p.title} style={S.pickerImg} onError={e=>e.target.style.display='none'}/>
                : <span style={{fontSize:28}}>👕</span>
              }
            </div>
            <p style={S.pickerLabel}>{p.title?.substring(0,40)}...</p>
          </button>
        ))}
      </div>
      {selected && (
        <div style={S.selectedTag}>
          ✓ Đã chọn: {selected.title?.substring(0,30)}...
        </div>
      )}
    </div>
  );
}

function OutfitCard({ label, product }) {
  return (
    <div style={S.outfitCard}>
      <p style={S.outfitLabel}>{label}</p>
      {product?.img_url
        ? <img src={product.img_url} alt="" style={S.outfitImg} onError={e=>e.target.style.display='none'}/>
        : <div style={S.outfitPlaceholder}>👕</div>
      }
      <p style={S.outfitName}>{product?.title?.substring(0,25)}...</p>
    </div>
  );
}

const S = {
  root: { minHeight:"100vh", background:"#0a0a0a", color:"#fff", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  nav:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 40px", borderBottom:"1px solid #1a1a1a" },
  navLogo:  { fontWeight:800, letterSpacing:"0.2em", color:"#c9a96e" },
  navRight: { display:"flex", alignItems:"center", gap:20 },
  navUser:  { color:"#888", fontSize:14 },
  navBtn:   { background:"transparent", border:"1px solid #2a2a2a", color:"#888", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:13 },
  content:  { maxWidth:1200, margin:"0 auto", padding:"40px 40px 80px" },
  pageHeader: { textAlign:"center", marginBottom:48 },
  pageLabel: { fontSize:11, letterSpacing:"0.2em", color:"#c9a96e", marginBottom:12 },
  pageTitle: { fontSize:36, fontWeight:800, margin:"0 0 12px" },
  pageSub:   { color:"#888", fontSize:15 },
  twoCol: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginBottom:40 },
  pickerBox:   { background:"#111", border:"1px solid #1e1e1e", borderRadius:16, padding:24 },
  pickerTitle: { fontSize:12, letterSpacing:"0.1em", color:"#c9a96e", marginBottom:16 },
  pickerGrid:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, maxHeight:300, overflowY:"auto" },
  pickerCard:  { background:"#0a0a0a", border:"1px solid #1e1e1e", borderRadius:10, padding:10, cursor:"pointer", textAlign:"center", transition:"all 0.15s" },
  pickerCardActive: { border:"1px solid #c9a96e", background:"#1a1400" },
  pickerImgBox: { height:70, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6 },
  pickerImg: { maxHeight:70, maxWidth:"100%", objectFit:"contain" },
  pickerLabel: { fontSize:10, color:"#888", margin:0, lineHeight:1.3 },
  selectedTag: { marginTop:12, background:"#1a1400", border:"1px solid #c9a96e", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#c9a96e" },
  methodBox: { background:"#111", border:"1px solid #1e1e1e", borderRadius:16, padding:24, marginBottom:32 },
  methodLabel: { fontSize:11, letterSpacing:"0.15em", color:"#888", marginBottom:16 },
  methodRow: { display:"flex", gap:12 },
  methodBtn: { flex:1, background:"#0a0a0a", border:"1px solid #1e1e1e", borderRadius:10, padding:"14px 16px", cursor:"pointer", textAlign:"left", color:"#fff", transition:"all 0.15s" },
  methodBtnActive: { border:"1px solid #c9a96e", background:"#1a1400" },
  methodName: { display:"block", fontSize:13, fontWeight:600, marginBottom:4, color:"#fff" },
  methodDesc: { display:"block", fontSize:11, color:"#666" },
  mainBtn: { display:"block", width:"100%", background:"#c9a96e", border:"none", borderRadius:12, padding:"18px", color:"#0a0a0a", fontSize:15, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer" },
  outfitSummary: { display:"flex", alignItems:"center", gap:20, background:"#111", border:"1px solid #1e1e1e", borderRadius:16, padding:24, marginBottom:40 },
  outfitCard: { textAlign:"center" },
  outfitLabel: { fontSize:10, color:"#c9a96e", letterSpacing:"0.1em", marginBottom:8 },
  outfitImg: { height:80, objectFit:"contain" },
  outfitPlaceholder: { fontSize:40 },
  outfitName: { fontSize:11, color:"#888", margin:"8px 0 0" },
  plus:  { fontSize:28, color:"#333" },
  arrow: { fontSize:28, color:"#c9a96e", flex:1, textAlign:"center" },
  resultCount: { textAlign:"center" },
  resultCountNum:   { display:"block", fontSize:48, fontWeight:800, color:"#c9a96e" },
  resultCountLabel: { display:"block", fontSize:12, color:"#888" },
  resultsGrid: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:20, marginBottom:40 },
  resultCard: { background:"#111", border:"1px solid #1e1e1e", borderRadius:14, overflow:"hidden", position:"relative" },
  rankBadge: { position:"absolute", top:10, left:10, background:"#c9a96e", color:"#0a0a0a", fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20 },
  productImg: { height:160, display:"flex", alignItems:"center", justifyContent:"center", background:"#0a0a0a" },
  img: { maxHeight:160, maxWidth:"100%", objectFit:"contain" },
  imgPlaceholder: { fontSize:48 },
  productInfo: { padding:14 },
  productTitle: { fontSize:12, margin:"0 0 4px", lineHeight:1.4, color:"#ddd" },
  productBrand: { fontSize:11, color:"#666", margin:"0 0 6px" },
  productPrice: { fontSize:14, fontWeight:700, color:"#c9a96e", margin:"0 0 10px" },
  scoreBar: { height:3, background:"#1e1e1e", borderRadius:2, marginBottom:4 },
  scoreFill: { height:"100%", background:"#c9a96e", borderRadius:2, transition:"width 0.5s" },
  scoreLabel: { fontSize:10, color:"#555", margin:0 },
  backBtn: { background:"transparent", border:"1px solid #2a2a2a", color:"#888", padding:"12px 24px", borderRadius:10, cursor:"pointer", fontSize:14 },
};
