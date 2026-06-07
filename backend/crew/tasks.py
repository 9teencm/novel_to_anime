from crewai import Task
from pydantic import BaseModel, Field
from typing import List

# --- Pydantic 輸出結構定義 ---

class CharacterLocks(BaseModel):
    face: bool = True
    outfit: bool = True
    voice: bool = True

class CharacterInfo(BaseModel):
    name: str = Field(..., description="角色姓名")
    role: str = Field(..., description="主角、配角、反派等角色定位")
    appearance: str = Field(..., description="詳細的外貌特徵描述（包含髮型、髮色、瞳色、臉型、特定服飾標籤，用於 Prompt 一致性）")
    personality: str = Field(..., description="性格特點描述")
    relationship: str = Field(..., description="與其他角色的關係描述")
    locks: CharacterLocks = Field(default_factory=CharacterLocks, description="一致性鎖定狀態")

class CameraConfig(BaseModel):
    angle: str = Field(..., description="鏡頭角度，如：仰角(Low angle), 俯角(High angle), 平視(Eye level), 特寫(Close-up), 特寫臉部(Extreme close-up)")
    movement: str = Field(..., description="鏡頭運動，如：慢速推進(Slow zoom in), 慢速拉遠(Slow zoom out), 電影級橫移(Cinematic pan), 軌道環繞(Orbit), 震動(Shake)")

class SceneStoryboard(BaseModel):
    id: int = Field(..., description="分鏡編號，自 1 開始遞增")
    location: str = Field(..., description="場景發生的地理位置")
    time: str = Field(..., description="發生的時間或光影狀態，如：深夜、夕陽西下、清晨微光、正午烈日")
    atmosphere: str = Field(..., description="場景氛圍與環境，如：迷霧森林、霓虹閃爍、大雨滂沱")
    camera: CameraConfig = Field(..., description="鏡頭運鏡設定")
    dialogue: str = Field(..., description="本幕的旁白、台詞、或角色互動腳本")
    characters: List[str] = Field(..., description="本幕登場角色的姓名列表")
    image_prompt: str = Field(..., description="為生圖模型（如 Stable Diffusion / Flux）調製的英文 Prompt，需融合角色特徵、鏡頭描述與場景氣氛，並維持風格一致性描述")

class AnimationScript(BaseModel):
    characters: List[CharacterInfo] = Field(..., description="從小說提取出的角色資訊列表")
    scenes: List[SceneStoryboard] = Field(..., description="改編後的動畫分鏡場景列表")
    world_rules: List[str] = Field(..., description="小說的世界觀法則與環境設定列表")


# --- CrewAI 任務定義 ---

def create_novel_analysis_task(agent, novel_text: str) -> Task:
    return Task(
        description=(
            "分析以下小說章節內容：\n\n"
            f"\"\"\"\n{novel_text}\n\"\"\"\n\n"
            "你的任務是提煉出該章節的核心設定：\n"
            "1. 提取所有登場角色，詳細記錄姓名、定位（主角/配角）、外貌特徵（如髮型、瞳色、衣著描述）、性格與關係。\n"
            "2. 提取世界觀規則、環境設定或獨特的戰力/魔法系統。"
        ),
        expected_output="包含角色卡清單與世界觀設定的分析報告。",
        agent=agent
    )

def create_adaptation_task(agent, parent_task: Task) -> Task:
    return Task(
        description=(
            "根據前一步驟的小說分析結果，將該章節的文字情節改編為動畫分鏡劇本。\n"
            "你需要將情節以『場景轉換』為原則拆解成連續的多幕分鏡場景。\n"
            "每個場景要明確指出：發生的地點、發生的時間段、登場的演員、主要事件、以及本幕對應的台詞或旁白配音文字。"
        ),
        expected_output="拆解好場景與對白台詞的動畫分鏡大綱。",
        agent=agent,
        context=[parent_task]
    )

def create_director_task(agent, parent_task: Task) -> Task:
    return Task(
        description=(
            "根據改編過後的分鏡大綱，為每一幕分鏡加入導演指示 (Directing Instructions)。\n"
            "你需要為每個分鏡指定：\n"
            "1. 鏡頭視角 (Camera Angle) 和運鏡方式 (Camera Movement)。\n"
            "2. 畫面整體的環境氣氛 (Atmosphere) 與光影基調。\n"
            "請確保運鏡能服務於情節情緒起伏（例如：緊張時用手持震動或特寫，宏大時用拉遠或橫移）。"
        ),
        expected_output="包含鏡頭與氣氛控制指令的導演分鏡稿。",
        agent=agent,
        context=[parent_task]
    )

def create_consistency_task(agent, parent_task: Task) -> Task:
    return Task(
        description=(
            "根據導演分鏡稿與角色檔案，為每一幕生成最終的 AI 繪圖英文 Prompt (image_prompt)。\n"
            "這是為了確保後續生圖時角色不變臉、風格一致。\n"
            "要求：\n"
            "1. 對於出現在場景中的角色，請使用明確、具體的英文特徵標籤（例如：不要寫 'The handsome hero'，"
            "而要寫 'a young man with messy silver hair, piercing blue eyes, wearing a black leather cloak'）。\n"
            "2. 融合導演規劃的鏡頭（如：'close-up shot', 'cinematic pan'）與光影氣氛。\n"
            "3. 指定統一的美術風格後綴（如：'anime style, detailed graphic novel, 8k resolution, cinematic lighting'）。\n"
            "4. 將全部結果整理並輸出為符合規定的 JSON 格式。"
        ),
        expected_output="輸出完整的 JSON，包含 characters, scenes 和 world_rules。",
        agent=agent,
        context=[parent_task],
        output_json=AnimationScript
    )
