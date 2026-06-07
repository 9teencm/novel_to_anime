import React from 'react';

export default function Inspector({
  selectedItem, // type: 'scene' | 'node', data: scene object or node object
  onUpdateScene,
  isRunning
}) {
  if (!selectedItem) {
    return (
      <div className="glass-panel" style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)',
        textAlign: 'center',
        gap: '8px'
      }}>
        <div style={{ fontSize: '2rem' }}>🔍</div>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>屬性屬性檢視器 (Inspector)</h4>
        <p style={{ fontSize: '0.75rem', maxWidth: '180px', lineHeight: '1.3' }}>
          在時間軸中點選「分鏡卡片」，或是在工作流中點選「節點」以編輯屬性。
        </p>
      </div>
    );
  }

  // 1. 處理分鏡卡片編輯
  if (selectedItem.type === 'scene') {
    const scene = selectedItem.data;

    const handleChange = (field, value) => {
      const updated = { ...scene, [field]: value };
      onUpdateScene(updated);
    };

    const handleCameraChange = (field, value) => {
      const updated = {
        ...scene,
        camera: {
          ...scene.camera,
          [field]: value
        }
      };
      onUpdateScene(updated);
    };

    return (
      <div className="glass-panel" style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        overflowY: 'auto'
      }}>
        <h3 style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🎬 編輯分鏡 Scene {scene.id}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-cyan)', background: 'rgba(0,242,254,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
            分鏡節點
          </span>
        </h3>

        {/* Location & Time */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>場景地點：</label>
            <input
              type="text"
              value={scene.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="input-field"
              style={{ fontSize: '0.8rem', padding: '6px' }}
              disabled={isRunning}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>時間光影：</label>
            <input
              type="text"
              value={scene.time}
              onChange={(e) => handleChange('time', e.target.value)}
              className="input-field"
              style={{ fontSize: '0.8rem', padding: '6px' }}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Atmosphere */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>場景氛圍與環境描述：</label>
          <input
            type="text"
            value={scene.atmosphere}
            onChange={(e) => handleChange('atmosphere', e.target.value)}
            className="input-field"
            style={{ fontSize: '0.8rem', padding: '6px' }}
            disabled={isRunning}
          />
        </div>

        {/* Camera Angle & Movement */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>鏡頭視角：</label>
            <select
              value={scene.camera?.angle || ''}
              onChange={(e) => handleCameraChange('angle', e.target.value)}
              className="input-field"
              style={{ fontSize: '0.8rem', padding: '6px' }}
              disabled={isRunning}
            >
              <option value="遠景 (Wide angle shot)">遠景 (Wide shot)</option>
              <option value="中景 (Medium shot)">中景 (Medium shot)</option>
              <option value="特寫 (Close-up shot)">特寫 (Close-up)</option>
              <option value="特寫臉部 (Extreme close-up)">特寫臉部 (Macro)</option>
              <option value="低角度仰視 (Low angle shot)">低角度仰視 (Low angle)</option>
              <option value="俯瞰角度 (High angle shot)">俯瞰角度 (High angle)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>運鏡運動：</label>
            <select
              value={scene.camera?.movement || ''}
              onChange={(e) => handleCameraChange('movement', e.target.value)}
              className="input-field"
              style={{ fontSize: '0.8rem', padding: '6px' }}
              disabled={isRunning}
            >
              <option value="定鏡 (Static shot)">定鏡 (Static)</option>
              <option value="慢速推進 (Slow zoom in)">慢速推進 (Zoom In)</option>
              <option value="慢速拉遠 (Slow zoom out)">慢速拉遠 (Zoom Out)</option>
              <option value="電影級橫移 (Cinematic pan)">電影級橫移 (Pan)</option>
              <option value="軌道環繞 (Orbit)">軌道環繞 (Orbit)</option>
              <option value="鏡頭震動 (Camera shake)">鏡頭震動 (Shake)</option>
            </select>
          </div>
        </div>

        {/* Dialogue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>台詞配音 / 旁白文字：</label>
          <textarea
            value={scene.dialogue}
            onChange={(e) => handleChange('dialogue', e.target.value)}
            className="input-field"
            style={{
              fontSize: '0.8rem',
              lineHeight: '1.4',
              padding: '6px',
              height: '60px',
              resize: 'none',
              fontFamily: 'inherit'
            }}
            disabled={isRunning}
          />
        </div>

        {/* Prompt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>影像生成 Prompt (SD / Flux / Midjourney)：</label>
          <textarea
            value={scene.image_prompt}
            onChange={(e) => handleChange('image_prompt', e.target.value)}
            className="input-field"
            style={{
              fontSize: '0.75rem',
              lineHeight: '1.4',
              padding: '6px',
              flexGrow: 1,
              resize: 'none',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(0,0,0,0.15)',
              minHeight: '100px'
            }}
            disabled={isRunning}
          />
        </div>
      </div>
    );
  }

  // 2. 處理工作流節點檢視
  if (selectedItem.type === 'node') {
    const node = selectedItem.data;

    return (
      <div className="glass-panel" style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        overflowY: 'auto'
      }}>
        <h3 style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🔍 節點數據：{node.title}</span>
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(157, 78, 221, 0.15)',
            color: 'var(--color-purple)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(157,78,221,0.2)'
          }}>
            {node.id.toUpperCase()}
          </span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>節點說明：</span>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
            {node.details}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>輸出 Payload (JSON 內容)：</span>
          <pre style={{
            background: '#07080a',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            overflowX: 'auto',
            flexGrow: 1,
            color: 'var(--color-emerald)',
            lineHeight: '1.3'
          }}>
            {JSON.stringify(node.payload, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return null;
}
