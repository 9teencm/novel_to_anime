import React, { useEffect, useRef } from 'react';

export default function ConsoleLogs({ logs, isRunning }) {
  const containerRef = useRef(null);

  // 當有新日誌進入時，自動滾動到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // 為不同 Agent 的日誌標題上色
  const formatLogLine = (line) => {
    if (!line) return null;
    
    let color = 'var(--text-main)';
    if (line.includes('[小說分析員]')) {
      color = 'var(--color-cyan)';
    } else if (line.includes('[動畫改編員]')) {
      color = 'var(--color-gold)';
    } else if (line.includes('[動畫導演]') || line.includes('[Director Agent]')) {
      color = 'var(--color-purple)';
    } else if (line.includes('[一致性管理員]')) {
      color = 'var(--color-emerald)';
    } else if (line.includes('[系統]')) {
      color = 'rgba(255,255,255,0.7)';
    } else if (line.includes('[錯誤]') || line.includes('[WARNING]') || line.includes('ERROR')) {
      color = 'var(--color-red)';
    } else if (line.startsWith('Agent') || line.startsWith('Task') || line.includes('Working Agent:')) {
      color = '#e2eafc';
    }

    return (
      <div key={Math.random()} style={{
        color: color,
        marginBottom: '4px',
        lineHeight: '1.4',
        fontSize: '0.75rem',
        wordBreak: 'break-all'
      }}>
        {line}
      </div>
    );
  };

  return (
    <div className="glass-panel console-logs-container" style={{
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'rgba(5, 6, 8, 0.95)',
      border: '1px solid rgba(255,255,255,0.06)',
      position: 'relative'
    }}>
      {/* Console Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: '6px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isRunning ? 'var(--color-cyan)' : 'var(--text-muted)',
            boxShadow: isRunning ? '0 0 8px var(--color-cyan)' : 'none'
          }} />
          <span>CrewAI Agent Terminal Console</span>
        </div>
        <div>
          {isRunning ? 'Orchestrating Agents...' : 'Ready'}
        </div>
      </div>

      {/* Terminal log logs viewport */}
      <div
        ref={containerRef}
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          paddingRight: '6px'
        }}
      >
        {logs.length === 0 ? (
          <div style={{
            color: 'rgba(255, 255, 255, 0.25)',
            fontSize: '0.75rem',
            textAlign: 'center',
            marginTop: '12px',
            fontStyle: 'italic'
          }}>
            Terminal is idle. Run Agent Pipeline to capture execution telemetry.
          </div>
        ) : (
          logs.map(line => formatLogLine(line))
        )}
      </div>
    </div>
  );
}
