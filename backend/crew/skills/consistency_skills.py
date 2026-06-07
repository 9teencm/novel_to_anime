# backend/crew/skills/consistency_skills.py
import json
from typing import Any, ClassVar, Dict, List, Optional, Type
from pydantic import BaseModel, Field
from .base_skill import AgentSkill
from backend.crew.api_clients import replicate_txt2img


class CharacterDBLookupInput(BaseModel):
    name: str = Field(..., description="Character name to look up (supports fuzzy search)")
    generate_reference_image: bool = Field(default=True, description="Generate reference image via Pollinations")


class CharacterDBLookupTool(AgentSkill):
    name: str = "CharacterDBLookupTool"
    description: str = (
        "Look up character appearance tags from shared CharacterDB "
        "and generate a reference image. Returns character info + reference_image_url."
    )
    agent_name: str = "Consistency Manager"
    args_schema: Type[BaseModel] = CharacterDBLookupInput

    def _run(self, name: str, generate_reference_image: bool = True) -> str:
        memory = self._get_memory()
        record = memory.characters.get(name)
        if not record:
            results = memory.characters.search(name)
            record = results[0] if results else None
        if not record:
            self._log("Character not found: " + name)
            return json.dumps({"found": False, "name": name, "message": "Character not found in CharacterDB."})
        char_data = {
            "found": True,
            "name": record.name,
            "role": record.role,
            "appearance": record.appearance,
            "prompt_tags": record.prompt_tags or record.appearance,
            "locks": {"face": record.face_locked, "outfit": record.outfit_locked},
            "reference_image_url": None,
        }
        if generate_reference_image:
            ref_prompt = (
                "character reference sheet, " + (record.prompt_tags or record.appearance)
                + ", full body and face, white background, anime style, highly detailed, 4k"
            )
            img_result = replicate_txt2img(ref_prompt, width=768, height=1024)
            if "error" in img_result:
                char_data["reference_image_error"] = img_result["error"]
            else:
                char_data["reference_image_url"] = img_result.get("image_url")
                self._log("Reference image generated for: " + record.name)
        return json.dumps(char_data, ensure_ascii=False, indent=2)


class PromptBuilderInput(BaseModel):
    scene_description: str = Field(..., description="Scene description (location, time, atmosphere)")
    character_tags: List[str] = Field(default_factory=list, description="Character appearance tags")
    camera_description: str = Field(default="", description="Camera description e.g. close-up shot")
    mood_tags: str = Field(default="", description="Mood/atmosphere tags")
    generate_preview: bool = Field(default=True, description="Generate preview image via Pollinations")


class PromptBuilderTool(AgentSkill):
    name: str = "PromptBuilderTool"
    description: str = (
        "Assemble character tags, scene, camera, mood into a Text-to-Image prompt "
        "and generate a storyboard preview image. Returns image_prompt + preview_image_url."
    )
    agent_name: str = "Consistency Manager"
    args_schema: Type[BaseModel] = PromptBuilderInput

    STYLE_SUFFIX: ClassVar[str] = (
        "anime style, highly detailed, 4k resolution, cinematic lighting, dramatic composition, sharp focus"
    )

    def _run(self, scene_description: str, character_tags: List[str] = None,
             camera_description: str = "", mood_tags: str = "", generate_preview: bool = True) -> str:
        character_tags = character_tags or []
        parts = []
        if character_tags:
            parts.append(", ".join(character_tags))
        parts.append(scene_description)
        if camera_description:
            parts.append(camera_description)
        if mood_tags:
            parts.append(mood_tags)
        parts.append(self.STYLE_SUFFIX)
        prompt = ", ".join(filter(None, parts))
        self._log("Prompt assembled (" + str(len(prompt)) + " chars)")
        result = {
            "image_prompt": prompt,
            "preview_image_url": None,
            "components": {
                "characters": character_tags,
                "scene": scene_description,
                "camera": camera_description,
                "mood": mood_tags,
                "style_suffix": self.STYLE_SUFFIX,
            },
        }
        if generate_preview:
            img_result = replicate_txt2img(prompt, width=1024, height=576)
            if "error" in img_result:
                result["preview_error"] = img_result["error"]
            else:
                result["preview_image_url"] = img_result.get("image_url")
                self._log("Preview image generated: " + str(result["preview_image_url"]))
        return json.dumps(result, ensure_ascii=False, indent=2)


class StyleLockInput(BaseModel):
    raw_prompt: str = Field(..., description="Prompt string without style suffix")
    style_preset: str = Field(default="anime", description="Style: anime / ghibli / cyberpunk / watercolor / western_comic")
    generate_validation_image: bool = Field(default=True, description="Generate validation image via Pollinations")


class StyleLockTool(AgentSkill):
    name: str = "StyleLockTool"
    description: str = (
        "Inject a unified style suffix into raw_prompt and generate a validation image. "
        "Returns locked_prompt + validation_image_url."
    )
    agent_name: str = "Consistency Manager"
    args_schema: Type[BaseModel] = StyleLockInput

    _STYLE_PRESETS: ClassVar[Dict[str, str]] = {
        "anime":        "anime style, cel shading, vibrant colors, detailed linework, 4k, cinematic lighting",
        "ghibli":       "Studio Ghibli style, soft watercolor, lush backgrounds, whimsical, warm light, hand-painted feel",
        "cyberpunk":    "cyberpunk aesthetic, neon lights, rain-slicked streets, high contrast, futuristic, blade runner atmosphere",
        "watercolor":   "watercolor illustration, soft edges, muted palette, artistic brushwork, delicate textures",
        "western_comic":"western comic style, bold outlines, flat colors, Marvel/DC aesthetic, dynamic composition",
    }

    def _run(self, raw_prompt: str, style_preset: str = "anime", generate_validation_image: bool = True) -> str:
        suffix = self._STYLE_PRESETS.get(style_preset.lower(), self._STYLE_PRESETS["anime"])
        if suffix.split(",")[0].strip() in raw_prompt:
            locked_prompt = raw_prompt
            self._log("Style suffix already present, skipping.")
        else:
            locked_prompt = raw_prompt.rstrip(", ") + ", " + suffix
            self._log("Style suffix injected (preset: " + style_preset + ")")
        result = {
            "locked_prompt": locked_prompt,
            "style_preset": style_preset,
            "suffix_applied": suffix,
            "validation_image_url": None,
        }
        if generate_validation_image:
            img_result = replicate_txt2img(locked_prompt, width=1024, height=576)
            if "error" in img_result:
                result["validation_error"] = img_result["error"]
            else:
                result["validation_image_url"] = img_result.get("image_url")
                self._log("Validation image generated: " + str(result["validation_image_url"]))
        return json.dumps(result, ensure_ascii=False, indent=2)


def get_consistency_tools() -> list:
    return [
        CharacterDBLookupTool(),
        PromptBuilderTool(),
        StyleLockTool(),
    ]
