# backend/crew/skills/adaptation_skills.py
"""
Adaptation Agent 的專屬工具集。

工具清單：
  1. SceneSegmenterTool    — 場景分割 + Serper 搜尋類似動畫場景截圖
  2. DialogueExtractorTool — 提取對白 + ElevenLabs TTS 生成語音預覽
  3. PacingAdvisorTool     — 節奏建議 + Serper 搜尋同類型動畫節奏參考
"""

import json
import os
import re
from typing import Any, ClassVar, Dict, List, Type
from pydantic import BaseModel, Field
from .base_skill import AgentSkill
from backend.crew.api_clients import serper_search, serper_image_search, elevenlabs_tts


# ── 1. SceneSegmenterTool ─────────────────────────────────────────────────

class SceneSegmenterInput(BaseModel):
    text: str = Field(..., description="需要拆解的小說段落文字")
    target_scene_count: int = Field(default=5, description="目標分割場景數量（建議 3-8）")
    genre: str = Field(default="anime", description="故事類型，用於搜尋同類型場景參考")


class SceneSegmenterTool(AgentSkill):
    """
    智能場景分割工具。
    依地點轉換、時間跳躍、人物進出三維度建議切割點，
    並呼叫 Serper 搜尋該類型動畫的類似場景截圖作為分鏡參考。
    """

    name: str = "SceneSegmenterTool"
    description: str = (
        "將小說段落拆解為動畫場景列表，並搜尋同類型動畫的場景截圖作為視覺參考。"
        "回傳帶有 scene_id、title、trigger、excerpt、reference_images 的 JSON 陣列。"
    )
    agent_name: str = "動畫改編員"
    args_schema: Type[BaseModel] = SceneSegmenterInput

    _LOCATION_TRIGGERS:  ClassVar[List[str]] = ["走進", "來到", "抵達", "穿過", "離開", "回到", "飛向"]
    _TIME_TRIGGERS:      ClassVar[List[str]] = ["翌日", "數日後", "黃昏", "深夜", "清晨", "同時", "與此同時"]
    _CHARACTER_TRIGGERS: ClassVar[List[str]] = ["突然出現", "步入", "走出", "消失在"]

    def _run(self, text: str, target_scene_count: int = 5, genre: str = "anime") -> str:
        sentences = re.split(r'[。！？\n]+', text)
        sentences  = [s.strip() for s in sentences if s.strip()]
        chunk_size = max(1, len(sentences) // target_scene_count)

        scenes = []
        for i in range(0, len(sentences), chunk_size):
            chunk    = sentences[i:i + chunk_size]
            excerpt  = "。".join(chunk[:3]) + ("..." if len(chunk) > 3 else "")
            combined = "".join(chunk)

            trigger = "narrative_flow"
            if any(kw in combined for kw in self._LOCATION_TRIGGERS):
                trigger = "location_change"
            elif any(kw in combined for kw in self._TIME_TRIGGERS):
                trigger = "time_skip"
            elif any(kw in combined for kw in self._CHARACTER_TRIGGERS):
                trigger = "character_entry_exit"

            scene_id = len(scenes) + 1
            scenes.append({
                "scene_id":       scene_id,
                "title":          f"Scene {scene_id}",
                "trigger":        trigger,
                "excerpt":        excerpt,
                "sentence_count": len(chunk),
            })

            if len(scenes) >= target_scene_count:
                break

        # Serper：搜尋同類型動畫場景截圖
        query        = f"{genre} anime scene storyboard {trigger.replace('_', ' ')}"
        image_result = serper_image_search(query, num_results=4)
        ref_images   = [img["image_url"] for img in image_result.get("images", []) if img.get("image_url")]
        self._log(f"場景分割 {len(scenes)} 幕，找到 {len(ref_images)} 張場景參考圖。")

        return json.dumps({
            "scenes":            scenes,
            "reference_images":  ref_images,
        }, ensure_ascii=False, indent=2)


# ── 2. DialogueExtractorTool ─────────────────────────────────────────────

class DialogueExtractorInput(BaseModel):
    text: str = Field(..., description="需要提取對白的小說文字段落")
    generate_tts: bool = Field(
        default=True,
        description="是否呼叫 ElevenLabs 生成台詞語音預覽（需 ELEVENLABS_API_KEY）"
    )
    tts_output_dir: str = Field(
        default="outputs/tts",
        description="語音檔案輸出目錄"
    )


class DialogueExtractorTool(AgentSkill):
    """
    從原文提取對白與旁白，並呼叫 ElevenLabs TTS
    為每條台詞生成 .mp3 語音預覽檔案。
    """

    name: str = "DialogueExtractorTool"
    description: str = (
        "從小說文字中提取所有對白（直接引語）和旁白，"
        "並呼叫 ElevenLabs TTS 生成語音預覽。"
        "回傳包含 type、speaker、text、audio_file（若生成成功）的 JSON 陣列。"
    )
    agent_name: str = "動畫改編員"
    args_schema: Type[BaseModel] = DialogueExtractorInput

    def _run(self, text: str, generate_tts: bool = True, tts_output_dir: str = "outputs/tts") -> str:
        results = []

        # 提取引號對白
        dialogue_pattern = re.compile(r'[「""](.*?)[」""]', re.DOTALL)
        dialogues = dialogue_pattern.findall(text)
        for d in dialogues:
            results.append({"type": "dialogue", "speaker": "Unknown", "text": d.strip()})

        # 提取旁白
        narration_text = dialogue_pattern.sub("", text).strip()
        for ns in re.split(r'[。！？]+', narration_text):
            ns = ns.strip()
            if ns and len(ns) > 5:
                results.append({"type": "narration", "speaker": "narrator", "text": ns})

        self._log(f"提取到 {len(dialogues)} 條對白，旁白若干段。")

        # ElevenLabs TTS：為每條對白生成語音預覽（最多 5 條避免 API 用量過大）
        if generate_tts:
            tts_targets = [r for r in results if r["type"] == "dialogue"][:5]
            for i, item in enumerate(tts_targets):
                safe_text = item["text"][:500]  # ElevenLabs 單次上限
                out_path = os.path.join(tts_output_dir, f"dialogue_{i+1}.mp3")
                tts_result = elevenlabs_tts(safe_text, output_path=out_path)

                if "error" in tts_result:
                    item["audio_file"] = None
                    item["tts_error"]  = tts_result["error"]
                else:
                    item["audio_file"] = tts_result.get("file_path", out_path)
                    self._log(f"台詞 {i+1} TTS 生成完畢 → {out_path}")

        return json.dumps(results, ensure_ascii=False, indent=2)


# ── 3. PacingAdvisorTool ─────────────────────────────────────────────────

class PacingAdvisorInput(BaseModel):
    genre: str = Field(default="action", description="故事類型：action / romance / horror / comedy / drama")
    scene_count: int = Field(..., description="本章節的總場景數")


class PacingAdvisorTool(AgentSkill):
    """
    動畫節奏顧問。
    輸出節奏建議，並呼叫 Serper 搜尋同類型動畫的節奏分析文章或預告片參考。
    """

    name: str = "PacingAdvisorTool"
    description: str = (
        "根據故事類型與場景數量給出動畫節奏建議，"
        "並搜尋同類型動畫的節奏參考資料。"
        "回傳 avg_scene_duration_s、tension_curve、web_references。"
    )
    agent_name: str = "動畫改編員"
    args_schema: Type[BaseModel] = PacingAdvisorInput

    _PACING_PROFILES: ClassVar[Dict[str, Dict]] = {
        "action":  {"scene_duration_s": 8,  "transition": "hard_cut",      "tension_curve": "rising"},
        "romance": {"scene_duration_s": 20, "transition": "cross_dissolve", "tension_curve": "slow_build"},
        "horror":  {"scene_duration_s": 12, "transition": "match_cut",     "tension_curve": "escalating"},
        "comedy":  {"scene_duration_s": 6,  "transition": "jump_cut",      "tension_curve": "flat_high"},
        "drama":   {"scene_duration_s": 18, "transition": "fade",          "tension_curve": "arc"},
    }

    def _run(self, genre: str, scene_count: int) -> str:
        profile      = self._PACING_PROFILES.get(genre.lower(), self._PACING_PROFILES["drama"])
        total_est_s  = profile["scene_duration_s"] * scene_count

        # Serper：搜尋同類型動畫的節奏與剪輯分析
        query        = f"{genre} anime pacing editing style analysis"
        search_result = serper_search(query, num_results=3)
        web_refs     = search_result.get("results", [])
        self._log(f"節奏建議完成：{genre} x {scene_count} 幕，找到 {len(web_refs)} 條參考。")

        return json.dumps({
            "genre":                    genre,
            "scene_count":              scene_count,
            "avg_scene_duration_s":     profile["scene_duration_s"],
            "estimated_total_duration_s": total_est_s,
            "recommended_transition":   profile["transition"],
            "tension_curve":            profile["tension_curve"],
            "web_references":           web_refs,
        }, ensure_ascii=False, indent=2)


# ── 工廠函式 ─────────────────────────────────────────────────────────────

def get_adaptation_tools() -> list:
    return [
        SceneSegmenterTool(),
        DialogueExtractorTool(),
        PacingAdvisorTool(),
    ]
