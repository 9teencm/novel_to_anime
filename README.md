# Novel-to-Animation OS

小說轉動畫多 Agent 系統 — 輸入一段小說文字，由四個專責 Agent 協同產出動畫製作所需的完整分析與素材，並透過 AI 圖像生成與影片合成自動生成動畫片段。

## 功能特色

- **多 Agent 協作**：Analyzer → Adaptation → Director → Consistency 四個 Agent 串連，逐步分析小說並產出分鏡腳本
- **AI 圖像生成**：透過 Groq LLM 組裝 T2I prompt，呼叫多種圖像生成後端（fal.ai、HuggingFace Spaces、Replicate、Kling）
- **Ken Burns 影片合成**：對分鏡圖套用 zoompan 動態效果，配合 ASS 字幕，透過 FFmpeg 輸出影片
- **ComfyUI Wan2.1-I2V 整合**（開發中）：透過 Tailscale VPN 呼叫遠端 GPU，以 Wan2.1-I2V-14B-480P 生成 AI 動態影片

## Agent 架構

```
Orchestrator（主控）
├── Novel Analyzer      → 角色 / 世界觀 / 情緒分析
├── Adaptation Agent    → 場景分割 / 對白提取 / 節奏建議
├── Director Agent      → 鏡頭語言 / 情緒視覺 / 音景建議
└── Consistency Agent   → T2I prompt 組裝 / 風格鎖定
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | Python 3.11 / FastAPI |
| 前端 | React 18 + Vite |
| LLM | Groq（llama-3.3-70b）/ Anthropic（備用） |
| 影片合成 | FFmpeg（Ken Burns zoompan + ASS 字幕） |
| AI 影片（開發中） | ComfyUI + Wan2.1-I2V-14B-480P（RTX 4000 Ada） |

## 快速開始

### 環境需求

- Python 3.11+
- Node.js 18+
- FFmpeg（加入 PATH）

### 安裝

```bash
# 後端
cd backend
pip install -r requirements.txt
cp .env.example .env   # 填入你的 API key

# 前端
cd frontend
npm install
```

### 執行

```bash
# 後端（開發模式）
cd backend
uvicorn main:app --reload --port 8000

# 前端
cd frontend
npm run dev
```

前端預設於 http://localhost:5173，後端 API 於 http://localhost:8000。

## 環境變數

複製 `backend/.env.example` 為 `backend/.env` 並填入：

```env
GROQ_API_KEY=gsk_your_key_here

# 多 key rotation（選填，最多 4 個 Groq 帳號）
# GROQ_API_KEY_1=...
# GROQ_API_KEY_2=...
# GROQ_API_KEY_3=...
# GROQ_API_KEY_4=...

ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## 目錄結構

```
backend/
  main.py                  FastAPI 入口
  requirements.txt
  .env.example
  crew/
    pipeline.py            Agent 編排邏輯
    agents.py              Agent 定義
    datastore.py           資料存取
    video_gen.py           Ken Burns 影片合成
    image_gen.py           圖像生成主控
    fal_gen.py             fal.ai 後端
    hf_spaces_gen.py       HuggingFace Spaces 後端
    replicate_gen.py       Replicate 後端
    kling_gen.py           Kling 後端
    agents/
      analyzer.md          Novel Analyzer prompt
      adaptation.md        Adaptation Agent prompt
      director.md          Director Agent prompt
      consistency.md       Consistency Agent prompt
    skills/
      adaptation_skills.py
      director_skills.py
frontend/
  src/
    App.jsx
    components/
      StoryboardGallery.jsx
      ProductionBible.jsx
      TimelineEditor.jsx
```

## 授權

MIT License
