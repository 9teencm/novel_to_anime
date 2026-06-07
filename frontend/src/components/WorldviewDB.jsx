import React, { useState } from 'react';

export default function WorldviewDB({
  characters,
  setCharacters,
  worldRules,
  setWorldRules,
  isRunning
}) {
  const [newRule, setNewRule] = useState('');

  const toggleLock = (charIndex, lockType) => {
    if (isRunning) return;
    const updated = [...characters];
    updated[charIndex] = {
      ...updated[charIndex],
      locks: {
        ...updated[charIndex].locks,
        [lockType]: !updated[charIndex].locks[lockType]
      }
    };
    setCharacters(updated);
  };

  const handleCharAppearanceChange = (charIndex, value) => {
    const updated = [...characters];
    updated[charIndex] = {
      ...updated[charIndex],
      appearance: value
    };
    setCharacters(updated);
  };

  const addRule = (e) => {
    e.preventDefault();
    if (!newRule.trim() || isRunning) return;
    setWorldRules([...worldRules, newRule.trim()]);
    setNewRule('');
  };

  const removeRule = (idx) => {
    if (isRunning) return;
    setWorldRules(worldRules.filter((_, i) => i !== idx));
  };

  return (
    <div className="glass-panel" style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      height: '100%',
      maxHeight: '420px',
      overflowY: 'auto'
    }}>
      <h3 style={{
        fontSize: '0.95rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '8px'
      }}>
        🗄️ 世界觀與角色記憶庫
      </h3>

      {/* Characters List Section */}
      <div>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', marginBottom: '8px', letterSpacing: '0.5px' }}>
          登場角色一致性 (Character DB)
        </h4>

        {characters.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
            尚未提取角色。執行管道後將自動識別。
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {characters.map((char, idx) => (
              <div key={idx} className="glass-panel" style={{
                padding: '10px',
                background: 'rgba(255,255,255,0.01)',
                fontSize: '0.8rem',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                {/* Char Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {char.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({char.role})</span>
                  </span>
                  
                  {/* Locks toggles */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => toggleLock(idx, 'face')}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        border: '1px solid',
                        background: char.locks?.face ? 'rgba(6, 214, 160, 0.15)' : 'transparent',
                        borderColor: char.locks?.face ? 'var(--color-emerald)' : 'var(--border-color)',
                        color: char.locks?.face ? 'var(--color-emerald)' : 'var(--text-muted)'
                      }}
                      title="鎖定臉部特徵，避免生圖變臉"
                      disabled={isRunning}
                    >
                      👤 鎖臉
                    </button>
                    <button
                      onClick={() => toggleLock(idx, 'outfit')}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        border: '1px solid',
                        background: char.locks?.outfit ? 'rgba(157, 78, 221, 0.15)' : 'transparent',
                        borderColor: char.locks?.outfit ? 'var(--color-purple)' : 'var(--border-color)',
                        color: char.locks?.outfit ? 'var(--color-purple)' : 'var(--text-muted)'
                      }}
                      title="鎖定衣服，確保衣服樣式不變"
                      disabled={isRunning}
                    >
                      🧥 鎖衣
                    </button>
                  </div>
                </div>

                {/* Appearance description input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>外貌特徵 (AI Prompt 描述)：</span>
                  <textarea
                    value={char.appearance}
                    onChange={(e) => handleCharAppearanceChange(idx, e.target.value)}
                    className="input-field"
                    style={{
                      fontSize: '0.75rem',
                      lineHeight: '1.3',
                      padding: '4px 6px',
                      height: '52px',
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: 'rgba(0,0,0,0.1)'
                    }}
                    disabled={isRunning}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* World Rules Section */}
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', letterSpacing: '0.5px' }}>
          世界觀設定 (World rules)
        </h4>

        {worldRules.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
            尚未設定世界觀規則。
          </p>
        ) : (
          <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {worldRules.map((rule, idx) => (
              <li key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ wordBreak: 'break-all' }}>{rule}</span>
                <button
                  onClick={() => removeRule(idx)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-red)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    lineHeight: '1'
                  }}
                  disabled={isRunning}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addRule} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <input
            type="text"
            placeholder="新增世界觀設定，如：此處無法使用靈力"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.75rem', padding: '4px 8px', flexGrow: 1 }}
            disabled={isRunning}
          />
          <button
            type="submit"
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            disabled={isRunning}
          >
            +
          </button>
        </form>
      </div>
    </div>
  );
}
