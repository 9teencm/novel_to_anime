import React from 'react';
import { STORIES } from '../data/samples';

export default function NovelInput({ novelText, setNovelText, onSelectPreset, isRunning }) {
  return (
    <div className="glass-panel" style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      flexGrow: 1,
      minHeight: '260px'
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
        📖 小說章節輸入
      </h3>

      {/* Preset story selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>選擇小說範本：</label>
        <select
          onChange={(e) => {
            if (e.target.value) onSelectPreset(e.target.value);
          }}
          className="input-field"
          style={{ width: '100%', fontSize: '0.85rem' }}
          defaultValue="abyss"
          disabled={isRunning}
        >
          {STORIES.map(story => (
            <option key={story.id} value={story.id}>
              {story.title} ({story.genre})
            </option>
          ))}
          <option value="custom">✍️ 自定義故事內容...</option>
        </select>
      </div>

      {/* Chapter Text area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>小說章節內容：</label>
        <textarea
          value={novelText}
          onChange={(e) => setNovelText(e.target.value)}
          className="input-field"
          style={{
            width: '100%',
            flexGrow: 1,
            resize: 'none',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            background: 'rgba(0,0,0,0.2)',
            minHeight: '140px'
          }}
          disabled={isRunning}
          placeholder="在此輸入或貼上您想改編成動畫的小說章節內容..."
        />
      </div>
    </div>
  );
}
