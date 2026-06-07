# backend/crew/skills/analyzer_skills.py
import json
from typing import Any, ClassVar, Dict, List, Type
from pydantic import BaseModel, Field
from .base_skill import AgentSkill
from backend.crew.api_clients import serper_image_search, serper_search, unsplash_search


class CharacterExtractorInput(BaseModel):
    characters_json: str = Field(
        ...,
        description="JSON array string with name/role/appearance/personality/relationship fields"
    )


class CharacterExtractorTool(AgentSkill):
    name: str = "CharacterExtractorTool"
    description: str = (
        "Store character analysis results to shared CharacterDB and search reference images. "
        "Input: JSON array string with name/role/appearance/personality/relationship fields."
    )
    agent_name: str = "Novel Analyzer"
    args_schema: Type[BaseModel] = CharacterExtractorInput

    def _run(self, characters_json: str) -> str:
        memory = self._get_memory()
        try:
            data = json.loads(characters_json)
            if not isinstance(data, list):
                data = [data]
            enriched = []
            for item in data:
                memory.characters.upsert_from_dict(item)
                name = item.get("name", "")
                appearance = item.get("appearance", "")
                query = "anime character " + name + " " + appearance[:60]
                search_result = serper_image_search(query, num_results=3)
                images = search_result.get("images", [])
                reference_urls = [img["image_url"] for img in images if img.get("image_url")]
                enriched.append({"name": name, "stored": True, "reference_images": reference_urls})
                self._log("Character stored: " + name + " (" + str(len(reference_urls)) + " ref images)")
            return json.dumps({"status": "success", "characters_stored": len(data), "enriched": enriched}, ensure_ascii=False, indent=2)
        except json.JSONDecodeError as e:
            return json.dumps({"error": "JSON parse error: " + str(e)})


class WorldRuleExtractorInput(BaseModel):
    rules: List[str] = Field(..., description="List of world-building rules extracted from novel")
    category: str = Field(default="general", description="Category: power_system / geography / social / magic")
    search_context: str = Field(default="", description="Extra search keywords e.g. xianxia, fantasy")


class WorldRuleExtractorTool(AgentSkill):
    name: str = "WorldRuleExtractorTool"
    description: str = (
        "Store world-building rules to shared WorldDB and search for similar world references. "
        "Input: rules (list of strings), category, search_context."
    )
    agent_name: str = "Novel Analyzer"
    args_schema: Type[BaseModel] = WorldRuleExtractorInput

    def _run(self, rules: List[str], category: str = "general", search_context: str = "") -> str:
        memory = self._get_memory()
        before = memory.world.count()
        memory.world.add_bulk(rules, category)
        added = memory.world.count() - before
        self._log("World rules added: " + str(added) + " (category: " + category + ")")
        search_refs = []
        if search_context or rules:
            query = search_context if search_context else (rules[0][:40] + " world building")
            search_result = serper_search(query, num_results=3)
            search_refs = search_result.get("results", [])
            self._log("Web references found: " + str(len(search_refs)))
        return json.dumps({"status": "success", "rules_added": added, "category": category, "web_references": search_refs}, ensure_ascii=False, indent=2)


class EmotionToneInput(BaseModel):
    chapter_summary: str = Field(..., description="Short summary of the chapter (1-3 sentences)")


class EmotionToneTool(AgentSkill):
    name: str = "EmotionToneTool"
    description: str = (
        "Analyze dominant emotion of a chapter and return mood reference photos from Unsplash. "
        "Returns dominant_emotion, intensity, suggested_bgm_style, mood_reference_photos."
    )
    agent_name: str = "Novel Analyzer"
    args_schema: Type[BaseModel] = EmotionToneInput

    UNSPLASH_QUERIES: ClassVar[Dict[str, str]] = {
        "tension":    "dramatic dark cinematic",
        "grief":      "melancholic rain solitude",
        "melancholy": "foggy lonely landscape",
        "joy":        "bright sunlight celebration",
        "romance":    "golden hour romantic",
        "dread":      "dark horror atmosphere",
        "solitude":   "vast empty landscape",
        "neutral":    "cinematic film still",
    }

    EMOTION_KEYWORDS: ClassVar[Dict[str, tuple]] = {
        "battle":   ("tension",    "high",   "epic orchestral / fast-paced percussion"),
        "combat":   ("tension",    "high",   "epic orchestral / fast-paced percussion"),
        "fight":    ("tension",    "high",   "epic orchestral / fast-paced percussion"),
        "death":    ("grief",      "high",   "slow strings / minor key"),
        "goodbye":  ("melancholy", "medium", "piano solo / fading melody"),
        "reunion":  ("joy",        "medium", "bright strings / uplifting"),
        "love":     ("romance",    "medium", "soft acoustic guitar"),
        "fear":     ("dread",      "high",   "ambient dissonance / silence"),
        "alone":    ("solitude",   "low",    "ambient / distant piano"),
        "lonely":   ("solitude",   "low",    "ambient / distant piano"),
    }

    def _run(self, chapter_summary: str) -> str:
        emotion, intensity, bgm = "neutral", "medium", "ambient / neutral"
        text_lower = chapter_summary.lower()
        for keyword, values in self.EMOTION_KEYWORDS.items():
            if keyword in text_lower:
                emotion, intensity, bgm = values
                break

        memory = self._get_memory()
        memory.world.add("Emotion tone: " + emotion + " (intensity: " + intensity + ")", category="emotion_tone")

        query = self.UNSPLASH_QUERIES.get(emotion, "cinematic film still")
        photo_result = unsplash_search(query, num_results=3)
        mood_photos = [
            {"url": p["url_regular"], "thumb": p["url_thumb"], "desc": p["description"]}
            for p in photo_result.get("photos", [])
        ]
        self._log("Emotion: " + emotion + ", mood photos: " + str(len(mood_photos)))
        return json.dumps({
            "dominant_emotion":      emotion,
            "intensity":             intensity,
            "suggested_bgm_style":   bgm,
            "mood_reference_photos": mood_photos,
        }, ensure_ascii=False, indent=2)


def get_analyzer_tools() -> list:
    return [
        CharacterExtractorTool(),
        WorldRuleExtractorTool(),
        EmotionToneTool(),
    ]
