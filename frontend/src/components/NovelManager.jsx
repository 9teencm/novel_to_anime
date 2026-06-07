import { useState, useEffect } from "react";

const API = "http://localhost:8000";
const GENRES = ["玄幻", "仙俠", "武俠", "都市", "科幻", "懸疑", "歷史", "奇幻", "其他"];

export default function NovelManager({ onEnterNovel }) {
  const [novels, setNovels] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", genre: "玄幻" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/novels`);
      setNovels(await res.json());
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const res = await fetch(`${API}/api/novels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const novel = await res.json();
    setShowCreate(false);
    setForm({ title: "", description: "", genre: "玄幻" });
    await load();
    onEnterNovel(novel);
  };

  const handleDelete = async (e, id, title) => {
    e.stopPropagation();
    if (!confirm(`確定刪除「${title}」及所有資料？`)) return;
    await fetch(`${API}/api/novels/${id}`, { method: "DELETE" });
    load();
  };

  const handleSaveEdit = async (e, id) => {
    e.stopPropagation();
    await fetch(`${API}/api/novels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    load();
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      {/* Page title */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
          📚 小說總管
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          建立並管理多本小說，每本獨立擁有 Pipeline 分析、分鏡時間軸、製作聖經。
        </p>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button onClick={() => setShowCreate(v => !v)} style={{
          padding: "8px 18px", fontSize: "0.82rem", cursor: "pointer", borderRadius: "8px",
          background: showCreate ? "transparent" : "rgba(0,242,254,0.12)",
          border: "1px solid var(--color-cyan)", color: "var(--color-cyan)",
          transition: "all 0.2s",
        }}>
          {showCreate ? "✕ 取消" : "+ 新增小說"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="glass-panel" style={{
          padding: "20px 24px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "14px",
          background: "rgba(0,242,254,0.03)", border: "1px solid rgba(0,242,254,0.2)",
        }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-cyan)" }}>建立新小說</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>標題 *</label>
              <input required placeholder="如：大奉打更人" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field" style={{ fontSize: "0.82rem", padding: "7px 10px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>簡介</label>
              <input placeholder="一句話描述故事" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input-field" style={{ fontSize: "0.82rem", padding: "7px 10px" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>類型：</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {GENRES.map(g => (
                <button key={g} type="button" onClick={() => setForm(f => ({ ...f, genre: g }))} style={{
                  padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", cursor: "pointer",
                  border: "1px solid",
                  background: form.genre === g ? "rgba(0,242,254,0.15)" : "transparent",
                  borderColor: form.genre === g ? "var(--color-cyan)" : "var(--border-color)",
                  color: form.genre === g ? "var(--color-cyan)" : "var(--text-muted)",
                  transition: "all 0.15s",
                }}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={{
              padding: "7px 20px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "7px",
              background: "rgba(0,242,254,0.12)", border: "1px solid var(--color-cyan)", color: "var(--color-cyan)",
            }}>建立並進入工作區 →</button>
          </div>
        </form>
      )}

      {/* Novel grid */}
      {novels.length === 0 && !showCreate ? (
        <div style={{
          textAlign: "center", padding: "80px 24px", color: "var(--text-muted)",
          border: "1px dashed var(--border-color)", borderRadius: "12px",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📖</div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>尚無小說</div>
          <div style={{ fontSize: "0.82rem" }}>點擊右上角「新增小說」開始建立你的第一本</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {novels.map(novel => {
            const isEditing = editingId === novel.id;
            return (
              <div key={novel.id} onClick={() => !isEditing && onEnterNovel(novel)}
                className="glass-panel" style={{
                  padding: "20px", cursor: isEditing ? "default" : "pointer",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  transition: "all 0.2s", position: "relative",
                }}
                onMouseEnter={e => { if (!isEditing) e.currentTarget.style.borderColor = "rgba(0,242,254,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
              >
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} onClick={e => e.stopPropagation()}>
                    <input value={editForm.title ?? novel.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      className="input-field" style={{ fontSize: "0.82rem", padding: "5px 8px" }} />
                    <input value={editForm.description ?? novel.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      className="input-field" style={{ fontSize: "0.75rem", padding: "5px 8px" }} placeholder="簡介" />
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button onClick={() => setEditingId(null)} style={{
                        padding: "3px 10px", fontSize: "0.72rem", borderRadius: "4px", cursor: "pointer",
                        background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)"
                      }}>取消</button>
                      <button onClick={(e) => handleSaveEdit(e, novel.id)} style={{
                        padding: "3px 10px", fontSize: "0.72rem", borderRadius: "4px", cursor: "pointer",
                        background: "rgba(6,214,160,0.12)", border: "1px solid var(--color-emerald)", color: "var(--color-emerald)"
                      }}>儲存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Genre tag */}
                    {novel.genre && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{
                          fontSize: "0.62rem", padding: "2px 8px", borderRadius: "999px",
                          border: "1px solid var(--color-purple)", color: "var(--color-purple)", background: "rgba(157,78,221,0.1)"
                        }}>{novel.genre}</span>
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)", marginBottom: "6px" }}>
                      {novel.title}
                    </div>
                    {novel.description && (
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "12px" }}>
                        {novel.description}
                      </p>
                    )}
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "16px", fontFamily: "var(--font-mono)" }}>
                      已分析 {novel.chapter_count || 0} 章 · #{novel.id}
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button style={{
                        padding: "6px 16px", fontSize: "0.75rem", cursor: "pointer", borderRadius: "6px",
                        background: "rgba(0,242,254,0.1)", border: "1px solid rgba(0,242,254,0.3)",
                        color: "var(--color-cyan)", fontWeight: 500,
                      }}>進入工作區 →</button>
                      <div style={{ display: "flex", gap: "4px" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditingId(novel.id); setEditForm({}); }} style={{
                          padding: "4px 8px", fontSize: "0.68rem", borderRadius: "4px", cursor: "pointer",
                          background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)"
                        }}>編輯</button>
                        <button onClick={(e) => handleDelete(e, novel.id, novel.title)} style={{
                          padding: "4px 8px", fontSize: "0.68rem", borderRadius: "4px", cursor: "pointer",
                          background: "transparent", border: "1px solid transparent", color: "var(--text-muted)",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-red)"; e.currentTarget.style.color = "var(--color-red)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                        >刪除</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
