import { useState, useEffect } from "react";

const API = "http://localhost:8000";

export default function ChapterVault({ novelId, currentChapter, currentText, onLoadChapter }) {
  const [chapters, setChapters] = useState([]);
  const [timelines, setTimelines] = useState({}); // { chapter_number: metadata }
  const [selectedId, setSelectedId] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const load = async () => {
    if (!novelId) return;
    try {
      const [chapRes, tlRes] = await Promise.all([
        fetch(`${API}/api/novels/${novelId}/chapters`),
        fetch(`${API}/api/novels/${novelId}/timelines`),
      ]);
      setChapters(await chapRes.json());
      const tlList = await tlRes.json();
      const tlMap = {};
      tlList.forEach(t => { tlMap[t.chapter_number] = t; });
      setTimelines(tlMap);
    } catch {}
  };

  useEffect(() => { load(); }, [novelId]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const handleSaveCurrent = async () => {
    if (!currentText?.trim()) { flash("目前工作區無文字可儲存"); return; }
    setSaving(true);
    await fetch(`${API}/api/novels/${novelId}/chapters`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapter_number: currentChapter,
        title: `第 ${currentChapter} 章`,
        text: currentText,
      }),
    });
    await load();
    setSaving(false);
    flash(`第 ${currentChapter} 章已儲存`);
  };

  const handleSaveEdit = async () => {
    if (!editingChapter) return;
    setSaving(true);
    await fetch(`${API}/api/novels/${novelId}/chapters`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingChapter),
    });
    setEditingChapter(null); await load();
    setSaving(false); flash("已儲存");
  };

  const handleDelete = async (num, e) => {
    e.stopPropagation();
    if (!confirm(`確定刪除第 ${num} 章的文本？`)) return;
    await fetch(`${API}/api/novels/${novelId}/chapters/${num}`, { method: "DELETE" });
    if (selectedId === num) setSelectedId(null);
    if (editingChapter?.chapter_number === num) setEditingChapter(null);
    load();
  };

  // Load text only
  const handleLoadText = (ch) => {
    onLoadChapter(ch.chapter_number, ch.text, null);
    flash(`已載入第 ${ch.chapter_number} 章文本至工作區`);
  };

  // Load text + timeline
  const handleLoadWithTimeline = async (ch) => {
    setLoadingTimeline(true);
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/timeline/${ch.chapter_number}`);
      if (res.ok) {
        const timeline = await res.json();
        onLoadChapter(ch.chapter_number, ch.text, timeline);
        flash(`已載入第 ${ch.chapter_number} 章（含分鏡時間軸）`);
      } else {
        onLoadChapter(ch.chapter_number, ch.text, null);
        flash(`第 ${ch.chapter_number} 章已載入（尚無儲存分鏡）`);
      }
    } catch {
      onLoadChapter(ch.chapter_number, ch.text, null);
      flash(`已載入第 ${ch.chapter_number} 章文本`);
    }
    setLoadingTimeline(false);
  };

  const handleDeleteTimeline = async (num, e) => {
    e.stopPropagation();
    if (!confirm(`確定刪除第 ${num} 章的分鏡紀錄？`)) return;
    await fetch(`${API}/api/novels/${novelId}/timeline/${num}`, { method: "DELETE" });
    load();
  };

  const selected = chapters.find(c => c.chapter_number === selectedId);
  const selectedTimeline = selected ? timelines[selected.chapter_number] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>
          📂 章節文本庫
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 400, marginLeft: "8px" }}>
            {chapters.length} 章 · {Object.keys(timelines).length} 組分鏡
          </span>
        </span>
        <button onClick={handleSaveCurrent} disabled={saving} style={{
          padding: "4px 12px", fontSize: "0.73rem", cursor: "pointer", borderRadius: "6px",
          background: "rgba(6,214,160,0.1)", border: "1px solid var(--color-emerald)",
          color: "var(--color-emerald)", opacity: saving ? 0.6 : 1,
        }}>
          {saving ? "儲存中..." : `↓ 儲存第 ${currentChapter} 章`}
        </button>
      </div>

      {msg && (
        <div style={{
          fontSize: "0.72rem", padding: "5px 10px", borderRadius: "5px",
          background: "rgba(6,214,160,0.08)", border: "1px solid rgba(6,214,160,0.25)",
          color: "var(--color-emerald)",
        }}>{msg}</div>
      )}

      <div style={{ display: "flex", flex: 1, gap: "10px", minHeight: 0 }}>

        {/* Chapter list */}
        <div style={{ width: "170px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>
          {chapters.length === 0 && (
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>
              尚無儲存章節
            </p>
          )}
          {chapters.map(ch => {
            const hasTL = !!timelines[ch.chapter_number];
            return (
              <div key={ch.chapter_number} onClick={() => setSelectedId(ch.chapter_number)} style={{
                padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                border: "1px solid",
                borderColor: selectedId === ch.chapter_number ? "rgba(0,242,254,0.4)" : "rgba(255,255,255,0.05)",
                background: selectedId === ch.chapter_number ? "rgba(0,242,254,0.06)" : "rgba(255,255,255,0.01)",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, flex: 1, color: selectedId === ch.chapter_number ? "var(--color-cyan)" : "var(--text-main)" }}>
                    {ch.title || `第 ${ch.chapter_number} 章`}
                  </span>
                  {hasTL && (
                    <span title="已有分鏡紀錄" style={{
                      fontSize: "0.55rem", padding: "1px 4px", borderRadius: "3px",
                      background: "rgba(157,78,221,0.15)", border: "1px solid rgba(157,78,221,0.3)",
                      color: "var(--color-purple)",
                    }}>🎬</span>
                  )}
                </div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {ch.text?.length || 0} 字
                  {hasTL && (
                    <span style={{ marginLeft: "6px", color: "var(--color-purple)" }}>
                      · {timelines[ch.chapter_number]?.scene_count || 0} 場
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginTop: "1px", fontFamily: "var(--font-mono)" }}>
                  {new Date(ch.updated_at).toLocaleDateString("zh-TW")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chapter detail / editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
          {!selected ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px dashed var(--border-color)", borderRadius: "8px",
              color: "var(--text-muted)", fontSize: "0.78rem",
            }}>
              ← 點選左側章節查看內容
            </div>
          ) : editingChapter?.chapter_number === selected.chapter_number ? (
            <>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input value={editingChapter.title}
                  onChange={e => setEditingChapter(c => ({ ...c, title: e.target.value }))}
                  className="input-field" placeholder="章節標題"
                  style={{ flex: 1, fontSize: "0.78rem", padding: "5px 8px" }} />
                <button onClick={handleSaveEdit} style={{
                  padding: "4px 12px", fontSize: "0.72rem", borderRadius: "5px", cursor: "pointer",
                  background: "rgba(6,214,160,0.12)", border: "1px solid var(--color-emerald)", color: "var(--color-emerald)",
                }}>儲存</button>
                <button onClick={() => setEditingChapter(null)} style={{
                  padding: "4px 10px", fontSize: "0.72rem", borderRadius: "5px", cursor: "pointer",
                  background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)",
                }}>取消</button>
              </div>
              <textarea value={editingChapter.text}
                onChange={e => setEditingChapter(c => ({ ...c, text: e.target.value }))}
                className="input-field"
                style={{
                  flex: 1, resize: "none", fontSize: "0.78rem", lineHeight: 1.8,
                  padding: "10px 12px", fontFamily: "var(--font-sans)", minHeight: "300px",
                }} />
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)", flex: 1 }}>
                  {selected.title}
                </span>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  更新：{new Date(selected.updated_at).toLocaleString("zh-TW")}
                </span>
                <button onClick={() => setEditingChapter({ ...selected })} style={{
                  padding: "3px 9px", fontSize: "0.7rem", borderRadius: "4px", cursor: "pointer",
                  background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)",
                }}>✏️ 編輯</button>

                {/* Load text only */}
                <button onClick={() => handleLoadText(selected)} style={{
                  padding: "3px 9px", fontSize: "0.7rem", borderRadius: "4px", cursor: "pointer",
                  background: "rgba(0,242,254,0.08)", border: "1px solid rgba(0,242,254,0.25)", color: "var(--color-cyan)",
                }}>↑ 載入文本</button>

                {/* Load text + timeline */}
                {selectedTimeline && (
                  <button onClick={() => handleLoadWithTimeline(selected)} disabled={loadingTimeline} style={{
                    padding: "3px 9px", fontSize: "0.7rem", borderRadius: "4px", cursor: "pointer",
                    background: "rgba(157,78,221,0.1)", border: "1px solid rgba(157,78,221,0.4)", color: "var(--color-purple)",
                    opacity: loadingTimeline ? 0.6 : 1,
                  }}>🎬 {loadingTimeline ? "載入中..." : "含分鏡載入"}</button>
                )}

                <button onClick={(e) => handleDelete(selected.chapter_number, e)} style={{
                  padding: "3px 8px", fontSize: "0.7rem", borderRadius: "4px", cursor: "pointer",
                  background: "transparent", border: "1px solid transparent", color: "var(--text-muted)",
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--color-red)"; e.currentTarget.style.borderColor = "var(--color-red)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "transparent"; }}
                >刪除</button>
              </div>

              {/* Timeline info bar */}
              {selectedTimeline && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "6px 10px", borderRadius: "6px",
                  background: "rgba(157,78,221,0.05)", border: "1px solid rgba(157,78,221,0.2)",
                }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--color-purple)" }}>🎬 已儲存分鏡</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {selectedTimeline.scene_count} 場景 · {selectedTimeline.character_count} 角色
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {new Date(selectedTimeline.updated_at).toLocaleString("zh-TW")}
                  </span>
                  <button onClick={(e) => handleDeleteTimeline(selected.chapter_number, e)} style={{
                    marginLeft: "auto", padding: "2px 7px", fontSize: "0.62rem", borderRadius: "4px",
                    cursor: "pointer", background: "transparent", border: "1px solid transparent", color: "var(--text-muted)",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--color-red)"; e.currentTarget.style.borderColor = "var(--color-red)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "transparent"; }}
                  >刪除分鏡</button>
                </div>
              )}

              <div style={{
                flex: 1, overflowY: "auto", fontSize: "0.8rem", lineHeight: 2,
                color: "var(--text-main)", padding: "12px 14px",
                background: "rgba(0,0,0,0.2)", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.04)",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>
                {selected.text}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
