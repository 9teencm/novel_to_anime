# backend/crew/skills/director_skills.py
"""
Director Agent 的專屬工具集。

工具清單：
  1. CameraPresetLibraryTool — 查詢鏡頭預設 + Unsplash 取得攝影參考圖
  2. MoodBoardTool           — 情緒視覺方案 + Unsplash 取得 mood board 圖集
  3. SoundscapeAdvisorTool   — BGM 建議 + ElevenLabs 生成音效預覽
"""

import json
import os
from typing import Any, ClassVar, Dict, List, Optional, Type
from pydantic import BaseModel, Field
from .base_skill import AgentSkill
from backend.crew.api_clients import unsplash_search, elevenlabs_sound_effect


# ── 1. CameraPresetLibraryTool ───────────────────────────────────────────

class CameraPresetInput(BaseModel):
    scene_type: str = Field(
        ...,
        description="場景類型：combat / dialogue / landscape / emotional_reveal / chase / establishing"
    )


class CameraPresetLibraryTool(AgentSkill):
    """
    鏡頭預設資料庫 + Unsplash 攝影參考圖。

    回傳 3 個推薦鏡頭設定，並附上 Unsplash 的真實電影/攝影參考圖連結，
    讓 Director Agent 在選擇鏡頭語言時有視覺依據。
    """

    name: str = "CameraPresetLibraryTool"
    description: str = (
        "根據場景類型查詢推薦鏡頭預設（angle + movement），"
        "並附上 Unsplash 攝影參考圖連結。"
    )
    agent_name: str = "動畫導演"
    args_schema: Type[BaseModel] = CameraPresetInput

    _PRESETS: ClassVar[Dict[str, List]] = {
        "combat": [
            {"angle": "Low angle (仰角)",          "movement": "Shake (手持震動)",         "rationale": "強調力量感與危機感"},
            {"angle": "Extreme close-up (極特寫)",  "movement": "Hard cut sequence",        "rationale": "快速剪接增強緊張節奏"},
            {"angle": "Bird-eye view (俯瞰)",       "movement": "Slow zoom out (慢拉遠)",   "rationale": "展示戰局全貌"},
        ],
        "dialogue": [
            {"angle": "Eye level (平視)",           "movement": "Static (靜止)",            "rationale": "自然對話感，聚焦表情"},
            {"angle": "Over-the-shoulder (肩後)",   "movement": "Subtle push in (緩慢推近)","rationale": "加強情感張力"},
            {"angle": "Close-up (特寫)",            "movement": "Rack focus (焦點切換)",    "rationale": "強調角色情緒轉變"},
        ],
        "landscape": [
            {"angle": "Wide shot (廣角)",           "movement": "Cinematic pan (電影橫移)", "rationale": "建立宏大世界觀"},
            {"angle": "Low angle (仰角)",           "movement": "Slow tilt up (緩慢仰起)", "rationale": "展現建築或自然的壯觀"},
            {"angle": "Aerial (空拍視角)",          "movement": "Orbit (環繞飛行)",         "rationale": "360 度世界觀展示"},
        ],
        "emotional_reveal": [
            {"angle": "Close-up (特寫)",            "movement": "Slow zoom in (慢速推近)", "rationale": "聚焦情緒爆發點"},
            {"angle": "Dutch angle (斜角)",         "movement": "Static with shake",        "rationale": "心理失衡感"},
            {"angle": "Eye level (平視)",           "movement": "Slow pull back (慢速拉遠)","rationale": "角色孤立感增強"},
        ],
        "chase": [
            {"angle": "Low angle (仰角)",           "movement": "Tracking shot (跟蹤拍攝)","rationale": "身臨其境的速度感"},
            {"angle": "POV (第一人稱視角)",         "movement": "Fast shake",               "rationale": "最強代入感"},
            {"angle": "Side angle (側面)",          "movement": "Parallel tracking",        "rationale": "清晰展示速度對比"},
        ],
        "establishing": [
            {"angle": "Wide shot (廣角)",           "movement": "Slow pan (緩慢橫移)",     "rationale": "帶領觀眾認識場景"},
            {"angle": "High angle (俯角)",          "movement": "Crane down (向下移動)",   "rationale": "由全覽轉至主角"},
            {"angle": "Aerial (空拍)",              "movement": "Dive in (俯衝推進)",       "rationale": "戲劇性的場景進入"},
        ],
    }

    # 場景類型 → Unsplash 搜尋詞
    _UNSPLASH_QUERIES: ClassVar[Dict[str, str]] = {
        "combat":           "dramatic action cinematography film",
        "dialogue":         "intimate conversation film still two people",
        "landscape":        "epic cinematic landscape wide angle",
        "emotional_reveal": "emotional close up portrait cinematic",
        "chase":            "motion blur speed chase cinematic",
        "establishing":     "establishing shot city skyline cinematic",
    }

    def _run(self, scene_type: str) -> str:
        key     = scene_type.lower().replace(" ", "_")
        presets = self._PRESETS.get(key, self._PRESETS["establishing"])

        # Unsplash 攝影參考圖
        query        = self._UNSPLASH_QUERIES.get(key, "cinematic photography")
        photo_result = unsplash_search(query, num_results=3)
        ref_photos   = [
            {"url": p["url_regular"], "thumb": p["url_thumb"]}
            for p in photo_result.get("photos", [])
        ]
        self._log(f"鏡頭預設查詢：{scene_type}，取得 {len(ref_photos)} 張攝影參考圖。")

        return json.dumps({
            "scene_type":        scene_type,
            "camera_presets":    presets,
            "reference_photos":  ref_photos,
        }, ensure_ascii=False, indent=2)


# ── 2. MoodBoardTool ─────────────────────────────────────────────────────

class MoodBoardInput(BaseModel):
    emotion: str = Field(..., description="主要情緒關鍵字：tension / romance / grief / joy / dread / solitude")
    time_of_day: str = Field(default="unspecified", description="時間段：dawn / noon / dusk / night")


class MoodBoardTool(AgentSkill):
    """
    情緒視覺對應工具 + Unsplash mood board 圖集。

    將情緒 + 時段映射到色彩方案與光影描述，
    並呼叫 Unsplash 取得 4 張真實的情境參考圖，
    建構可直接交給美術的 mood board。
    """

    name: str = "MoodBoardTool"
    description: str = (
        "將情緒關鍵字與時間段對應到動畫視覺方案，"
        "輸出 color_palette、lighting_style、atmosphere_tags，"
        "並附上 4 張 Unsplash mood board 參考圖。"
    )
    agent_name: str = "動畫導演"
    args_schema: Type[BaseModel] = MoodBoardInput

    _MOOD_MAP: ClassVar[Dict[str, Dict]] = {
        "tension":   {"color_palette": "desaturated blue-grey, deep shadow, harsh contrast",   "lighting_style": "chiaroscuro, rim light, underlit",        "atmosphere_tags": "ominous, oppressive, tense"},
        "romance":   {"color_palette": "warm amber, soft pink, golden hour glow",              "lighting_style": "soft diffused light, lens flare",          "atmosphere_tags": "warm, intimate, dreamy"},
        "grief":     {"color_palette": "muted grey, pale blue, washed out",                    "lighting_style": "overcast, flat diffused light",            "atmosphere_tags": "melancholic, heavy, still"},
        "joy":       {"color_palette": "vibrant yellow, bright cyan, saturated",               "lighting_style": "bright sunlight, bloom effect",            "atmosphere_tags": "energetic, uplifting, vivid"},
        "dread":     {"color_palette": "near-black, deep crimson, toxic green",                "lighting_style": "single harsh spotlight, deep shadows",     "atmosphere_tags": "horrifying, unsettling, claustrophobic"},
        "solitude":  {"color_palette": "cool blue, grey, muted purple",                        "lighting_style": "soft moonlight, indirect",                 "atmosphere_tags": "quiet, lonely, spacious"},
    }

    _TIME_MODIFIER: ClassVar[Dict[str, str]] = {
        "dawn":  "with dawn mist and soft pink horizon",
        "noon":  "under harsh noon sun, hard shadows",
        "dusk":  "bathed in golden dusk light, long shadows",
        "night": "lit only by moonlight and distant city glow",
    }

    _UNSPLASH_QUERIES: ClassVar[Dict[str, str]] = {
        "tension":  "dramatic dark moody cinematic",
        "romance":  "golden hour romantic warm light",
        "grief":    "rainy melancholic grey",
        "joy":      "bright sunny colorful happy",
        "dread":    "dark horror atmospheric fog",
        "solitude": "vast empty lonely landscape",
    }

    def _run(self, emotion: str, time_of_day: str = "unspecified") -> str:
        mood = self._MOOD_MAP.get(emotion.lower(), {
            "color_palette":    "neutral tones",
            "lighting_style":   "natural lighting",
            "atmosphere_tags":  "neutral",
        })
        time_mod = self._TIME_MODIFIER.get(time_of_day.lower(), "")
        if time_mod:
            mood["atmosphere_tags"] += f", {time_mod}"

        # Unsplash mood board
        query        = self._UNSPLASH_QUERIES.get(emotion.lower(), "cinematic mood")
        if time_of_day not in ("unspecified", ""):
            query += f" {time_of_day}"
        photo_result = unsplash_search(query, num_results=4)
        mood_board   = [
            {"url": p["url_regular"], "thumb": p["url_thumb"], "desc": p["description"]}
            for p in photo_result.get("photos", [])
        ]
        self._log(f"MoodBoard 生成：{emotion} @ {time_of_day}，取得 {len(mood_board)} 張圖。")

        return json.dumps({
            **mood,
            "mood_board_photos": mood_board,
        }, ensure_ascii=False, indent=2)


# ── 3. SoundscapeAdvisorTool ─────────────────────────────────────────────

class SoundscapeInput(BaseModel):
    atmosphere: str = Field(..., description="場景氛圍描述，如：stormy night / peaceful forest / burning city")
    dominant_emotion: str = Field(default="neutral", description="主要情緒：tension / romance / grief / joy / dread")
    generate_preview: bool = Field(
        default=True,
        description="是否呼叫 ElevenLabs 生成音效預覽（需 ELEVENLABS_API_KEY）"
    )
    sfx_output_dir: str = Field(default="outputs/sfx", description="音效輸出目錄")


class SoundscapeAdvisorTool(AgentSkill):
    """
    音景建議工具 + ElevenLabs 音效預覽。

    根據場景氛圍和情緒建議 BGM 風格與音效，
    並呼叫 ElevenLabs Sound Effects API 生成實際的氛圍音效 .mp3 預覽。
    """

    name: str = "SoundscapeAdvisorTool"
    description: str = (
        "根據場景氛圍與情緒建議 BGM 風格、ambient SFX，"
        "並呼叫 ElevenLabs 生成音效預覽 .mp3 檔案。"
    )
    agent_name: str = "動畫導演"
    args_schema: Type[BaseModel] = SoundscapeInput

    _BGM_MAP: ClassVar[Dict[str, str]] = {
        "tension":  "fast-tempo orchestral, staccato strings, ticking percussion",
        "romance":  "soft acoustic guitar, piano, slow strings",
        "grief":    "solo cello, minor key piano, silence punctuation",
        "joy":      "upbeat orchestral, bright brass, light percussion",
        "dread":    "dissonant ambient, low drones, sudden silence",
        "neutral":  "ambient pad, soft texture",
    }

    _AMBIENT_MAP: ClassVar[Dict[str, str]] = {
        "storm":  "heavy rain pouring, distant thunder rumbling, wind howling",
        "forest": "birds chirping, leaves rustling in breeze, distant stream",
        "city":   "traffic noise, crowd murmur, neon sign buzzing",
        "battle": "sword clashing, distant explosions, battle cries",
        "indoor": "quiet room tone, muffled exterior sounds",
        "space":  "deep space ambience, cosmic hum, void silence",
    }

    def _run(
        self,
        atmosphere: str,
        dominant_emotion: str = "neutral",
        generate_preview: bool = True,
        sfx_output_dir: str = "outputs/sfx",
    ) -> str:
        bgm     = self._BGM_MAP.get(dominant_emotion.lower(), self._BGM_MAP["neutral"])
        atm_key = next((k for k in self._AMBIENT_MAP if k in atmosphere.lower()), "indoor")
        ambient = self._AMBIENT_MAP[atm_key]

        result = {
            "bgm_style":    bgm,
            "ambient_sfx":  ambient,
            "key_sfx_moments": [
                "climax moment: sudden silence before impact",
                "emotional beat: music swells on close-up",
                "scene transition: audio fade to ambient",
            ],
            "audio_preview": None,
        }

        # ElevenLabs Sound Effects：生成氛圍音效預覽
        if generate_preview:
            sfx_prompt = f"{atmosphere}, {ambient[:100]}"
            os.makedirs(sfx_output_dir, exist_ok=True)
            out_path   = os.path.join(sfx_output_dir, f"sfx_{dominant_emotion}_{atm_key}.mp3")
            sfx_result = elevenlabs_sound_effect(sfx_prompt, duration_seconds=5.0, output_path=out_path)

            if "error" in sfx_result:
                result["audio_preview"] = {"error": sfx_result["error"]}
            else:
                result["audio_preview"] = {
                    "file_path":    sfx_result.get("file_path", out_path),
                    "duration_s":   5.0,
                    "prompt_used":  sfx_prompt,
                }
                self._log(f"音效預覽生成完畢 → {out_path}")

        self._log(f"音景建議完成：atmosphere={atmosphere}, emotion={dominant_emotion}")
        return json.dumps(result, ensure_ascii=False, indent=2)


# ── 工廠函式 ─────────────────────────────────────────────────────────────

def get_director_tools() -> list:
    return [
        CameraPresetLibraryTool(),
        MoodBoardTool(),
        SoundscapeAdvisorTool(),
    ]
