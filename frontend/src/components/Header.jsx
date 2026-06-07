import React from 'react';

export default function Header({ isRunning, onRunPipeline, onReset, onExport, hasOutput, embedded = false }) {
  const buttons = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={onReset} className="btn-secondary" disabled={isRunning} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>重設</button>
      {hasOutput && (
        <button onClick={onExport} className="btn-secondary"
          style={{ borderColor: 'var(--color-purple)', padding: '5px 12px', fontSize: '0.78rem' }} disabled={isRunning}>
          匯出 JSON
        </button>
      )}
      <button onClick={onRunPipeline}
        className={`btn-primary ${isRunning ? 'pulse-active' : ''}`} disabled={isRunning}
        style={{ padding: '5px 14px', fontSize: '0.78rem' }}>
        {isRunning ? <><div className="spinner" /> 處理中...</> : <>🚀 執行 Pipeline</>}
      </button>
    </div>
  );

  if (embedded) return buttons;

  return (
    <header className="glass-panel" style={{
      margin: '12px 12px 0 12px', padding: '12px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '24px', zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'linear-gradient(135deg, var(--color-cyan), var(--color-purple))',
          borderRadius: '8px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 'bold', color: '#000',
          boxShadow: '0 0 15px rgba(0,242,254,0.3)'
        }}>N</div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.5px' }}>
            Novel-to-Animation OS
          </h1>
          <span style={{ fontSize: '0.75rem', color: isRunning ? 'var(--color-cyan)' : 'var(--text-muted)' }}>
            {isRunning ? '● Agent Pipeline Active' : '● Groq · llama-3.3-70b'}
          </span>
        </div>
      </div>
      {buttons}
    </header>
  );
}
