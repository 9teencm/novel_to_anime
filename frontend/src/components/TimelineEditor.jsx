import { useState, useEffect, useCallback } from 'react';

const API = "http://localhost:8000";

const STYLE_PRESETS = [
  { label: "仙俠動漫", value: "unified anime art style, cel shading, xianxia chinese fantasy, flowing robes, mystical atmosphere, ink wash influence, cinematic composition" },
  { label: "吉卜力", value: "studio ghibli style, soft watercolor, painterly, whimsical, warm lighting, detailed background, gentle atmosphere" },
  { label: "水墨武俠", value: "traditional chinese ink wash painting, wuxia, monochrome with red accent, calligraphic brushstroke, high contrast" },
  { label: "賽博龐克", value: "cyberpunk, neon lights, dark atmosphere, futuristic cityscape, rain reflections, high contrast, sci-fi anime" },
  { label: "漫畫風", value: "manhwa style, clean line art, high contrast, dramatic shadows, webtoon, korean comic, vibrant colors" },
  { label: "寫實風", value: "semi-realistic, cinematic lighting, detailed textures, natural colors, film photography style" },
];

export default function TimelineEditor({ scenes, selectedSceneId, onSelectScene, novelId, storyboard }) {
  const [imageMap, setImageMap] = useState({});
  const [statusMap, setStatusMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [userStyle, setUserStyle] = useState("");
  const [agentStyle, setAgentStyle] = useState(null);
  const [editingStyle, setEditingStyle] = useState(false);
  const [styleMsg, setStyleMsg] = useState("");
  const [falAvailable, setFalAvailable] = useState(null); // null=checking, true/false

  const loadImages = useCallback(async () => {
    if (!novelId) return;
    try {
      const [imgRes, styleRes, falRes] = await Promise.all([
        fetch(`${API}/api/novels/${novelId}/images`),
        fetch(`${API}/api/novels/${novelId}/style`),
        fetch(`${API}/api/fal/status`),
      ]);
      const imgs = await imgRes.json();
      const map = {};
      imgs.forEach(img => { map[img.scene_id] = `${API}/api/novels/${novelId}/images/${img.scene_id}?t=${Date.now()}`; });
      setImageMap(map);
      const smap = {};
      scenes.forEach(s => { smap[s.id] = map[s.id] ? "done" : "idle"; });
      setStatusMap(smap);
      if (styleRes.ok) {
        const style = await styleRes.json();
        setAgentStyle(style);
        if (!userStyle) setUserStyle(style.style_tags || "");
      }
      if (falRes.ok) {
        const fal = await falRes.json();
        setFalAvailable(fal.available);
      } else {
        setFalAvailable(false);
      }
    } catch { setFalAvailable(false); }
  }, [novelId, scenes]);

  useEffect(() => { loadImages(); }, [novelId, scenes]);

  const flashStyle = (m) => { setStyleMsg(m); setTimeout(() => setStyleMsg(""), 2500); };

  const handleSaveStyle = async () => {
    if (!userStyle.trim() || !novelId) return;
    await fetch(`${API}/api/novels/${novelId}/style`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style_tags: userStyle, user_override: true }),
    });
    setAgentStyle(prev => ({ ...prev, style_tags: userStyle, user_override: true }));
    setEditingStyle(false);
    flashStyle("風格已儲存");
  };

  const generateSingle = async (sceneId) => {
    if (!novelId) return;
    setStatusMap(m => ({ ...m, [sceneId]: "generating" }));
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/images/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene_ids: [sceneId], force_regenerate: true, style_override: userStyle.trim() || null }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (r?.success) {
        setImageMap(m => ({ ...m, [sceneId]: `${API}/api/novels/${novelId}/images/${sceneId}?t=${Date.now()}` }));
        setStatusMap(m => ({ ...m, [sceneId]: "done" }));
      } else {
        setStatusMap(m => ({ ...m, [sceneId]: "error" }));
        setErrorMap(m => ({ ...m, [sceneId]: r?.message || "失敗" }));
      }
    } catch {
      setStatusMap(m => ({ ...m, [sceneId]: "error" }));
    }
  };

  const generateAll = async (force = false) => {
    if (!novelId || generating) return;
    setGenerating(true);
    setProgress({ done: 0, total: scenes.length });
    const smap = {};
    scenes.forEach(s => { smap[s.id] = "generating"; });
    setStatusMap(smap);
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/images/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_regenerate: force, style_override: userStyle.trim() || null }),
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
          setErrorMap(m => ({ ...m, [r.scene_id]: r.message || "失敗" }));
        }
        setProgress({ done: i + 1, total: scenes.length });
        setImageMap({ ...newMap });
        setStatusMap({ ...newSmap });
      });
    } catch {}
    setGenerating(false);
    setProgress({ done: 0, total: 0 });
  };

  const doneCount = Object.values(statusMap).filter(s => s === "done").length;

  if (scenes.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', color: 'var(--text-muted)',
        gap: '12px', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem' }}>🎬</div>
        <h4 style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600 }}>時間軸為空</h4>
        <p style={{ fontSize: '0.8rem', maxWidth: '360px', lineHeight: '1.6' }}>
          請在左側輸入章節內容，點擊「🚀 執行 Agent 管道」自動生成分鏡。
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-main)' }}>{scenes.length}</strong> 幕
          {novelId && <span style={{ marginLeft: '8px' }}> · 🖼️ {doneCount}/{scenes.length} 已生成</span>}
        </span>
        {generating && progress.total > 0 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--color-cyan)' }}>生成中 {progress.done}/{progress.total}...</span>
        )}

        {novelId && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Image backend status badge */}
            {falAvailable !== null && (
              <span style={{
                fontSize: '0.65rem', padding: '2px 7px', borderRadius: '999px',
                border: `1px solid ${falAvailable ? '#4caf50' : 'var(--border-color)'}`,
                color: falAvailable ? '#4caf50' : 'var(--text-muted)',
                background: falAvailable ? 'rgba(76,175,80,0.08)' : 'transparent',
              }}>
                {falAvailable ? '✨ fal.ai' : '☁️ HF API'}
              </span>
            )}
            {/* Style editor toggle */}
            <button onClick={() => setEditingStyle(v => !v)} style={{
              padding: '3px 9px', fontSize: '0.7rem', borderRadius: '5px', cursor: 'pointer',
              background: editingStyle ? 'rgba(157,78,221,0.15)' : 'transparent',
              border: `1px solid ${editingStyle ? 'rgba(157,78,221,0.5)' : 'var(--border-color)'}`,
              color: editingStyle ? 'var(--color-purple)' : 'var(--text-muted)',
            }}>🎨 風格</button>
            <button onClick={() => generateAll(false)} disabled={generating} style={{
              padding: '4px 12px', fontSize: '0.75rem', cursor: generating ? 'not-allowed' : 'pointer',
              borderRadius: '5px', opacity: generating ? 0.6 : 1,
              background: 'rgba(0,242,254,0.1)', border: '1px solid var(--color-cyan)', color: 'var(--color-cyan)',
            }}>{generating ? '⏳ 生成中...' : '⚡ 全部生成'}</button>
            <button onClick={() => generateAll(true)} disabled={generating} style={{
              padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer',
              borderRadius: '5px', opacity: generating ? 0.6 : 1,
              background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)',
            }}>↻ 重新生成</button>
          </div>
        )}
      </div>

      {/* Style editor panel */}
      {editingStyle && novelId && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', flexShrink: 0,
          background: 'rgba(157,78,221,0.05)', border: '1px solid rgba(157,78,221,0.2)',
        }}>
          {agentStyle?.rationale && (
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              {agentStyle.user_override ? '使用者設定風格' : `Agent 判斷：${agentStyle.rationale}`}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
            {STYLE_PRESETS.map(p => (
              <button key={p.label} onClick={() => setUserStyle(p.value)} style={{
                padding: '2px 8px', fontSize: '0.63rem', borderRadius: '999px', cursor: 'pointer',
                background: userStyle === p.value ? 'rgba(157,78,221,0.2)' : 'transparent',
                border: `1px solid ${userStyle === p.value ? 'rgba(157,78,221,0.5)' : 'var(--border-color)'}`,
                color: userStyle === p.value ? 'var(--color-purple)' : 'var(--text-muted)',
              }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <textarea value={userStyle} onChange={e => setUserStyle(e.target.value)}
              className="input-field" placeholder="自訂風格 tags..."
              style={{ flex: 1, resize: 'none', fontSize: '0.68rem', padding: '5px 8px', minHeight: '40px', fontFamily: 'var(--font-mono)' }} />
            <button onClick={handleSaveStyle} style={{
              padding: '4px 10px', fontSize: '0.68rem', borderRadius: '5px', cursor: 'pointer', alignSelf: 'flex-start',
              background: 'rgba(6,214,160,0.1)', border: '1px solid var(--color-emerald)', color: 'var(--color-emerald)',
            }}>儲存</button>
          </div>
          {styleMsg && <p style={{ fontSize: '0.62rem', color: 'var(--color-emerald)', marginTop: '4px' }}>{styleMsg}</p>}
        </div>
      )}

      {/* Progress bar */}
      {generating && (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '4px', height: '3px', flexShrink: 0 }}>
          <div style={{
            height: '100%', borderRadius: '4px',
            background: 'linear-gradient(90deg, var(--color-cyan), var(--color-purple))',
            width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}

      {/* Scene list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
          {scenes.map((scene) => {
            const isSelected = selectedSceneId === scene.id;
            const sid = scene.id;
            const imgUrl = imageMap[sid];
            const status = statusMap[sid] || 'idle';

            return (
              <div key={sid} onClick={() => onSelectScene(sid)}
                className={`glass-panel ${isSelected ? 'glow-active' : ''}`}
                style={{
                  display: 'grid', gridTemplateColumns: '260px 1fr',
                  gap: '16px', padding: '0', cursor: 'pointer', overflow: 'hidden',
                  border: isSelected ? '1px solid var(--color-cyan)' : '1px solid var(--glass-border)',
                  background: isSelected ? 'rgba(0,242,254,0.04)' : 'var(--panel-bg)',
                  boxShadow: isSelected ? '0 0 15px rgba(0,242,254,0.1)' : 'none',
                }}
              >
                {/* Left: Image */}
                <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={`Scene ${sid}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : status === 'generating' ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-cyan)', fontSize: '0.72rem' }}>
                      <div className="spinner" />生成中...
                    </div>
                  ) : status === 'error' ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', color: 'var(--color-red)', fontSize: '0.65rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚠️</span>{errorMap[sid] || '生成失敗'}
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      <span style={{ fontSize: '1.8rem' }}>🎬</span>Scene {sid}
                    </div>
                  )}

                  {/* Scene number badge */}
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                    color: 'var(--color-cyan)', padding: '2px 8px', borderRadius: '4px',
                    fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(0,242,254,0.3)',
                  }}>SCENE {sid}</div>

                  {/* Generate button overlay */}
                  {novelId && (
                    <button onClick={e => { e.stopPropagation(); generateSingle(sid); }}
                      disabled={status === 'generating'}
                      style={{
                        position: 'absolute', bottom: '6px', right: '6px',
                        padding: '3px 8px', fontSize: '0.62rem', borderRadius: '4px', cursor: 'pointer',
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        border: `1px solid ${imgUrl ? 'var(--border-color)' : 'rgba(157,78,221,0.5)'}`,
                        color: imgUrl ? 'var(--text-muted)' : 'var(--color-purple)',
                        opacity: status === 'generating' ? 0.5 : 1,
                      }}>
                      {imgUrl ? '↻' : '🎨 生成'}
                    </button>
                  )}
                </div>

                {/* Right: Scene info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 14px 14px 0', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>
                        {scene.title || `Scene ${sid}`}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-purple)' }}>📍 {scene.location}</span>
                      {scene.time && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '10px' }}>🕒 {scene.time}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {scene.camera?.angle && (
                        <span style={{ fontSize: '0.62rem', background: 'rgba(0,242,254,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-cyan)', border: '1px solid rgba(0,242,254,0.2)' }}>
                          🎥 {scene.camera.angle}
                        </span>
                      )}
                      {scene.camera?.movement && (
                        <span style={{ fontSize: '0.62rem', background: 'rgba(157,78,221,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-purple)', border: '1px solid rgba(157,78,221,0.2)' }}>
                          ⚡ {scene.camera.movement}
                        </span>
                      )}
                    </div>
                  </div>

                  {scene.dialogue && (
                    <div style={{
                      background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px',
                      borderLeft: '3px solid var(--color-cyan)', fontSize: '0.78rem',
                      lineHeight: '1.5', color: '#fff', fontStyle: 'italic',
                    }}>
                      {scene.dialogue}
                    </div>
                  )}

                  {scene.characters?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>登場：</span>
                      {scene.characters.map((c, i) => (
                        <span key={i} style={{
                          fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)',
                          padding: '1px 6px', borderRadius: '3px', color: 'var(--text-main)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}>{c}</span>
                      ))}
                    </div>
                  )}

                  {scene.image_prompt && (
                    <div style={{ marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Prompt：</span>
                      <div style={{
                        fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        background: 'rgba(255,255,255,0.02)', padding: '3px 7px', borderRadius: '4px', marginTop: '2px',
                      }}>{scene.image_prompt}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
