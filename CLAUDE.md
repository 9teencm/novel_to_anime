# Novel-to-Animation OS

小說轉動畫多 Agent 系統。輸入一段小說文字，由四個專責 Agent 協同產出動畫製作所需的完整分析與素材。

## Agent Team 架構

```
Orchestrator（主控）
├── Novel Analyzer      → 角色/世界觀/情緒分析
├── Adaptation Agent    → 場景分割/對白提取/節奏建議
├── Director Agent      → 鏡頭語言/情緒視覺/音景建議
└── Consistency Agent   → T2I prompt 組裝/風格鎖定
```

## 執行流程

1. 讀取 `agents/analyzer.md` → 分析小說，產出角色與世界觀 JSON
2. 讀取 `agents/adaptation.md` → 場景分割與對白提取
3. 讀取 `agents/director.md` → 鏡頭與情緒視覺方案
4. 讀取 `agents/consistency.md` → 組裝最終 T2I prompt

每個 Agent 的輸出作為下一個 Agent 的輸入上下文。

## 輸出格式

最終輸出為 JSON，包含：
- `characters`：角色列表與外觀 tags
- `world_rules`：世界觀規則
- `scenes`：場景列表（含鏡頭、情緒、T2I prompt）
- `style`：全片風格設定

## 專案目錄

```
backend/
  main.py              FastAPI 入口
  crew/
    pipeline.py        Agent 編排邏輯
    agents/            各 Agent prompt 定義
      analyzer.md
      adaptation.md
      director.md
      consistency.md
```
