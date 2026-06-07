"""
Production Bible DataStore - Multi-Novel Support
Each novel has its own isolated data directory: backend/data/{novel_id}/
"""

import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DATA_DIR = Path(__file__).parent.parent / "data"
BASE_DATA_DIR.mkdir(exist_ok=True)

NOVELS_INDEX = BASE_DATA_DIR / "novels.json"


# ── Novel Index ───────────────────────────────────────────────────────────────

def _load(path: Path, default) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _save(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_novels() -> List[Dict]:
    return _load(NOVELS_INDEX, [])


def create_novel(title: str, description: str = "", genre: str = "") -> Dict:
    novels = load_novels()
    novel = {
        "id": str(uuid.uuid4())[:8],
        "title": title,
        "description": description,
        "genre": genre,
        "created_at": __import__("datetime").datetime.now().isoformat(),
        "chapter_count": 0,
    }
    novels.append(novel)
    _save(NOVELS_INDEX, novels)
    # Create novel data directory
    novel_dir = BASE_DATA_DIR / novel["id"]
    novel_dir.mkdir(exist_ok=True)
    return novel


def update_novel(novel_id: str, updates: Dict) -> Optional[Dict]:
    novels = load_novels()
    for i, n in enumerate(novels):
        if n["id"] == novel_id:
            novels[i].update({k: v for k, v in updates.items() if k != "id"})
            _save(NOVELS_INDEX, novels)
            return novels[i]
    return None


def delete_novel(novel_id: str) -> None:
    novels = load_novels()
    novels = [n for n in novels if n["id"] != novel_id]
    _save(NOVELS_INDEX, novels)
    import shutil
    novel_dir = BASE_DATA_DIR / novel_id
    if novel_dir.exists():
        try:
            shutil.rmtree(novel_dir)
        except Exception:
            for f in novel_dir.glob('*.json'):
                try: f.unlink()
                except: pass


def get_novel(novel_id: str) -> Optional[Dict]:
    return next((n for n in load_novels() if n["id"] == novel_id), None)


def _novel_dir(novel_id: str) -> Path:
    d = BASE_DATA_DIR / novel_id
    d.mkdir(parents=True, exist_ok=True)
    return d


# ── Characters ────────────────────────────────────────────────────────────────

def load_characters(novel_id: str) -> Dict[str, Dict]:
    return _load(_novel_dir(novel_id) / "characters.json", {})


def upsert_character(char: Dict, novel_id: str) -> None:
    db = load_characters(novel_id)
    name = char.get("name", "").strip()
    if not name:
        return
    if name in db:
        existing = db[name]
        locked_fields = existing.get("_locked_fields", [])
        for key, val in char.items():
            if key not in locked_fields and key != "_locked_fields":
                if key == "prompt_tags" and isinstance(val, str):
                    val = [t.strip() for t in val.split(",") if t.strip()]
                existing[key] = val
        db[name] = existing
    else:
        # Initialize with full schema including profiles
        import uuid as _uuid
        profile = {
            "id": str(_uuid.uuid4())[:8],
            "label": f"初始設定",
            "chapter": char.get("chapter", 0),
            "age": char.get("age", ""),
            "appearance": char.get("appearance", ""),
            "outfit": char.get("outfit", ""),
            "personality": char.get("personality", ""),
            "abilities": char.get("abilities", []),
        }
        raw_tags = char.get("prompt_tags", [])
        if isinstance(raw_tags, str):
            raw_tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
        db[name] = {
            "name": name,
            "role": char.get("role", ""),
            "prompt_tags": raw_tags,
            "profiles": [profile],
            "_locked_fields": [],
        }
    _save(_novel_dir(novel_id) / "characters.json", db)


def lock_character_field(name: str, field: str, novel_id: str) -> None:
    db = load_characters(novel_id)
    if name in db:
        locked = db[name].get("_locked_fields", [])
        if field not in locked:
            locked.append(field)
        db[name]["_locked_fields"] = locked
        _save(_novel_dir(novel_id) / "characters.json", db)


def unlock_character_field(name: str, field: str, novel_id: str) -> None:
    db = load_characters(novel_id)
    if name in db:
        locked = db[name].get("_locked_fields", [])
        if field in locked:
            locked.remove(field)
        db[name]["_locked_fields"] = locked
        _save(_novel_dir(novel_id) / "characters.json", db)


def delete_character(name: str, novel_id: str) -> None:
    db = load_characters(novel_id)
    db.pop(name, None)
    _save(_novel_dir(novel_id) / "characters.json", db)


def update_character_field(name: str, field: str, value: Any, novel_id: str) -> None:
    db = load_characters(novel_id)
    if name in db:
        db[name][field] = value
        _save(_novel_dir(novel_id) / "characters.json", db)


# ── World Rules ───────────────────────────────────────────────────────────────

def load_world_rules(novel_id: str) -> List[Dict]:
    return _load(_novel_dir(novel_id) / "world.json", [])


def add_world_rules(rules: List[Dict], novel_id: str, chapter: int = 0) -> None:
    db = load_world_rules(novel_id)
    existing_texts = {r.get("rule", "").strip() for r in db}
    for r in rules:
        rule_text = r.get("rule", "").strip() if isinstance(r, dict) else str(r).strip()
        if rule_text and rule_text not in existing_texts:
            db.append({
                "rule": rule_text,
                "category": r.get("category", "general") if isinstance(r, dict) else "general",
                "chapter_first_seen": chapter,
            })
            existing_texts.add(rule_text)
    _save(_novel_dir(novel_id) / "world.json", db)


def delete_world_rule(rule_text: str, novel_id: str) -> None:
    db = load_world_rules(novel_id)
    db = [r for r in db if r.get("rule", "") != rule_text]
    _save(_novel_dir(novel_id) / "world.json", db)


# ── Scenes ────────────────────────────────────────────────────────────────────

def load_scenes(novel_id: str) -> List[Dict]:
    return _load(_novel_dir(novel_id) / "scenes.json", [])


def add_scenes(scenes: List[Dict], storyboard: List[Dict], novel_id: str, chapter: int = 0) -> None:
    db = load_scenes(novel_id)
    board_map = {b["scene_id"]: b for b in storyboard if "scene_id" in b}
    existing_ids = {s.get("global_id") for s in db}
    for scene in scenes:
        sid = scene.get("scene_id", 0)
        entry = dict(scene)
        entry["chapter"] = chapter
        entry["global_id"] = f"ch{chapter}_s{sid}"
        if sid in board_map:
            entry["t2i_prompt"] = board_map[sid].get("t2i_prompt", "")
            entry["panel_description"] = board_map[sid].get("panel_description", "")
            entry["negative_prompt"] = board_map[sid].get("negative_prompt", "")
        if entry["global_id"] not in existing_ids:
            db.append(entry)
            existing_ids.add(entry["global_id"])
    _save(_novel_dir(novel_id) / "scenes.json", db)


# ── Bible Summary ─────────────────────────────────────────────────────────────

def get_bible_summary(novel_id: str) -> Dict:
    chars = load_characters(novel_id)
    world = load_world_rules(novel_id)
    scenes = load_scenes(novel_id)
    chapters = sorted({s.get("chapter", 0) for s in scenes})
    return {
        "novel_id": novel_id,
        "character_count": len(chars),
        "world_rule_count": len(world),
        "scene_count": len(scenes),
        "chapters_processed": chapters,
        "characters": list(chars.values()),
        "world_rules": world,
        "scenes": scenes,
    }


def reset_bible(novel_id: str) -> None:
    for fname in ["characters.json", "world.json", "scenes.json"]:
        f = _novel_dir(novel_id) / fname
        if f.exists():
            f.unlink()


def get_context_for_agents(novel_id: str) -> str:
    chars = load_characters(novel_id)
    world = load_world_rules(novel_id)
    lines = []
    if chars:
        lines.append("=== Existing Characters (DO NOT change locked appearance) ===")
        for name, c in chars.items():
            locked = c.get("_locked_fields", [])
            lines.append(
                f"- {name} | role={c.get('role','')} | age={c.get('age','')} "
                f"| appearance={c.get('appearance','')} | outfit={c.get('outfit','')} "
                f"| personality={c.get('personality','')} | locked={locked}"
            )
    if world:
        lines.append("=== Existing World Rules (do not duplicate) ===")
        for r in world:
            lines.append(f"- [{r.get('category','')}] {r.get('rule','')}")
    return "\n".join(lines) if lines else ""


# ── Chapters ──────────────────────────────────────────────────────────────────

def load_chapters(novel_id: str) -> List[Dict]:
    """Returns list of chapter records sorted by chapter_number."""
    chapters = _load(_novel_dir(novel_id) / "chapters.json", [])
    return sorted(chapters, key=lambda c: c.get("chapter_number", 0))


def save_chapter(novel_id: str, chapter_number: int, title: str, text: str) -> Dict:
    """Create or update a chapter. Returns the saved chapter dict."""
    import datetime as _dt
    chapters = _load(_novel_dir(novel_id) / "chapters.json", [])
    now = _dt.datetime.now().isoformat()
    # Find existing
    for i, ch in enumerate(chapters):
        if ch.get("chapter_number") == chapter_number:
            chapters[i]["title"] = title
            chapters[i]["text"] = text
            chapters[i]["updated_at"] = now
            _save(_novel_dir(novel_id) / "chapters.json", chapters)
            return chapters[i]
    # New chapter
    entry = {
        "chapter_number": chapter_number,
        "title": title or f"第 {chapter_number} 章",
        "text": text,
        "created_at": now,
        "updated_at": now,
    }
    chapters.append(entry)
    _save(_novel_dir(novel_id) / "chapters.json", chapters)
    return entry


def delete_chapter(novel_id: str, chapter_number: int) -> None:
    chapters = _load(_novel_dir(novel_id) / "chapters.json", [])
    chapters = [c for c in chapters if c.get("chapter_number") != chapter_number]
    _save(_novel_dir(novel_id) / "chapters.json", chapters)


def get_chapter(novel_id: str, chapter_number: int) -> Optional[Dict]:
    chapters = _load(_novel_dir(novel_id) / "chapters.json", [])
    return next((c for c in chapters if c.get("chapter_number") == chapter_number), None)


# ── Timeline (Pipeline Results per Chapter) ───────────────────────────────────

def save_timeline(novel_id: str, chapter_number: int, data: Dict) -> Dict:
    """Save pipeline output (scenes, storyboard, characters, world_rules) for a chapter."""
    import datetime as _dt
    path = _novel_dir(novel_id) / f"timeline_ch{chapter_number}.json"
    entry = {
        "chapter_number": chapter_number,
        "updated_at": _dt.datetime.now().isoformat(),
        "scenes": data.get("scenes", []),
        "storyboard": data.get("storyboard", []),
        "characters": data.get("characters", []),
        "world_rules": data.get("world_rules", []),
    }
    _save(path, entry)
    return entry


def load_timeline(novel_id: str, chapter_number: int) -> Optional[Dict]:
    """Load saved timeline for a chapter."""
    path = _novel_dir(novel_id) / f"timeline_ch{chapter_number}.json"
    return _load(path, None)


def list_timelines(novel_id: str) -> List[Dict]:
    """List metadata of all saved timelines (no heavy content)."""
    result = []
    d = _novel_dir(novel_id)
    for f in sorted(d.glob("timeline_ch*.json")):
        data = _load(f, {})
        if data:
            result.append({
                "chapter_number": data.get("chapter_number"),
                "updated_at": data.get("updated_at"),
                "scene_count": len(data.get("scenes", [])),
                "character_count": len(data.get("characters", [])),
            })
    return result


def delete_timeline(novel_id: str, chapter_number: int) -> None:
    path = _novel_dir(novel_id) / f"timeline_ch{chapter_number}.json"
    if path.exists():
        path.unlink()


# ── Novel Visual Style ────────────────────────────────────────────────────────

def save_novel_style(novel_id: str, style: Dict) -> Dict:
    """Save the global visual style for a novel (from agent or user override)."""
    import datetime as _dt
    entry = {
        "updated_at": _dt.datetime.now().isoformat(),
        **style,
    }
    _save(_novel_dir(novel_id) / "style.json", entry)
    return entry


def load_novel_style(novel_id: str) -> Optional[Dict]:
    """Load saved visual style, returns None if not set."""
    return _load(_novel_dir(novel_id) / "style.json", None)


# ── Character Visual Spec (for scene prompt injection) ────────────────────────

def get_character_visual_spec(novel_id: str, char_name: str) -> str:
    """
    Build a compact English visual description for a character,
    used to inject into scene prompts for consistency.
    Returns empty string if character not found.
    """
    db = load_characters(novel_id)
    char = db.get(char_name)
    if not char:
        return ""

    parts = []
    raw_tags = char.get("prompt_tags", [])
    # 相容舊版（字串）與新版（array）
    if isinstance(raw_tags, str):
        tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
    else:
        tags = raw_tags or []
    if tags:
        parts.append(", ".join(tags[:10]))

    # Use latest profile for appearance/outfit
    profiles = char.get("profiles", [])
    if profiles:
        latest = profiles[-1]
        if latest.get("appearance"):
            parts.append(latest["appearance"])
        if latest.get("outfit"):
            parts.append(f"wearing {latest['outfit']}")

    return ", ".join(parts) if parts else ""


def get_characters_visual_specs(novel_id: str, char_names: list) -> str:
    """
    Build combined visual spec for multiple characters in a scene.
    Format: "char1_name: [visual spec], char2_name: [visual spec]"
    """
    specs = []
    for name in char_names:
        spec = get_character_visual_spec(novel_id, name)
        if spec:
            specs.append(f"({name}: {spec})")
    return ", ".join(specs)
