"""
Novel-to-Animation Pipeline - Multi-Novel Support
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Tuple

AGENTS_DIR = Path(__file__).parent / "agents"


def _load_prompt(agent_name: str) -> str:
    return (AGENTS_DIR / f"{agent_name}.md").read_text(encoding="utf-8")


def _call_anthropic(client, agent_name, user_message, model):
    system_prompt = _load_prompt(agent_name)
    response = client.messages.create(
        model=model, max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text.strip()


def _call_groq(client, agent_name, user_message, model):
    system_prompt = _load_prompt(agent_name)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=4096, temperature=0,
    )
    return response.choices[0].message.content.strip()


def _parse_json(raw: str) -> Dict[str, Any]:
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()
    return json.loads(raw)


def _call_agent(client, provider, agent_name, user_message, model):
    raw = _call_groq(client, agent_name, user_message, model) if provider == "groq" \
          else _call_anthropic(client, agent_name, user_message, model)
    return _parse_json(raw)


def run_animation_pipeline(
    novel_text: str,
    provider: str = "anthropic",
    api_key: str = None,
    model_name: str = None,
    chapter_number: int = 0,
    update_bible: bool = True,
    novel_id: str = None,
) -> Tuple[Dict[str, Any], str]:

    # Collect all available Groq keys for rotation
    groq_keys = []
    for i in range(1, 10):
        k = os.environ.get(f"GROQ_API_KEY_{i}")
        if k:
            groq_keys.append(k)
    # Also accept bare GROQ_API_KEY
    if os.environ.get("GROQ_API_KEY"):
        bare = os.environ["GROQ_API_KEY"]
        if bare not in groq_keys:
            groq_keys.insert(0, bare)

    if not api_key:
        if groq_keys:
            provider = "groq"
            api_key = groq_keys[0]  # default; per-agent rotation below
        elif os.environ.get("ANTHROPIC_API_KEY"):
            provider = "anthropic"
            api_key = os.environ["ANTHROPIC_API_KEY"]
        else:
            raise ValueError("Please set GROQ_API_KEY or ANTHROPIC_API_KEY in backend/.env")

    if not model_name:
        model_name = "llama-3.3-70b-versatile" if provider == "groq" else "claude-3-5-haiku-20241022"

    def _make_groq_client(key):
        from groq import Groq
        return Groq(api_key=key)

    def _get_client(agent_index: int):
        """Return a client, rotating Groq keys across agents if multiple keys exist."""
        if provider == "groq":
            key = groq_keys[agent_index % len(groq_keys)] if groq_keys else api_key
            return _make_groq_client(key)
        else:
            import anthropic
            return anthropic.Anthropic(api_key=api_key)

    # Default single client (kept for non-rotation paths)
    if provider == "groq":
        client = _make_groq_client(api_key)
    else:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

    logs = []
    def log(msg):
        print(msg)
        logs.append(msg)

    log(f"[System] Provider: {provider}, Model: {model_name}, Chapter: {chapter_number}, Novel: {novel_id or 'default'}")

    # Load Production Bible context
    bible_context = ""
    if novel_id:
        try:
            from backend.crew.datastore import get_context_for_agents
            bible_context = get_context_for_agents(novel_id)
            if bible_context:
                log(f"[Bible] Loaded existing context ({len(bible_context)} chars)")
            else:
                log("[Bible] No existing data, starting fresh")
        except Exception as e:
            log(f"[Bible] Could not load context: {e}")

    analyzer_input = novel_text
    if bible_context:
        analyzer_input = (
            "=== Production Bible (existing data - maintain consistency) ===\n"
            + bible_context + "\n\n=== New Chapter Text ===\n" + novel_text
        )

    log("[Analyzer] Starting...")
    analyzer_result = _call_agent(_get_client(0), provider, "analyzer",
        "Please analyze the following novel excerpt:\n\n" + analyzer_input, model_name)
    log(f"[Analyzer] Done. Characters: {len(analyzer_result.get('characters', []))}")

    log("[Adaptation] Starting...")
    adaptation_result = _call_agent(_get_client(1), provider, "adaptation",
        "Novel text:\n\n" + novel_text
        + "\n\nCharacter analysis:\n" + json.dumps(analyzer_result, ensure_ascii=False, indent=2),
        model_name)
    log(f"[Adaptation] Done. Scenes: {len(adaptation_result.get('scenes', []))}")

    log("[Director] Starting...")
    director_result = _call_agent(_get_client(2), provider, "director",
        "Scene list:\n" + json.dumps(adaptation_result, ensure_ascii=False, indent=2)
        + "\n\nEmotion: dominant_emotion=" + str(analyzer_result.get("dominant_emotion"))
        + ", intensity=" + str(analyzer_result.get("emotion_intensity")),
        model_name)
    log("[Director] Done.")

    log("[Consistency] Starting...")
    consistency_result = _call_agent(_get_client(3), provider, "consistency",
        "Character data:\n" + json.dumps(analyzer_result.get("characters", []), ensure_ascii=False, indent=2)
        + "\n\nScene list:\n" + json.dumps(adaptation_result.get("scenes", []), ensure_ascii=False, indent=2)
        + "\n\nDirector notes:\n" + json.dumps(director_result, ensure_ascii=False, indent=2),
        model_name)
    log("[Consistency] Done.")

    if update_bible and novel_id:
        try:
            from backend.crew.datastore import upsert_character, add_world_rules, add_scenes
            for char in analyzer_result.get("characters", []):
                upsert_character(char, novel_id)
            raw_rules = analyzer_result.get("world_rules", [])
            norm_rules = [
                {"rule": r, "category": "general"} if isinstance(r, str) else r
                for r in raw_rules
            ]
            add_world_rules(norm_rules, novel_id, chapter=chapter_number)
            add_scenes(
                adaptation_result.get("scenes", []),
                consistency_result.get("storyboard", []),
                novel_id, chapter=chapter_number,
            )
            # Update chapter count
            from backend.crew.datastore import get_novel, update_novel
            novel = get_novel(novel_id)
            if novel:
                update_novel(novel_id, {"chapter_count": novel.get("chapter_count", 0) + 1})
            log(f"[Bible] Saved to Production Bible (novel: {novel_id})")
        except Exception as e:
            log(f"[Bible] Save error: {e}")

    final_result = {
        "characters": analyzer_result.get("characters", []),
        "world_rules": analyzer_result.get("world_rules", []),
        "emotion": {
            "dominant": analyzer_result.get("dominant_emotion"),
            "intensity": analyzer_result.get("emotion_intensity"),
            "bgm": analyzer_result.get("bgm_suggestion"),
        },
        "chapter_summary": analyzer_result.get("chapter_summary"),
        "scenes": adaptation_result.get("scenes", []),
        "pacing": adaptation_result.get("pacing", {}),
        "direction": director_result.get("direction", []),
        "global_style": consistency_result.get("global_style", director_result.get("global_style", {})),
        "storyboard": consistency_result.get("storyboard", []),
        "production_notes": consistency_result.get("production_notes", ""),
    }

    log("[System] Pipeline complete!")
    return final_result, "\n".join(logs)
