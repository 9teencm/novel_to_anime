import React from 'react';

export default function NodeWorkflow({
  novelText,
  characters,
  worldRules,
  scenes,
  isRunning,
  activeAgentIndex, // 0 = Novel Input, 1 = Analyzer, 2 = Adaptor, 3 = Director, 4 = Consistency, 5 = Render
  selectedNodeId,
  onSelectNode
}) {
  // 定義節點在畫布上的坐標與元數據
  const nodes = [
    {
      id: 'novel_input',
      title: '📖 小說文字輸入',
      type: 'input',
      x: 30,
      y: 180,
      status: activeAgentIndex === 0 ? 'processing' : activeAgentIndex > 0 ? 'success' : 'idle',
      details: `${novelText ? novelText.substring(0, 40) + '...' : '尚未輸入小說內容'}`,
      payload: { text: novelText }
    },
    {
      id: 'novel_analyzer',
      title: '🤖 小說分析 Agent',
      type: 'agent',
      x: 230,
      y: 70,
      status: activeAgentIndex === 1 ? 'processing' : activeAgentIndex > 1 ? 'success' : 'idle',
      details: characters.length > 0 ? `提取到 ${characters.length} 個角色，${worldRules.length} 條規則` : '提取小說世界觀、角色關係與特徵。',
      payload: { characters, worldRules }
    },
    {
      id: 'adaptation',
      title: '🎬 動畫改編 Agent',
      type: 'agent',
      x: 430,
      y: 290,
      status: activeAgentIndex === 2 ? 'processing' : activeAgentIndex > 2 ? 'success' : 'idle',
      details: scenes.length > 0 ? `已將故事分割為 ${scenes.length} 幕` : '將小說描述文字轉換為動畫分鏡劇本。',
      payload: { scenesCount: scenes.length }
    },
    {
      id: 'director',
      title: '🎥 導演運鏡 Agent',
      type: 'agent',
      x: 630,
      y: 70,
      status: activeAgentIndex === 3 ? 'processing' : activeAgentIndex > 3 ? 'success' : 'idle',
      details: scenes.length > 0 ? '注入鏡頭角度、相機運動、BGM 與節奏。' : '為分鏡大綱加入視覺導演控制指令。',
      payload: { cameraPresets: ['Slow Pan', 'Orbit', 'Zoom In', 'Tilt Up'] }
    },
    {
      id: 'consistency',
      title: '👤 角色一致性 Agent',
      type: 'agent',
      x: 830,
      y: 290,
      status: activeAgentIndex === 4 ? 'processing' : activeAgentIndex > 4 ? 'success' : 'idle',
      details: scenes.length > 0 ? '套用一致性特徵描述，生成生圖 prompt。' : '融合角色外貌與運鏡，合成生圖 Prompt。',
      payload: { locksCount: characters.filter(c => c.locks?.face || c.locks?.outfit).length }
    },
    {
      id: 'render_output',
      title: '📺 最終分鏡渲染',
      type: 'output',
      x: 1030,
      y: 180,
      status: activeAgentIndex === 5 ? 'processing' : activeAgentIndex > 4 ? 'success' : 'idle',
      details: scenes.length > 0 ? `已輸出 ${scenes.length} 個分鏡 Prompt 卡片` : '輸出時間軸編輯器所需的分鏡包。',
      payload: { scenes }
    }
  ];

  // 繪製節點連接的貝茲曲線
  const drawBezier = (x1, y1, x2, y2, isActive) => {
    // 輸出端往右 15px，輸入端往左 15px
    const startX = x1 + 180;
    const startY = y1 + 45;
    const endX = x2;
    const endY = y2 + 45;
    
    // 控制點
    const cp1X = startX + 80;
    const cp1Y = startY;
    const cp2X = endX - 80;
    const cp2Y = endY;

    return (
      <path
        key={`${x1}-${y1}-${x2}-${y2}`}
        d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
        fill="none"
        stroke={isActive ? 'var(--color-cyan)' : 'rgba(255, 255, 255, 0.08)'}
        strokeWidth={isActive ? '3' : '1.5'}
        strokeDasharray={isActive ? '6, 4' : 'none'}
        style={{
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
          animation: isActive ? 'dash 15s linear infinite' : 'none'
        }}
      />
    );
  };

  // 取得節點連接關係 (Node connections)
  const connections = [
    { from: 'novel_input', to: 'novel_analyzer' },
    { from: 'novel_analyzer', to: 'adaptation' },
    { from: 'adaptation', to: 'director' },
    { from: 'director', to: 'consistency' },
    { from: 'consistency', to: 'render_output' }
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '480px',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '8px',
      overflow: 'auto',
      border: '1px solid var(--border-color)'
    }}>
      {/* SVG Canvas for drawing paths */}
      <svg style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '480px',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        {connections.map((conn) => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          
          // 判斷該連接線是否處於激活（運算中或成功）狀態
          let isActive = false;
          if (isRunning) {
            const fromIdx = nodes.indexOf(fromNode);
            const toIdx = nodes.indexOf(toNode);
            isActive = activeAgentIndex >= fromIdx;
          } else if (scenes.length > 0) {
            isActive = true;
          }

          if (fromNode && toNode) {
            return drawBezier(fromNode.x, fromNode.y, toNode.x, toNode.y, isActive);
          }
          return null;
        })}
      </svg>

      {/* Nodes Container */}
      <div style={{ position: 'relative', width: '100%', height: '480px', zIndex: 2 }}>
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const statusColors = {
            processing: 'var(--color-cyan)',
            success: 'var(--color-emerald)',
            idle: 'var(--border-color)'
          };

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node)}
              className="glass-panel"
              style={{
                position: 'absolute',
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: '180px',
                minHeight: '90px',
                padding: '10px',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--color-cyan)' : `1px solid ${statusColors[node.status]}`,
                background: node.status === 'processing' ? 'rgba(0, 242, 254, 0.05)' : 'var(--panel-bg)',
                boxShadow: isSelected 
                  ? '0 0 15px rgba(0, 242, 254, 0.2)' 
                  : node.status === 'processing' 
                  ? '0 0 10px rgba(0, 242, 254, 0.15)' 
                  : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.2s ease',
                zIndex: isSelected ? 5 : 2
              }}
            >
              {/* Node Header */}
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>{node.title}</span>
                {node.status === 'processing' && (
                  <span className="node-status-glow" style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--color-cyan)',
                    boxShadow: '0 0 8px var(--color-cyan)'
                  }} />
                )}
                {node.status === 'success' && (
                  <span style={{ color: 'var(--color-emerald)', fontSize: '0.7rem' }}>✓</span>
                )}
              </div>

              {/* Node Details / Description */}
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                lineHeight: '1.3',
                flexGrow: 1,
                wordBreak: 'break-all'
              }}>
                {node.details}
              </div>

              {/* Node ports visual */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'auto',
                padding: '0 4px',
                position: 'relative'
              }}>
                {/* Input pin */}
                {node.type !== 'input' && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: node.status === 'idle' ? 'var(--border-color)' : 'var(--color-cyan)',
                    position: 'absolute',
                    left: '-14px',
                    bottom: '2px',
                    border: '1px solid #000'
                  }} />
                )}
                
                {/* Output pin */}
                {node.type !== 'output' && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: node.status === 'success' ? 'var(--color-cyan)' : 'var(--border-color)',
                    position: 'absolute',
                    right: '-14px',
                    bottom: '2px',
                    border: '1px solid #000'
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS for animating dash array paths */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
      `}} />
    </div>
  );
}
