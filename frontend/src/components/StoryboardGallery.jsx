import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const STYLE_PRESETS = [
  { label: "仙俠動漫", value: "unified anime art style, cel shading, xianxia chinese fantasy, flowing robes, mystical atmosphere, ink wash influence, cinematic composition" },
  { label: "吉卜力", value: "studio ghibli style, soft watercolor, painterly, whimsical, warm lighting, detailed background, gentle atmosphere" },
  { label: "水墨武俠", value: "traditional chinese ink wash painting, wuxia, monochrome with red accent, calligraphic brushstroke, high contrast" },
  { label: "賽博龐克", value: "cyberpunk, neon lights, dark atmosphere, futuristic cityscape, rain reflections, high contrast, sci-fi anime" },
  { label: "漫畫風", value: "manhwa style, clean line art, high contrast, dramatic shadows, webtoon, korean comic, vibrant colors" },
  { label: "寫實風", value: "semi-realistic, cinematic lighting, detailed textures, natural colors, film photography style" },
];

// ── Tiny components ──────────────────────────────────────────────────────────

function Chip({ status }) {
  const cfg = {
    idle:       { label: "待生成", color: "var(--text-muted)",    bg: "transparent",          border: "var(--border-color)" },
    generating: { label: "生成中", color: "var(--color-cyan)",    bg: "rgba(0,242,254,0.08)", border: "rgba(0,242,254,0.3)" },
    done:       { label: "完成",   color: "var(--color-emerald)", bg: "rgba(6,214,160,0.08)", border: "rgba(6,214,160,0.3)" },
    error:      { label: "失敗",   color: "var(--color-red)",     bg: "rgba(255,0,84,0.08)",  border: "rgba(255,0,84,0.3)" },
  };
  const c = cfg[status] || cfg.idle;
  return (
    <span style={{
      fontSize: "0.6rem", padding: "2px 7px", borderRadius: "999px",
      color: c.color, background: c.bg, border: `1px solid ${c.border}`,
    }}>{c.label}</span>
  );
}

function ProgressBar({ value, color = "var(--color-cyan)" }) {
  return (
    <div style={{ height: "3px", background: "var(--bg-tertiary)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: "2px", background: color,
        width: `${value}%`, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

// ── Image tab ────────────────────────────────────────────────────────────────

function ImageTab({ novelId, mergedScenes, imageMap, setImageMap, userStyle }) {
  const [statusMap, setStatusMap] = useState({});
  const [errorMap, setErrorMap]   = useState({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress]   = useState({ done: 0, total: 0 });
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    const m = {};
    mergedScenes.forEach(s => { m[s.scene_id] = imageMap[s.scene_id] ? "done" : "idle"; });
    setStatusMap(m);
  }, [imageMap, mergedScenes]);

  const handleGenerateAll = async (force = false) => {
    setGenerating(true);
    const total = mergedScenes.length;
    setProgress({ done: 0, total });
    const smap = {};
    mergedScenes.forEach(s => { smap[s.scene_id] = "generating"; });
    setStatusMap(smap);
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_regenerate: force, style_override: userStyle || null }),
      });
      const data = await res.json();
      const newMap = { ...imageMap };
      const newSmap = { ...smap };
      data.results?.forEach((r, i) => {
        if (r.success) {
          newMap[r.scene_id] = `${API}/api/novels/${novelId}/images/${r.scene_id}?t=${Date.now()}`;
          newSmap[r.scene_id] = "done";
        } else {
          newSmap[r.scene_id] = "error";
          setErrorMap(m => ({ ...m, [r.scene_id]: r.message }));
        }
        setProgress({ done: i + 1, total });
        setImageMap({ ...newMap });
        setStatusMap({ ...newSmap });
      });
    } catch {
      mergedScenes.forEach(s => setStatusMap(m => ({ ...m, [s.scene_id]: "error" })));
    }
    setGenerating(false);
    setProgress({ done: 0, total: 0 });
  };

  const handleRegenOne = async (sid) => {
    setStatusMap(m => ({ ...m, [sid]: "generating" }));
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene_ids: [sid], force_regenerate: true, style_override: userStyle || null }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (r?.success) {
        setImageMap(m => ({ ...m, [sid]: `${API}/api/novels/${novelId}/images/${sid}?t=${Date.now()}` }));
        setStatusMap(m => ({ ...m, [sid]: "done" }));
      } else {
        setStatusMap(m => ({ ...m, [sid]: "error" }));
        setErrorMap(m => ({ ...m, [sid]: r?.message }));
      }
    } catch { setStatusMap(m => ({ ...m, [sid]: "error" })); }
  };

  const doneCount = Object.values(statusMap).filter(s => s === "done").length;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
          {doneCount}/{mergedScenes.length} 張
        </span>
        {generating && (
          <span style={{ fontSize: "0.7rem", color: "var(--color-cyan)" }}>
            生成中 {progress.done}/{progress.total}…
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          <button onClick={() => handleGenerateAll(false)} disabled={generating} style={{
            padding: "5px 14px", fontSize: "0.78rem", borderRadius: "6px", cursor: "pointer",
            background: "rgba(0,242,254,0.1)", border: "1px solid var(--color-cyan)",
            color: "var(--color-cyan)", opacity: generating ? 0.5 : 1,
          }}>⚡ 全部生成</button>
          <button onClick={() => handleGenerateAll(true)} disabled={generating} style={{
            padding: "5px 10px", fontSize: "0.72rem", borderRadius: "6px", cursor: "pointer",
            background: "transparent", border: "1px solid var(--border-color)",
            color: "var(--text-muted)", opacity: generating ? 0.5 : 1,
          }}>↻ 重新生成</button>
        </div>
      </div>

      {generating && <ProgressBar value={pct} color="linear-gradient(90deg,var(--color-cyan),var(--color-purple))" />}

      {/* grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
        {mergedScenes.map(scene => {
          const sid = scene.scene_id;
          const status = statusMap[sid] || "idle";
          const imgUrl = imageMap[sid];
          return (
            <div key={sid} className="glass-panel" style={{
              padding: 0, overflow: "hidden", cursor: "pointer",
              border: selected === sid ? "1px solid rgba(0,242,254,0.4)" : "1px solid rgba(255,255,255,0.06)",
            }} onClick={() => setSelected(selected === sid ? null : sid)}>
              <div style={{ aspectRatio: "16/9", background: "#111", position: "relative", overflow: "hidden" }}>
                {imgUrl
                  ? <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : status === "generating"
                    ? <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"var(--color-cyan)",fontSize:"0.75rem",flexDirection:"column",gap:6 }}>
                        <div className="spinner" />生成中…
                      </div>
                    : status === "error"
                      ? <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",padding:8,color:"var(--color-red)",fontSize:"0.62rem",textAlign:"center",flexDirection:"column" }}>
                          <div style={{fontSize:"1.2rem",marginBottom:4}}>⚠️</div>
                          {errorMap[sid] || "生成失敗"}
                        </div>
                      : <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"var(--text-muted)",fontSize:"0.75rem",flexDirection:"column",gap:4 }}>
                          <span style={{fontSize:"1.5rem"}}>🖼️</span>Scene {sid}
                        </div>
                }
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                  <span style={{ fontSize:"0.75rem",fontWeight:600 }}>{scene.title || `Scene ${sid}`}</span>
                  <Chip status={status} />
                </div>
                {scene.location && <p style={{ fontSize:"0.65rem",color:"var(--text-muted)",marginBottom:6 }}>📍 {scene.location}</p>}
                <div style={{ display:"flex",gap:4 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleRegenOne(sid)} disabled={status === "generating"} style={{
                    flex:1,padding:"3px 0",fontSize:"0.65rem",borderRadius:4,cursor:"pointer",
                    background:"transparent",border:"1px solid var(--border-color)",color:"var(--text-muted)",
                    opacity: status === "generating" ? 0.5 : 1,
                  }}>↻ 重新生成</button>
                  {imgUrl && <a href={imgUrl} download={`scene_${sid}.png`} style={{
                    padding:"3px 8px",fontSize:"0.65rem",borderRadius:4,
                    background:"transparent",border:"1px solid var(--border-color)",color:"var(--text-muted)",textDecoration:"none",
                  }}>↓</a>}
                </div>
              </div>
              {selected === sid && (
                <div style={{ padding:"8px 10px",borderTop:"1px solid var(--border-color)" }}>
                  <p style={{ fontSize:"0.65rem",color:"var(--text-muted)",marginBottom:4 }}>T2I Prompt：</p>
                  <p style={{ fontSize:"0.65rem",color:"var(--color-emerald)",fontFamily:"var(--font-mono)",lineHeight:1.5,wordBreak:"break-all",margin:0 }}>
                    {(scene.t2i_prompt || scene.image_prompt || "").substring(0, 300)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Video tab ────────────────────────────────────────────────────────────────

function VideoTab({ novelId, mergedScenes, imageMap }) {
  const [statusMap,  setStatusMap]  = useState({});
  const [errorMap,   setErrorMap]   = useState({});
  const [videoMap,   setVideoMap]   = useState({});
  const [generating, setGenerating] = useState(false);
  const [progress,   setProgress]   = useState({ done: 0, total: 0 });
  const [assembling, setAssembling] = useState(false);
  const [finalUrl,   setFinalUrl]   = useState(null);
  const [asmError,   setAsmError]   = useState("");
  const [preview,    setPreview]    = useState(null); // scene_id being previewed full-size

  // Load existing videos on mount
  useEffect(() => {
    if (!novelId) return;
    fetch(`${API}/api/novels/${novelId}/videos`)
      .then(r => r.json())
      .then(vids => {
        const vmap = {};
        vids.forEach(v => { vmap[v.scene_id] = `${API}/api/novels/${novelId}/videos/${v.scene_id}?t=${Date.now()}`; });
        setVideoMap(vmap);
        const smap = {};
        mergedScenes.forEach(s => { smap[s.scene_id] = vmap[s.scene_id] ? "done" : "idle"; });
        setStatusMap(smap);
      })
      .catch(() => {});
  }, [novelId, mergedScenes]);

  const handleGenerateAll = async (force = false) => {
    setGenerating(true);
    const total = mergedScenes.length;
    setProgress({ done: 0, total });
    const smap = {};
    mergedScenes.forEach(s => { smap[s.scene_id] = "generating"; });
    setStatusMap({ ...smap });

    try {
      const res = await fetch(`${API}/api/novels/${novelId}/videos/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_regenerate: force }),
      });
      const data = await res.json();
      const newVmap = { ...videoMap };
      const newSmap = { ...smap };
      data.results?.forEach((r, i) => {
        if (r.success) {
          newVmap[r.scene_id] = `${API}/api/novels/${novelId}/videos/${r.scene_id}?t=${Date.now()}`;
          newSmap[r.scene_id] = "done";
        } else {
          newSmap[r.scene_id] = "error";
          setErrorMap(m => ({ ...m, [r.scene_id]: r.message }));
        }
        setProgress({ done: i + 1, total });
        setVideoMap({ ...newVmap });
        setStatusMap({ ...newSmap });
      });
    } catch {
      mergedScenes.forEach(s => setStatusMap(m => ({ ...m, [s.scene_id]: "error" })));
    }
    setGenerating(false);
    setProgress({ done: 0, total: 0 });
  };

  const handleRegenOne = async (sid) => {
    setStatusMap(m => ({ ...m, [sid]: "generating" }));
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/videos/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene_ids: [sid], force_regenerate: true }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (r?.success) {
        setVideoMap(m => ({ ...m, [sid]: `${API}/api/novels/${novelId}/videos/${sid}?t=${Date.now()}` }));
        setStatusMap(m => ({ ...m, [sid]: "done" }));
      } else {
        setStatusMap(m => ({ ...m, [sid]: "error" }));
        setErrorMap(m => ({ ...m, [sid]: r?.message }));
      }
    } catch { setStatusMap(m => ({ ...m, [sid]: "error" })); }
  };

  const handleAssemble = async () => {
    setAssembling(true);
    setAsmError("");
    setFinalUrl(null);
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/videos/assemble`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.output_url) {
        setFinalUrl(`${API}${data.output_url}?t=${Date.now()}`);
      } else {
        setAsmError(data.detail || data.message || "組裝失敗");
      }
    } catch { setAsmError("網路錯誤"); }
    setAssembling(false);
  };

  const doneCount  = Object.values(statusMap).filter(s => s === "done").length;
  const pct        = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const allHaveImg = mergedScenes.every(s => imageMap[s.scene_id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* prerequisite warning */}
      {!allHaveImg && (
        <div style={{
          padding: "10px 14px", borderRadius: "8px",
          background: "rgba(255,183,3,0.06)", border: "1px solid rgba(255,183,3,0.2)",
          color: "var(--color-gold)", fontSize: "0.72rem",
        }}>
          ⚠️ 請先在「分鏡圖」標籤生成所有分鏡圖，才能渲染影片
        </div>
      )}

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
          {doneCount}/{mergedScenes.length} 片完成
        </span>
        {generating && (
          <span style={{ fontSize: "0.7rem", color: "var(--color-purple)" }}>
            渲染中 {progress.done}/{progress.total}…
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={() => handleGenerateAll(false)} disabled={generating || !allHaveImg} style={{
            padding: "5px 14px", fontSize: "0.78rem", borderRadius: "6px", cursor: "pointer",
            background: "rgba(157,78,221,0.12)", border: "1px solid var(--color-purple)",
            color: "var(--color-purple)", opacity: (generating || !allHaveImg) ? 0.45 : 1,
          }}>🎬 全部生成影片</button>
          <button onClick={() => handleGenerateAll(true)} disabled={generating} style={{
            padding: "5px 10px", fontSize: "0.72rem", borderRadius: "6px", cursor: "pointer",
            background: "transparent", border: "1px solid var(--border-color)",
            color: "var(--text-muted)", opacity: generating ? 0.5 : 1,
          }}>↻ 重新渲染</button>
          <button onClick={handleAssemble} disabled={assembling || doneCount === 0} style={{
            padding: "5px 14px", fontSize: "0.78rem", borderRadius: "6px", cursor: "pointer",
            background: "rgba(6,214,160,0.1)", border: "1px solid var(--color-emerald)",
            color: "var(--color-emerald)", opacity: (assembling || doneCount === 0) ? 0.45 : 1,
          }}>{assembling ? "⏳ 組裝中…" : "⚙️ 組裝完整影片"}</button>
        </div>
      </div>

      {generating && (
        <ProgressBar value={pct} color="linear-gradient(90deg,var(--color-purple),var(--color-cyan))" />
      )}

      {/* final video */}
      {(finalUrl || asmError) && (
        <div style={{
          padding: "12px 14px", borderRadius: "8px",
          background: finalUrl ? "rgba(6,214,160,0.04)" : "rgba(255,0,84,0.04)",
          border: `1px solid ${finalUrl ? "rgba(6,214,160,0.25)" : "rgba(255,0,84,0.25)"}`,
        }}>
          {finalUrl ? (
            <>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                <span style={{ fontWeight:600,fontSize:"0.82rem",color:"var(--color-emerald)" }}>🎞️ 完整影片</span>
                <a href={finalUrl} download="final.mp4" style={{
                  marginLeft:"auto",padding:"3px 10px",fontSize:"0.68rem",borderRadius:4,
                  background:"rgba(6,214,160,0.1)",border:"1px solid var(--color-emerald)",
                  color:"var(--color-emerald)",textDecoration:"none",
                }}>↓ 下載 MP4</a>
              </div>
              <video src={finalUrl} controls style={{ width:"100%",borderRadius:6,maxHeight:340,background:"#000" }} />
            </>
          ) : (
            <p style={{ fontSize:"0.72rem",color:"var(--color-red)",margin:0 }}>⚠️ {asmError}</p>
          )}
        </div>
      )}

      {/* scene grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
        {mergedScenes.map(scene => {
          const sid      = scene.scene_id;
          const status   = statusMap[sid] || "idle";
          const videoUrl = videoMap[sid];
          const imgUrl   = imageMap[sid];
          const errMsg   = errorMap[sid];
          const isPrev   = preview === sid;

          return (
            <div key={sid} className="glass-panel" style={{
              padding: 0, overflow: "hidden",
              border: isPrev ? "1px solid rgba(157,78,221,0.5)" : "1px solid rgba(255,255,255,0.06)",
              gridColumn: isPrev ? "1 / -1" : undefined,
            }}>
              {/* thumbnail / player */}
              <div style={{
                aspectRatio: isPrev ? "16/7" : "16/9",
                background: "#0a0a0a", position: "relative", overflow: "hidden",
                cursor: videoUrl ? "pointer" : "default",
              }} onClick={() => videoUrl && setPreview(isPrev ? null : sid)}>

                {videoUrl ? (
                  <video
                    src={videoUrl}
                    autoPlay={isPrev}
                    loop muted={!isPrev} controls={isPrev} playsInline
                    style={{ width:"100%",height:"100%",objectFit:"cover" }}
                    onClick={e => isPrev && e.stopPropagation()}
                  />
                ) : imgUrl ? (
                  <img src={imgUrl} alt="" style={{
                    width:"100%",height:"100%",objectFit:"cover",
                    opacity: status === "generating" ? 0.3 : 0.2,
                    filter: "grayscale(0.6)",
                  }} />
                ) : null}

                {/* overlay states */}
                {status === "generating" && (
                  <div style={{
                    position:"absolute",inset:0,display:"flex",
                    alignItems:"center",justifyContent:"center",
                    flexDirection:"column",gap:8,
                    background:"rgba(0,0,0,0.5)",
                    color:"var(--color-purple)",fontSize:"0.75rem",
                  }}>
                    <div className="spinner" style={{ borderTopColor:"var(--color-purple)" }} />
                    Ken Burns 渲染中…
                  </div>
                )}
                {status === "error" && (
                  <div style={{
                    position:"absolute",inset:0,display:"flex",
                    alignItems:"center",justifyContent:"center",
                    flexDirection:"column",gap:6,padding:12,
                    background:"rgba(0,0,0,0.6)",
                    color:"var(--color-red)",fontSize:"0.62rem",textAlign:"center",
                  }}>
                    <span style={{fontSize:"1.2rem"}}>⚠️</span>
                    {errMsg || "渲染失敗"}
                  </div>
                )}
                {status === "idle" && !videoUrl && (
                  <div style={{
                    position:"absolute",inset:0,display:"flex",
                    alignItems:"center",justifyContent:"center",
                    color:"var(--text-muted)",fontSize:"0.75rem",
                    flexDirection:"column",gap:4,
                  }}>
                    <span style={{fontSize:"1.5rem"}}>🎬</span>
                    Scene {sid}
                  </div>
                )}
                {videoUrl && !isPrev && (
                  <div style={{
                    position:"absolute",inset:0,display:"flex",
                    alignItems:"center",justifyContent:"center",
                    background:"rgba(0,0,0,0.0)",transition:"background 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0)"}
                  >
                    <span style={{
                      fontSize:"2rem",opacity:0,transition:"opacity 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.opacity=1; e.currentTarget.parentElement.style.background="rgba(0,0,0,0.3)"; }}
                    >▶</span>
                  </div>
                )}
              </div>

              {/* card footer */}
              <div style={{ padding: "8px 10px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                  <span style={{ fontSize:"0.75rem",fontWeight:600 }}>{scene.title || `Scene ${sid}`}</span>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    {videoUrl && (
                      <span style={{ fontSize:"0.62rem",color:"var(--text-muted)",cursor:"pointer" }}
                        onClick={() => setPreview(isPrev ? null : sid)}>
                        {isPrev ? "▼ 收起" : "▶ 預覽"}
                      </span>
                    )}
                    <Chip status={status} />
                  </div>
                </div>
                {scene.location && (
                  <p style={{ fontSize:"0.65rem",color:"var(--text-muted)",marginBottom:6 }}>📍 {scene.location}</p>
                )}
                <div style={{ display:"flex",gap:4 }}>
                  <button onClick={() => handleRegenOne(sid)} disabled={status === "generating"} style={{
                    flex:1,padding:"3px 0",fontSize:"0.65rem",borderRadius:4,cursor:"pointer",
                    background:"transparent",border:"1px solid var(--border-color)",color:"var(--text-muted)",
                    opacity: status === "generating" ? 0.5 : 1,
                  }}>↻ 重新渲染</button>
                  {videoUrl && (
                    <a href={videoUrl} download={`scene_${sid}.mp4`} style={{
                      padding:"3px 8px",fontSize:"0.65rem",borderRadius:4,
                      background:"transparent",border:"1px solid var(--border-color)",
                      color:"var(--text-muted)",textDecoration:"none",
                    }}>↓</a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StoryboardGallery({ novelId, scenes, storyboard }) {
  const [tab, setTab]           = useState("image"); // "image" | "video"
  const [imageMap, setImageMap] = useState({});
  const [agentStyle, setAgentStyle] = useState(null);
  const [userStyle,  setUserStyle]  = useState("");
  const [editingStyle, setEditingStyle] = useState(false);
  const [styleMsg, setStyleMsg] = useState("");
  const [hfReady, setHfReady]   = useState(null);

  const mergedScenes = scenes.map(scene => {
    const board = storyboard?.find(b => b.scene_id === scene.id) || {};
    return { ...scene, ...board, scene_id: scene.id };
  }).filter(s => s.t2i_prompt || s.image_prompt);

  const load = async () => {
    if (!novelId) return;
    try {
      const [imgRes, hlRes, styleRes] = await Promise.all([
        fetch(`${API}/api/novels/${novelId}/images`),
        fetch(`${API}/api/health`),
        fetch(`${API}/api/novels/${novelId}/style`),
      ]);
      const imgs = await imgRes.json();
      const map = {};
      imgs.forEach(img => { map[img.scene_id] = `${API}/api/novels/${novelId}/images/${img.scene_id}?t=${Date.now()}`; });
      setImageMap(map);
      const health = await hlRes.json();
      setHfReady(!!health.hf_token_set);
      if (styleRes.ok) {
        const style = await styleRes.json();
        setAgentStyle(style);
        if (!userStyle) setUserStyle(style.style_tags || "");
      }
    } catch {}
  };

  useEffect(() => { load(); }, [novelId, scenes]);

  const flashStyle = m => { setStyleMsg(m); setTimeout(() => setStyleMsg(""), 2500); };

  const handleSaveStyle = async () => {
    if (!userStyle.trim()) return;
    await fetch(`${API}/api/novels/${novelId}/style`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style_tags: userStyle, user_override: true }),
    });
    setAgentStyle(prev => ({ ...prev, style_tags: userStyle, user_override: true }));
    setEditingStyle(false);
    flashStyle("風格已儲存，下次生成將套用新風格");
  };

  const handleResetStyle = async () => {
    await fetch(`${API}/api/novels/${novelId}/style`, { method: "DELETE" });
    setAgentStyle(null);
    setUserStyle("");
    setEditingStyle(false);
    flashStyle("已重設，下次 Pipeline 將重新判斷風格");
  };

  const effectiveStyle = userStyle.trim() || agentStyle?.style_tags || "";

  if (!novelId || mergedScenes.length === 0) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem",
        border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
        尚無場景資料。請先執行 Pipeline 產出分鏡。
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "12px", fontFamily: "var(--font-sans)" }}>

      {/* Tab bar + refresh */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display:"flex",borderRadius:6,overflow:"hidden",border:"1px solid var(--border-color)" }}>
          {[["image","🖼️ 分鏡圖"],["video","🎬 影片生成"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "5px 14px", fontSize: "0.75rem", cursor: "pointer", border: "none",
              borderLeft: key === "video" ? "1px solid var(--border-color)" : "none",
              background: tab === key
                ? (key === "image" ? "rgba(0,242,254,0.12)" : "rgba(157,78,221,0.12)")
                : "transparent",
              color: tab === key
                ? (key === "image" ? "var(--color-cyan)" : "var(--color-purple)")
                : "var(--text-muted)",
              fontWeight: tab === key ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.72rem", marginLeft: "auto" }}>↻</button>
      </div>

      {/* HF warning */}
      {hfReady === false && tab === "image" && (
        <div style={{
          fontSize: "0.72rem", padding: "8px 12px", borderRadius: "6px",
          background: "rgba(255,183,3,0.06)", border: "1px solid rgba(255,183,3,0.2)",
          color: "var(--color-gold)",
        }}>
          ⚠️ 需在 <code>backend/.env</code> 設定 <code>HF_TOKEN</code>（免費：<a href="https://huggingface.co/settings/tokens" target="_blank" style={{color:"var(--color-cyan)"}}>huggingface.co/settings/tokens</a>）
        </div>
      )}

      {/* Style panel (only on image tab) */}
      {tab === "image" && (
        <div style={{
          padding: "10px 12px", borderRadius: "8px",
          background: "rgba(157,78,221,0.05)", border: "1px solid rgba(157,78,221,0.2)",
        }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom: editingStyle ? 8 : 0 }}>
            <span style={{ fontSize:"0.72rem",color:"var(--color-purple)",fontWeight:600 }}>🎨 視覺風格</span>
            {agentStyle?.rationale && !editingStyle && (
              <span style={{ fontSize:"0.65rem",color:"var(--text-muted)" }}>
                {agentStyle.user_override ? "（使用者設定）" : `Agent 判斷：${agentStyle.rationale}`}
              </span>
            )}
            <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
              {!editingStyle ? (
                <button onClick={() => setEditingStyle(true)} style={{
                  padding:"2px 9px",fontSize:"0.68rem",borderRadius:4,cursor:"pointer",
                  background:"transparent",border:"1px solid rgba(157,78,221,0.4)",color:"var(--color-purple)",
                }}>✏️ 調整風格</button>
              ) : (
                <>
                  <button onClick={handleSaveStyle} style={{
                    padding:"2px 9px",fontSize:"0.68rem",borderRadius:4,cursor:"pointer",
                    background:"rgba(6,214,160,0.1)",border:"1px solid var(--color-emerald)",color:"var(--color-emerald)",
                  }}>儲存</button>
                  <button onClick={() => { setEditingStyle(false); setUserStyle(agentStyle?.style_tags || ""); }} style={{
                    padding:"2px 8px",fontSize:"0.68rem",borderRadius:4,cursor:"pointer",
                    background:"transparent",border:"1px solid var(--border-color)",color:"var(--text-muted)",
                  }}>取消</button>
                  {agentStyle && (
                    <button onClick={handleResetStyle} style={{
                      padding:"2px 8px",fontSize:"0.68rem",borderRadius:4,cursor:"pointer",
                      background:"transparent",border:"1px solid transparent",color:"var(--text-muted)",
                    }}>重設</button>
                  )}
                </>
              )}
            </div>
          </div>
          {!editingStyle && effectiveStyle && (
            <p style={{ fontSize:"0.65rem",color:"var(--text-muted)",fontFamily:"var(--font-mono)",margin:0,lineHeight:1.5 }}>
              {effectiveStyle}
            </p>
          )}
          {editingStyle && (
            <>
              <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:8 }}>
                {STYLE_PRESETS.map(p => (
                  <button key={p.label} onClick={() => setUserStyle(p.value)} style={{
                    padding:"2px 9px",fontSize:"0.65rem",borderRadius:"999px",cursor:"pointer",
                    background: userStyle === p.value ? "rgba(157,78,221,0.2)" : "transparent",
                    border:`1px solid ${userStyle === p.value ? "rgba(157,78,221,0.6)" : "var(--border-color)"}`,
                    color: userStyle === p.value ? "var(--color-purple)" : "var(--text-muted)",
                  }}>{p.label}</button>
                ))}
              </div>
              <textarea value={userStyle} onChange={e => setUserStyle(e.target.value)}
                placeholder="輸入風格 tags（英文，逗號分隔）或選擇上方預設…"
                className="input-field" style={{
                  width:"100%",resize:"vertical",fontSize:"0.7rem",lineHeight:1.6,
                  padding:"6px 8px",fontFamily:"var(--font-mono)",minHeight:"56px",boxSizing:"border-box",
                }} />
              <p style={{ fontSize:"0.62rem",color:"var(--text-muted)",margin:"4px 0 0" }}>
                💡 儲存後，按「全部重新生成」套用新風格
              </p>
            </>
          )}
          {styleMsg && <p style={{ fontSize:"0.65rem",color:"var(--color-emerald)",margin:"4px 0 0" }}>{styleMsg}</p>}
        </div>
      )}

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "image"
          ? <ImageTab novelId={novelId} mergedScenes={mergedScenes} imageMap={imageMap} setImageMap={setImageMap} userStyle={effectiveStyle} />
          : <VideoTab novelId={novelId} mergedScenes={mergedScenes} imageMap={imageMap} />
        }
      </div>
    </div>
  );
}
