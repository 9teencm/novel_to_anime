import os
from crewai import Agent, LLM
from backend.crew.skills import (
    get_analyzer_tools,
    get_adaptation_tools,
    get_director_tools,
    get_consistency_tools,
)


def get_llm(provider: str, api_key: str, model_name: str = None):
    """
    根據使用者選擇的 provider 與 API key 動態建立 CrewAI LLM 實例，
    包裝內部的 Langchain 實例，防止 Pydantic 類型檢查出錯。
    """
    if provider == "gemini":
        model = model_name or "gemini-1.5-flash"
        if not model.startswith("gemini/"):
            model = f"gemini/{model}"
        return LLM(model=model, api_key=api_key, temperature=0.3)
    elif provider == "openai":
        model = model_name or "gpt-4o-mini"
        return LLM(model=model, api_key=api_key, temperature=0.3)
    else:
        if os.environ.get("GEMINI_API_KEY"):
            return LLM(
                model="gemini/gemini-1.5-flash",
                api_key=os.environ.get("GEMINI_API_KEY"),
                temperature=0.3,
            )
        elif os.environ.get("OPENAI_API_KEY"):
            return LLM(
                model="gpt-4o-mini",
                api_key=os.environ.get("OPENAI_API_KEY"),
                temperature=0.3,
            )
        else:
            raise ValueError("未提供有效的 LLM API 金鑰且環境變數未設定。")


def create_novel_analyzer_agent(llm) -> Agent:
    """
    小說分析員 — Novel Analyzer Agent

    Skills:
      - CharacterExtractorTool  : 提取角色資訊 → 寫入 CharacterDB
      - WorldRuleExtractorTool  : 提取世界觀規則 → 寫入 WorldDB
      - EmotionToneTool         : 分析章節情緒基調 → 供 Director 參考
    """
    return Agent(
        role="小說世界觀與角色分析專家 (Novel Analyzer Agent)",
        goal=(
            "分析小說章節內容，精確提煉出登場人物卡（含外貌、特徵、服裝）、"
            "世界觀設定、故事發展節點與關鍵事件線。"
            "使用 CharacterExtractorTool 將角色資訊持久化，"
            "使用 WorldRuleExtractorTool 儲存世界觀規則，"
            "使用 EmotionToneTool 分析章節情緒基調。"
        ),
        backstory=(
            "你是一位資深的文學編輯與動漫編劇助理。你對小說結構有敏銳的洞察力，"
            "能從小說的字裡行間抽絲剝繭，精確整理出每個登場角色的詳細人物檔案"
            "（包含姓名、外貌描述、性格、身分）"
            "以及故事發生的背景法則（戰力系統、世界規則、場景地圖）。\n\n"
            "【工具使用指引】\n"
            "1. 先閱讀全文，整理角色清單，以 JSON 陣列格式呼叫 CharacterExtractorTool。\n"
            "2. 識別所有世界觀規則後，呼叫 WorldRuleExtractorTool 分批寫入（依類別分類）。\n"
            "3. 最後呼叫 EmotionToneTool 分析本章的主要情緒基調。"
        ),
        tools=get_analyzer_tools(),
        verbose=True,
        llm=llm,
        max_rpm=10,
        allow_delegation=False,
    )


def create_adaptation_agent(llm) -> Agent:
    """
    動畫改編員 — Adaptation Agent

    Skills:
      - SceneSegmenterTool    : 偵測切割點，建議場景分割方案
      - DialogueExtractorTool : 提取對白與旁白
      - PacingAdvisorTool     : 給出故事類型對應的節奏建議
    """
    return Agent(
        role="動畫編劇與分鏡改編師 (Adaptation Agent)",
        goal=(
            "將小說純文字內容轉換為動畫語言，拆解成連續的動畫分鏡場景，並分配台詞與旁白。"
            "使用 SceneSegmenterTool 取得最佳切割方案，"
            "使用 DialogueExtractorTool 整理台詞，"
            "使用 PacingAdvisorTool 獲取節奏建議後融入分鏡設計。"
        ),
        backstory=(
            "你是一位專業的動畫編劇與分鏡改編師。你深知『小說語言不等於動畫視覺語言』。\n\n"
            "【工具使用指引】\n"
            "1. 呼叫 SceneSegmenterTool 取得場景切割建議，依此拆分情節。\n"
            "2. 呼叫 DialogueExtractorTool 提取所有對白與旁白，分配到對應場景。\n"
            "3. 呼叫 PacingAdvisorTool 取得節奏建議，調整場景長短與切換方式。\n"
            "4. 整合以上資訊，輸出每幕包含地點/時間/人物/台詞的完整分鏡大綱。"
        ),
        tools=get_adaptation_tools(),
        verbose=True,
        llm=llm,
        max_rpm=10,
        allow_delegation=False,
    )


def create_director_agent(llm) -> Agent:
    """
    動畫導演 — Director Agent

    Skills:
      - CameraPresetLibraryTool : 查詢場景類型對應的鏡頭預設
      - MoodBoardTool           : 情緒 → 色彩/光影映射
      - SoundscapeAdvisorTool   : 建議 BGM 與音效設計
    """
    return Agent(
        role="動畫導演與運鏡大師 (Director Agent)",
        goal=(
            "為每一個分鏡場景注入導演指導，包含鏡頭運動軌跡、視角、畫面節奏、"
            "情緒氛圍及配樂風格。"
            "使用 CameraPresetLibraryTool 查詢推薦鏡頭，"
            "使用 MoodBoardTool 取得視覺氣氛方案，"
            "使用 SoundscapeAdvisorTool 設計聲音景觀。"
        ),
        backstory=(
            "你是一位榮獲大獎的 3D/2D 動畫導演。你對視覺節奏有著極致的要求。\n\n"
            "【工具使用指引】\n"
            "1. 對每個場景，先判斷其類型（combat/dialogue/landscape 等），"
            "呼叫 CameraPresetLibraryTool 取得 3 個鏡頭選項後，選擇最符合情節的一個。\n"
            "2. 呼叫 MoodBoardTool 取得色彩與光影方案，寫入場景的 atmosphere 描述。\n"
            "3. 呼叫 SoundscapeAdvisorTool 取得 BGM 與音效建議，附加到場景的音效欄位。"
        ),
        tools=get_director_tools(),
        verbose=True,
        llm=llm,
        max_rpm=10,
        allow_delegation=False,
    )


def create_consistency_agent(llm) -> Agent:
    """
    一致性管理員 — Character Consistency Agent

    Skills:
      - CharacterDBLookupTool : 查詢 CharacterDB 取得外貌標籤
      - PromptBuilderTool     : 組裝結構化 Text-to-Image Prompt
      - StyleLockTool         : 強制注入統一美術風格後綴
    """
    return Agent(
        role="角色造型與生圖 Prompt 工程師 (Character Consistency Agent)",
        goal=(
            "確保所有場景中的角色外貌在不同畫面中保持高度一致，"
            "並為每個分鏡合成出最終的 Text-to-Image 生成提示詞。"
            "使用 CharacterDBLookupTool 從記憶體取得角色標籤，"
            "使用 PromptBuilderTool 組裝標準 Prompt，"
            "最後使用 StyleLockTool 鎖定統一風格後綴。"
        ),
        backstory=(
            "你是一位 AI 繪圖專家與 Prompt 工程師。"
            "你非常了解 AI 繪圖（如 Midjourney, Stable Diffusion）中角色容易『變臉』的痛點。\n\n"
            "【工具使用指引】\n"
            "1. 對每個場景中出現的角色，呼叫 CharacterDBLookupTool 取得標準外貌標籤。\n"
            "2. 呼叫 PromptBuilderTool，傳入角色標籤、場景描述、鏡頭與情緒，組裝初稿 Prompt。\n"
            "3. 呼叫 StyleLockTool 注入統一的美術風格後綴（默認 anime），產出最終 image_prompt。\n"
            "4. 將所有結果整合為符合 AnimationScript schema 的完整 JSON 輸出。"
        ),
        tools=get_consistency_tools(),
        verbose=True,
        llm=llm,
        max_rpm=10,
        allow_delegation=False,
    )
