import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const PROFILE_FIELDS = [
  { key: "age",         label: "年齡",   placeholder: "如：25歲、青年" },
  { key: "appearance",  label: "外觀",   placeholder: "五官、髮色、體型" },
  { key: "outfit",      label: "穿著",   placeholder: "服裝、配件" },
  { key: "personality", label: "個性",   placeholder: "性格特徵、行事風格" },
  { key: "abilities",   label: "能力",   placeholder: "技能（逗號分隔）", isArray: true },
];

const EMPTY_PROFILE = { label: "", chapter: "", age: "", appearance: "", outfit: "", personality: "", abilities: "" };

function Tag({ children, color = "var(--color-cyan)" }) {
  return (
    <span style={{
      fontSize: "0.62rem", padding: "1px 7px", borderRadius: "999px",
      border: `1px solid ${color}`, color, background: `${color}18`, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function LockBtn({ locked, onClick }) {
  return (
    <button onClick={onClick} title={locked ? "點擊解鎖" : "鎖定後 Pipeline 不會覆寫此欄位"} style={{
      padding: "1px 6px", borderRadius: "4px", fontSize: "0.6rem", cursor: "pointer", border: "1px solid",
      background: locked ? "rgba(6,214,160,0.12)" : "transparent",
      borderColor: locked ? "var(--color-emerald)" : "var(--border-color)",
      color: locked ? "var(--color-emerald)" : "var(--text-muted)", transition: "all 0.15s",
    }}>{locked ? "🔒" : "🔓"}</button>
  );
}

// ── Single profile row ────────────────────────────────────────────────────────
function ProfileRow({ profile, novelId, charName, onRefresh, canDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const handleSave = async () => {
    const updated = { ...profile, ...draft };
    if (updated.abilities && typeof updated.abilities === "string") {
      updated.abilities = updated.abilities.split(",").map(s => s.trim()).filter(Boolean);
    }
    await fetch(`${API}/api/novels/${novelId}/bible/character/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: charName, profile: updated }),
    });
    setDraft({}); setEditing(false); onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("刪除此發展記錄？")) return;
    await fetch(`${API}/api/novels/${novelId}/bible/character/profile`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: charName, profile_id: profile.id }),
    });
    onRefresh();
  };

  const get = (key) => {
    if (draft[key] !== undefined) return draft[key];
    return Array.isArray(profile[key]) ? profile[key].join(", ") : (profile[key] || "");
  };
  const set = (key, val) => setDraft(d => ({ ...d, [key]: val }));

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px",
      background: "rgba(0,0,0,0.2)", overflow: "hidden",
    }}>
      {/* Profile header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px",
        borderBottom: editing ? "1px solid var(--border-color)" : "none",
        background: "rgba(255,255,255,0.02)",
      }}>
        {editing ? (
          <>
            <input value={get("label")} onChange={e => set("label", e.target.value)}
              placeholder="記錄標題（如：第1章 初登場）" className="input-field"
              style={{ flex: 1, fontSize: "0.75rem", padding: "3px 7px" }} />
            <input value={get("chapter")} onChange={e => set("chapter", e.target.value)}
              placeholder="章節" className="input-field"
              style={{ width: "60px", fontSize: "0.72rem", padding: "3px 6px", textAlign: "center" }} />
          </>
        ) : (
          <>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", flex: 1 }}>
              {profile.label || "未命名記錄"}
            </span>
            {profile.chapter && <Tag color="var(--color-gold)">第 {profile.chapter} 章</Tag>}
          </>
        )}
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {editing ? (
            <>
              <button onClick={handleSave} style={{
                padding: "2px 10px", fontSize: "0.68rem", borderRadius: "4px", cursor: "pointer",
                background: "rgba(6,214,160,0.12)", border: "1px solid var(--color-emerald)", color: "var(--color-emerald)",
              }}>儲存</button>
              <button onClick={() => { setEditing(false); setDraft({}); }} style={{
                padding: "2px 8px", fontSize: "0.68rem", borderRadius: "4px", cursor: "pointer",
                background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)",
              }}>取消</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={{
              padding: "2px 8px", fontSize: "0.68rem", borderRadius: "4px", cursor: "pointer",
              background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)",
            }}>編輯</button>
          )}
          {canDelete && (
            <button onClick={handleDelete} style={{
              padding: "2px 6px", fontSize: "0.68rem", borderRadius: "4px", cursor: "pointer",
              background: "transparent", border: "1px solid transparent", color: "var(--text-muted)",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--color-red)"; e.currentTarget.style.borderColor = "var(--color-red)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "transparent"; }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Profile fields */}
      <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.3px" }}>{label}</span>
            {editing ? (
              <input value={get(key)} onChange={e => set(key, e.target.value)}
                placeholder={placeholder} className="input-field"
                style={{ fontSize: "0.72rem", padding: "3px 7px" }} />
            ) : (
              <span style={{
                fontSize: "0.72rem", color: profile[key] ? "var(--text-main)" : "var(--border-color)",
                lineHeight: 1.5, fontStyle: profile[key] ? "normal" : "italic",
              }}>
                {Array.isArray(profile[key])
                  ? profile[key].length > 0 ? profile[key].join("、") : "—"
                  : profile[key] || "—"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Character card ────────────────────────────────────────────────────────────
function CharacterCard({ char, novelId, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [addingProfile, setAddingProfile] = useState(false);
  const [newProfile, setNewProfile] = useState(EMPTY_PROFILE);
  const locked = char._locked_fields || [];
  const profiles = char.profiles || [];

  const toggleLock = async (field) => {
    const endpoint = locked.includes(field) ? "unlock" : "lock";
    await fetch(`${API}/api/novels/${novelId}/bible/character/${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: char.name, field }),
    });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm(`確定刪除角色「${char.name}」及所有記錄？`)) return;
    await fetch(`${API}/api/novels/${novelId}/bible/character/${encodeURIComponent(char.name)}`, { method: "DELETE" });
    onRefresh();
  };

  const handleAddProfile = async (e) => {
    e.preventDefault();
    const profile = { ...newProfile };
    if (typeof profile.abilities === "string") {
      profile.abilities = profile.abilities.split(",").map(s => s.trim()).filter(Boolean);
    }
    await fetch(`${API}/api/novels/${novelId}/bible/character/profile`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: char.name, profile }),
    });
    setNewProfile(EMPTY_PROFILE); setAddingProfile(false); onRefresh();
  };

  return (
    <div className="glass-panel" style={{
      padding: "14px 16px", background: "rgba(255,255,255,0.015)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: expanded ? "12px" : "0" }}>
        <button onClick={() => setExpanded(v => !v)} style={{
          background: "none", border: "none", color: "var(--text-muted)",
          cursor: "pointer", fontSize: "0.7rem", padding: "0",
        }}>{expanded ? "▾" : "▸"}</button>
        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)", flex: 1 }}>{char.name}</span>
        {char.role && <Tag color="var(--color-cyan)">{char.role}</Tag>}
        <Tag color="var(--text-muted)">{profiles.length} 組記錄</Tag>
        <LockBtn locked={locked.includes("profiles")} onClick={() => toggleLock("profiles")} />
        <button onClick={handleDelete} style={{
          padding: "2px 7px", fontSize: "0.68rem", borderRadius: "4px", cursor: "pointer",
          background: "transparent", border: "1px solid transparent", color: "var(--text-muted)",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--color-red)"; e.currentTarget.style.borderColor = "var(--color-red)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "transparent"; }}
        >刪除</button>
      </div>

      {expanded && (
        <>
          {/* T2I Tags */}
          {char.prompt_tags?.length > 0 && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", width: "100%" }}>
                <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>T2I Tags</span>
                <LockBtn locked={locked.includes("prompt_tags")} onClick={() => toggleLock("prompt_tags")} />
              </div>
              <span style={{ fontSize: "0.65rem", color: "var(--color-emerald)", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
                {Array.isArray(char.prompt_tags) ? char.prompt_tags.join(", ") : char.prompt_tags}
              </span>
            </div>
          )}

          {/* Profile list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {profiles.map((profile, i) => (
              <ProfileRow
                key={profile.id || i}
                profile={profile}
                novelId={novelId}
                charName={char.name}
                onRefresh={onRefresh}
                canDelete={profiles.length > 1}
              />
            ))}
          </div>

          {/* Add profile */}
          {addingProfile ? (
            <form onSubmit={handleAddProfile} style={{
              marginTop: "10px", padding: "12px",
              border: "1px dashed rgba(0,242,254,0.25)", borderRadius: "8px",
              display: "flex", flexDirection: "column", gap: "10px",
              background: "rgba(0,242,254,0.02)",
            }}>
              <div style={{ fontSize: "0.72rem", color: "var(--color-cyan)", fontWeight: 600 }}>新增發展記錄</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "8px" }}>
                <input required placeholder="記錄標題（如：第5章 晉升打更人）"
                  value={newProfile.label} onChange={e => setNewProfile(p => ({ ...p, label: e.target.value }))}
                  className="input-field" style={{ fontSize: "0.75rem", padding: "5px 8px" }} />
                <input placeholder="章節" value={newProfile.chapter}
                  onChange={e => setNewProfile(p => ({ ...p, chapter: e.target.value }))}
                  className="input-field" style={{ fontSize: "0.72rem", padding: "5px 6px", textAlign: "center" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{label}</span>
                    <input placeholder={placeholder} value={newProfile[key] || ""}
                      onChange={e => setNewProfile(p => ({ ...p, [key]: e.target.value }))}
                      className="input-field" style={{ fontSize: "0.72rem", padding: "4px 7px" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setAddingProfile(false); setNewProfile(EMPTY_PROFILE); }} style={{
                  padding: "4px 12px", fontSize: "0.72rem", borderRadius: "5px", cursor: "pointer",
                  background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)",
                }}>取消</button>
                <button type="submit" style={{
                  padding: "4px 14px", fontSize: "0.72rem", borderRadius: "5px", cursor: "pointer",
                  background: "rgba(0,242,254,0.1)", border: "1px solid var(--color-cyan)", color: "var(--color-cyan)",
                }}>新增</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAddingProfile(true)} style={{
              marginTop: "10px", width: "100%", padding: "7px", fontSize: "0.73rem",
              cursor: "pointer", borderRadius: "6px", border: "1px dashed rgba(255,255,255,0.1)",
              background: "transparent", color: "var(--text-muted)", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,242,254,0.3)"; e.currentTarget.style.color = "var(--color-cyan)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >+ 新增發展記錄</button>
          )}
        </>
      )}
    </div>
  );
}

// ── Production Bible ──────────────────────────────────────────────────────────
export default function ProductionBible({ novelId }) {
  const [bible, setBible] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("characters");
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!novelId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/novels/${novelId}/bible`);
      setBible(await res.json());
    } catch { setMsg("無法連線到後端"); }
    setLoading(false);
  };

  useEffect(() => { setBible(null); load(); }, [novelId]);

  const handleReset = async () => {
    if (!confirm("確定清空此小說的製作聖經？")) return;
    await fetch(`${API}/api/novels/${novelId}/bible/reset`, { method: "POST" });
    load();
  };

  if (!novelId) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.85rem" }}>
      請先在小說總管選擇一部小說
    </div>
  );

  const characters = bible?.characters || [];
  const worldRules = bible?.world_rules || [];
  const scenes = bible?.scenes || [];
  const TABS = [["characters", "👤 角色庫"], ["world", "🌐 世界觀"], ["scenes", "🎬 場景庫"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "12px", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
          📖 製作聖經
          {bible && (
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>
              {characters.length} 角色 · {worldRules.length} 規則 · {scenes.length} 場景
              {bible.chapters_processed?.length > 0 && ` · 已處理第 ${bible.chapters_processed.join("、")} 章`}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={load} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.72rem" }}>↻ 重整</button>
          <button onClick={handleReset} style={{
            padding: "4px 10px", fontSize: "0.72rem", cursor: "pointer", borderRadius: "6px",
            background: "rgba(255,0,84,0.1)", border: "1px solid var(--color-red)", color: "var(--color-red)",
          }}>✕ 重置</button>
        </div>
      </div>

      {msg && (
        <div style={{
          fontSize: "0.75rem", padding: "6px 12px", borderRadius: "6px",
          background: "rgba(0,242,254,0.06)", border: "1px solid rgba(0,242,254,0.2)",
          color: "var(--color-cyan)", display: "flex", justifyContent: "space-between",
        }}>
          {msg}
          <button onClick={() => setMsg("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--border-color)" }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "6px 14px", fontSize: "0.78rem",
            background: tab === key ? "rgba(0,242,254,0.08)" : "transparent",
            border: "none", borderBottom: tab === key ? "2px solid var(--color-cyan)" : "2px solid transparent",
            color: tab === key ? "var(--color-cyan)" : "var(--text-muted)",
            cursor: "pointer", borderRadius: "6px 6px 0 0", transition: "all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "16px" }}>載入中...</p>}

        {/* Characters */}
        {!loading && tab === "characters" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {characters.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "32px" }}>
                尚無角色資料。執行 Pipeline 後自動填入，或手動於此新增。
              </p>
            )}
            {characters.map(char => (
              <CharacterCard key={char.name} char={char} novelId={novelId} onRefresh={load} />
            ))}
          </div>
        )}

        {/* World Rules */}
        {!loading && tab === "world" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {worldRules.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "32px" }}>
                尚無世界觀規則。
              </p>
            )}
            {worldRules.map((rule, i) => (
              <div key={i} className="glass-panel" style={{
                padding: "10px 14px", background: "rgba(255,255,255,0.01)",
                border: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "flex-start", gap: "10px",
              }}>
                <Tag color="var(--color-purple)">{rule.category || "general"}</Tag>
                <span style={{ fontSize: "0.78rem", color: "var(--text-main)", flex: 1, lineHeight: 1.6 }}>{rule.rule}</span>
                {rule.chapter_first_seen != null && (
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>第 {rule.chapter_first_seen} 章</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Scenes */}
        {!loading && tab === "scenes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {scenes.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "32px" }}>
                尚無場景資料。
              </p>
            )}
            {scenes.map((scene, i) => (
              <div key={i} className="glass-panel" style={{
                padding: "12px 14px", background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{scene.global_id || `s${i}`}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>{scene.title}</span>
                  {scene.location && <Tag color="var(--color-gold)">📍 {scene.location}</Tag>}
                  {scene.chapter != null && <Tag color="var(--text-muted)">第 {scene.chapter} 章</Tag>}
                </div>
                {scene.panel_description && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-main)", marginBottom: "6px", lineHeight: 1.5 }}>{scene.panel_description}</p>
                )}
                {scene.t2i_prompt && (
                  <div style={{
                    fontSize: "0.7rem", color: "var(--color-emerald)", fontFamily: "var(--font-mono)",
                    lineHeight: 1.5, background: "rgba(0,0,0,0.25)", borderRadius: "6px",
                    padding: "8px 10px", wordBreak: "break-all",
                  }}>
                    {scene.t2i_prompt.substring(0, 220)}{scene.t2i_prompt.length > 220 ? "…" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
