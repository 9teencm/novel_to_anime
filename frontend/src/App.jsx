import React, { useState } from 'react';
import Header from './components/Header';
import NovelInput from './components/NovelInput';
import WorldviewDB from './components/WorldviewDB';
import TimelineEditor from './components/TimelineEditor';
import NodeWorkflow from './components/NodeWorkflow';
import Inspector from './components/Inspector';
import ConsoleLogs from './components/ConsoleLogs';
import ProductionBible from './components/ProductionBible';
import NovelManager from './components/NovelManager';
import ChapterVault from './components/ChapterVault';
import StoryboardGallery from './components/StoryboardGallery';
import { STORIES } from './data/samples';

function mapScenes(backendScenes, storyboard) {
  return backendScenes.map((scene, i) => {
    const board = storyboard?.find(b => b.scene_id === scene.scene_id) || {};
    const dialogueLines = (scene.dialogues || [])
      .map(d => `${d.speaker}：「${d.line}」`).join('\n');
    return {
      id: scene.scene_id || i + 1,
      title: scene.title || `Scene ${i + 1}`,
      location: scene.location || '',
      time: scene.time_of_day || '',
      atmosphere: scene.narration || '',
      camera: { angle: '', movement: '' },
      dialogue: dialogueLines || scene.narration || '',
      characters: scene.characters_in_scene || [],
      image_prompt: board.t2i_prompt || '',
      panel_description: board.panel_description || '',
      negative_prompt: board.negative_prompt || '',
    };
  });
}

// ── Novel Workspace (entered after selecting a novel) ─────────────────────────
function NovelWorkspace({ novel, onBack }) {
  const [isRunning, setIsRunning] = useState(false);
  const [novelText, setNovelText] = useState('');
  const [characters, setCharacters] = useState([]);
  const [worldRules, setWorldRules] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [logs, setLogs] = useState([`[系統] 已進入《${novel.title}》工作區。貼入章節內容並執行 Pipeline。`]);
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [storyboard, setStoryboard] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeAgentIndex, setActiveAgentIndex] = useState(-1);
  const [chapterNumber, setChapterNumber] = useState(1);

  const handleSelectPreset = (storyId) => {
    if (storyId === 'custom') {
      setNovelText(''); setCharacters([]); setWorldRules([]); setScenes([]);
      setLogs([`[系統] 已清空。請貼入章節內容。`]);
      setSelectedSceneId(null);
    } else {
      const story = STORIES.find(s => s.id === storyId);
      if (story) {
        setNovelText(story.content); setCharacters(story.characters);
        setWorldRules(story.world_rules); setScenes(story.scenes);
        setLogs(['[系統] 範本已載入。']); setSelectedSceneId(story.scenes[0]?.id || null);
      }
    }
  };

  const handleReset = () => {
    setNovelText(''); setCharacters([]); setWorldRules([]); setScenes([]);
    setLogs([`[系統] 已重設《${novel.title}》工作區。`]);
    setSelectedSceneId(null); setActiveAgentIndex(-1); setStoryboard([]);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ novel: novel.title, characters, worldRules, scenes }, null, 2)
    );
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `${novel.title}_ch${chapterNumber}_${Date.now()}.json`);
    document.body.appendChild(a); a.click(); a.remove();
  };

  const handleUpdateScene = (updated) => setScenes(scenes.map(s => s.id === updated.id ? updated : s));

  const handleRunPipeline = async () => {
    if (!novelText.trim()) { alert("請輸入小說章節內容。"); return; }
    setIsRunning(true); setActiveAgentIndex(1);
    setLogs([`[系統] 連線後端，啟動 Pipeline（第 ${chapterNumber} 章）...`]);
    try {
      const response = await fetch('http://localhost:8000/api/run-crew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novel_text: novelText, novel_id: novel.id, chapter_number: chapterNumber })
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.detail || '後端執行失敗'); }
      const data = await response.json();
      if (data.status === 'success') {
        const result = data.result;
        const logLines = data.logs ? data.logs.split('\n').filter(l => l.trim()) : [];
        setActiveAgentIndex(2); setCharacters(result.characters || []);
        setActiveAgentIndex(3); setWorldRules((result.world_rules || []).map(r => typeof r === 'string' ? r : r.rule));
        setActiveAgentIndex(4);
        const mappedScenes = mapScenes(result.scenes || [], result.storyboard || []);
        setScenes(mappedScenes);
        setStoryboard(result.storyboard || []);
        if (mappedScenes.length > 0) setSelectedSceneId(mappedScenes[0].id);
        // Auto-save timeline for this chapter
        fetch(`http://localhost:8000/api/novels/${novel.id}/timeline/${chapterNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: result.scenes || [],
            storyboard: result.storyboard || [],
            characters: result.characters || [],
            world_rules: result.world_rules || [],
          }),
        }).catch(() => {});  // non-blocking
        setLogs([...logLines, `[系統] ✅ 完成！${mappedScenes.length} 場景，${result.characters?.length || 0} 角色。`]);
      } else { throw new Error('後端回傳非 success 狀態'); }
    } catch (err) {
      setLogs(prev => [...prev, `[錯誤] ${err.message}`, '[系統] 請確認 uvicorn 已啟動且 GROQ_API_KEY 已設定。']);
    } finally { setIsRunning(false); setActiveAgentIndex(-1); }
  };

  const getInspectorItem = () => {
    if (selectedNode) return { type: 'node', data: selectedNode };
    if (selectedSceneId !== null) { const s = scenes.find(s => s.id === selectedSceneId); if (s) return { type: 'scene', data: s }; }
    return null;
  };

  return (
    <div className="app-container">
      <div className="blueprint-bg" />
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 24px', borderBottom: '1px solid var(--border-color)',
        background: 'rgba(7,8,10,0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100, height: '56px',
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: '1px solid var(--border-color)',
          color: 'var(--text-muted)', borderRadius: '6px', padding: '4px 10px',
          fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
        }}>← 小說總管</button>
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>{novel.title}</span>
        {novel.genre && (
          <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: '999px', border: '1px solid var(--color-purple)', color: 'var(--color-purple)', background: 'rgba(157,78,221,0.1)' }}>
            {novel.genre}
          </span>
        )}
        {/* Chapter number selector */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>章節：</span>
          <input type="number" min="1" value={chapterNumber} onChange={e => setChapterNumber(Number(e.target.value))}
            style={{ width: '72px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', padding: '5px 8px', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }} />
        </div>
        <Header
          isRunning={isRunning} onRunPipeline={handleRunPipeline}
          onReset={handleReset} onExport={handleExport} hasOutput={scenes.length > 0}
          embedded={true}
        />
      </div>

      <main className="dashboard-layout">
        <section className="section-inputs">
          <NovelInput novelText={novelText} setNovelText={setNovelText} onSelectPreset={handleSelectPreset} isRunning={isRunning} />
          <WorldviewDB characters={characters} setCharacters={setCharacters} worldRules={worldRules} setWorldRules={setWorldRules} isRunning={isRunning} />
        </section>
        <section className="section-workspace">
          <div className="center-workspace">
            <div className="tabs-header">
              <button onClick={() => { setActiveTab('timeline'); setSelectedNode(null); }} className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}>🎬 分鏡時間軸</button>
              <button onClick={() => { setActiveTab('workflow'); setSelectedSceneId(null); }} className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}>🕸️ 工作流畫布</button>
              <button onClick={() => setActiveTab('bible')} className={`tab-btn ${activeTab === 'bible' ? 'active' : ''}`}>📖 製作聖經</button>
              <button onClick={() => setActiveTab('vault')} className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`}>📂 章節文本庫</button>
              <button onClick={() => setActiveTab('gallery')} className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}>🎞️ 影片生成</button>
            </div>
            <div className="glass-panel" style={{ flexGrow: 1, padding: '16px', overflow: 'hidden' }}>
              {activeTab === 'timeline' ? (
                <TimelineEditor
                  scenes={scenes}
                  selectedSceneId={selectedSceneId}
                  onSelectScene={(id) => { setSelectedSceneId(id); setSelectedNode(null); }}
                  novelId={novel.id}
                  storyboard={storyboard}
                />
              ) : activeTab === 'workflow' ? (
                <NodeWorkflow novelText={novelText} characters={characters} worldRules={worldRules} scenes={scenes} isRunning={isRunning} activeAgentIndex={activeAgentIndex} selectedNodeId={selectedNode?.id || null} onSelectNode={(node) => { setSelectedNode(node); setSelectedSceneId(null); }} />
              ) : activeTab === 'vault' ? (
                <ChapterVault
                  novelId={novel.id}
                  currentChapter={chapterNumber}
                  currentText={novelText}
                  onLoadChapter={(num, text, timeline) => {
                    setChapterNumber(num);
                    setNovelText(text);
                    if (timeline) {
                      const mapped = mapScenes(timeline.scenes || [], timeline.storyboard || []);
                      setScenes(mapped);
                      setStoryboard(timeline.storyboard || []);
                      setCharacters(timeline.characters || []);
                      setWorldRules((timeline.world_rules || []).map(r => typeof r === 'string' ? r : r.rule));
                      if (mapped.length > 0) setSelectedSceneId(mapped[0].id);
                    }
                    setActiveTab('timeline');
                  }}
                />
              ) : activeTab === 'gallery' ? (
                <StoryboardGallery novelId={novel.id} scenes={scenes} storyboard={storyboard} />
              ) : (
                <ProductionBible novelId={novel.id} />
              )}
            </div>
          </div>
          <div className="sticky-inspector">
            <Inspector selectedItem={getInspectorItem()} onUpdateScene={handleUpdateScene} isRunning={isRunning} />
          </div>
        </section>
        <section className="section-console">
          <ConsoleLogs logs={logs} isRunning={isRunning} />
        </section>
      </main>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [currentNovel, setCurrentNovel] = useState(null);

  if (currentNovel) {
    return <NovelWorkspace novel={currentNovel} onBack={() => setCurrentNovel(null)} />;
  }

  return (
    <div className="app-container">
      <div className="blueprint-bg" />
      {/* Home header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 32px',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(7,8,10,0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100, height: '56px', gap: '12px',
      }}>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-cyan)', letterSpacing: '0.5px' }}>
          🎬 Novel-to-Animation OS
        </span>
      </div>
      {/* Novel Manager full page */}
      <div style={{ maxWidth: '1400px', minWidth: '1100px', width: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        <NovelManager onEnterNovel={(novel) => setCurrentNovel(novel)} />
      </div>
    </div>
  );
}
