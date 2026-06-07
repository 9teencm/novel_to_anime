import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Any, List
from backend.crew.pipeline import run_animation_pipeline
from backend.crew.datastore import (
    load_novels, create_novel, update_novel, delete_novel, get_novel,
    get_bible_summary, reset_bible,
    upsert_character, delete_character, lock_character_field, unlock_character_field, update_character_field,
    add_world_rules, delete_world_rule,
    save_chapter, load_chapters, get_chapter, delete_chapter,
    save_timeline, load_timeline, list_timelines, delete_timeline,
    save_novel_style, load_novel_style,
    get_characters_visual_specs,
)
import uvicorn

app = FastAPI(title="Novel-to-Animation OS Backend", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ─────────────────────────────────────────────────────────────────────

class RunCrewRequest(BaseModel):
    novel_text: str
    model_name: Optional[str] = None
    chapter_number: Optional[int] = 0
    update_bible: Optional[bool] = True
    novel_id: Optional[str] = None

class NovelCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    genre: Optional[str] = ""

class NovelUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    genre: Optional[str] = None

class CharacterUpsertRequest(BaseModel):
    character: dict

class CharacterFieldRequest(BaseModel):
    name: str
    field: str
    value: Optional[Any] = None

class WorldRuleRequest(BaseModel):
    rules: list

class ProfileRequest(BaseModel):
    name: str
    profile: dict

class ProfileDeleteRequest(BaseModel):
    name: str
    profile_id: str

class ChapterSaveRequest(BaseModel):
    chapter_number: int
    title: Optional[str] = ""
    text: str

class GenerateImagesRequest(BaseModel):
    scene_ids: Optional[List[int]] = None
    force_regenerate: Optional[bool] = False
    style_override: Optional[str] = None

class GenerateVideosRequest(BaseModel):
    scene_ids: Optional[List[int]] = None
    force_regenerate: Optional[bool] = False


class StyleSaveRequest(BaseModel):
    preset: Optional[str] = ""
    style_tags: Optional[str] = ""
    quality_tags: Optional[str] = ""
    negative_tags: Optional[str] = ""
    rationale: Optional[str] = ""
    user_override: Optional[bool] = False

class TimelineSaveRequest(BaseModel):
    scenes: Optional[List[Any]] = []
    storyboard: Optional[List[Any]] = []
    characters: Optional[List[Any]] = []
    world_rules: Optional[List[Any]] = []


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    groq_set = bool(os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY_1"))
    anthropic_set = bool(os.environ.get("ANTHROPIC_API_KEY"))
    provider = "groq" if groq_set else ("anthropic" if anthropic_set else "none")
    hf_set = bool(os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN"))
    return {"status": "healthy", "provider": provider, "api_key_set": groq_set or anthropic_set, "hf_token_set": hf_set}


# ── Pipeline ───────────────────────────────────────────────────────────────────

@app.post("/api/run-crew")
def run_crew(request: RunCrewRequest):
    if not request.novel_text.strip():
        raise HTTPException(status_code=400, detail="novel_text cannot be empty")
    try:
        result_json, logs = run_animation_pipeline(
            novel_text=request.novel_text,
            model_name=request.model_name,
            chapter_number=request.chapter_number or 0,
            update_bible=request.update_bible if request.update_bible is not None else True,
            novel_id=request.novel_id,
        )
        if request.novel_id and result_json.get("global_style"):
            try:
                save_novel_style(request.novel_id, result_json["global_style"])
            except Exception:
                pass
        return {"status": "success", "result": result_json, "logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Novel Manager ──────────────────────────────────────────────────────────────

@app.get("/api/novels")
def list_novels():
    return load_novels()

@app.post("/api/novels")
def api_create_novel(req: NovelCreateRequest):
    return create_novel(req.title, req.description or "", req.genre or "")

@app.put("/api/novels/{novel_id}")
def api_update_novel(novel_id: str, req: NovelUpdateRequest):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    result = update_novel(novel_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Novel not found")
    return result

@app.delete("/api/novels/{novel_id}")
def api_delete_novel(novel_id: str):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    delete_novel(novel_id)
    return {"status": "ok"}


# ── Production Bible ──────────────────────────────────────────────────────────

@app.get("/api/novels/{novel_id}/bible")
def get_bible(novel_id: str):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    return get_bible_summary(novel_id)

@app.post("/api/novels/{novel_id}/bible/reset")
def bible_reset(novel_id: str):
    reset_bible(novel_id)
    return {"status": "ok"}

@app.put("/api/novels/{novel_id}/bible/character")
def bible_upsert_character(novel_id: str, req: CharacterUpsertRequest):
    upsert_character(req.character, novel_id)
    return {"status": "ok"}

@app.delete("/api/novels/{novel_id}/bible/character/{name}")
def bible_delete_character(novel_id: str, name: str):
    delete_character(name, novel_id)
    return {"status": "ok"}

@app.post("/api/novels/{novel_id}/bible/character/lock")
def bible_lock_field(novel_id: str, req: CharacterFieldRequest):
    lock_character_field(req.name, req.field, novel_id)
    return {"status": "ok"}

@app.post("/api/novels/{novel_id}/bible/character/unlock")
def bible_unlock_field(novel_id: str, req: CharacterFieldRequest):
    unlock_character_field(req.name, req.field, novel_id)
    return {"status": "ok"}

@app.patch("/api/novels/{novel_id}/bible/character/field")
def bible_update_field(novel_id: str, req: CharacterFieldRequest):
    update_character_field(req.name, req.field, req.value, novel_id)
    return {"status": "ok"}

@app.post("/api/novels/{novel_id}/bible/world-rules")
def bible_add_world_rules(novel_id: str, req: WorldRuleRequest):
    add_world_rules(req.rules, novel_id)
    return {"status": "ok"}

@app.delete("/api/novels/{novel_id}/bible/world-rules")
def bible_delete_world_rule(novel_id: str, rule: str):
    delete_world_rule(rule, novel_id)
    return {"status": "ok"}

@app.post("/api/novels/{novel_id}/bible/character/profile")
def bible_add_profile(novel_id: str, req: ProfileRequest):
    import uuid
    from backend.crew.datastore import load_characters, _save, _novel_dir
    db = load_characters(novel_id)
    if req.name not in db:
        raise HTTPException(status_code=404, detail="Character not found")
    profile = dict(req.profile)
    profile["id"] = str(uuid.uuid4())[:8]
    db[req.name].setdefault("profiles", []).append(profile)
    _save(_novel_dir(novel_id) / "characters.json", db)
    return {"status": "ok", "profile_id": profile["id"]}

@app.put("/api/novels/{novel_id}/bible/character/profile")
def bible_update_profile(novel_id: str, req: ProfileRequest):
    from backend.crew.datastore import load_characters, _save, _novel_dir
    db = load_characters(novel_id)
    if req.name not in db:
        raise HTTPException(status_code=404, detail="Character not found")
    profiles = db[req.name].get("profiles", [])
    for i, p in enumerate(profiles):
        if p.get("id") == req.profile.get("id"):
            profiles[i] = {**p, **req.profile}
            break
    db[req.name]["profiles"] = profiles
    _save(_novel_dir(novel_id) / "characters.json", db)
    return {"status": "ok"}

@app.delete("/api/novels/{novel_id}/bible/character/profile")
def bible_delete_profile(novel_id: str, req: ProfileDeleteRequest):
    from backend.crew.datastore import load_characters, _save, _novel_dir
    db = load_characters(novel_id)
    if req.name not in db:
        raise HTTPException(status_code=404, detail="Character not found")
    db[req.name]["profiles"] = [p for p in db[req.name].get("profiles", []) if p.get("id") != req.profile_id]
    _save(_novel_dir(novel_id) / "characters.json", db)
    return {"status": "ok"}


# ── Chapters ──────────────────────────────────────────────────────────────────

@app.get("/api/novels/{novel_id}/chapters")
def list_chapters(novel_id: str):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    return load_chapters(novel_id)

@app.put("/api/novels/{novel_id}/chapters")
def api_save_chapter(novel_id: str, req: ChapterSaveRequest):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    return save_chapter(novel_id, req.chapter_number, req.title or f"第 {req.chapter_number} 章", req.text)

@app.get("/api/novels/{novel_id}/chapters/{chapter_number}")
def get_chapter_api(novel_id: str, chapter_number: int):
    ch = get_chapter(novel_id, chapter_number)
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return ch

@app.delete("/api/novels/{novel_id}/chapters/{chapter_number}")
def api_delete_chapter(novel_id: str, chapter_number: int):
    delete_chapter(novel_id, chapter_number)
    return {"status": "ok"}


# ── Image Generation ──────────────────────────────────────────────────────────

@app.post("/api/novels/{novel_id}/images/generate")
def generate_images(novel_id: str, req: GenerateImagesRequest):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    from backend.crew.datastore import load_scenes
    from backend.crew.image_gen import generate_image
    scenes = load_scenes(novel_id)
    if not scenes:
        raise HTTPException(status_code=400, detail="No scenes found. Run pipeline first.")

    novel_style = load_novel_style(novel_id)
    if req.style_override:
        style_prefix = req.style_override + ", "
        style_suffix = ", masterpiece, best quality, highly detailed"
    elif novel_style and novel_style.get("style_tags"):
        style_prefix = novel_style["style_tags"] + ", "
        style_suffix = ", " + (novel_style.get("quality_tags") or "masterpiece, best quality, highly detailed")
    else:
        style_prefix = "unified anime art style, cel shading, consistent character design, "
        style_suffix = ", masterpiece, best quality, highly detailed"

    results = []
    for scene in scenes:
        sid = scene.get("scene_id", 0)
        if req.scene_ids and sid not in req.scene_ids:
            continue
        prompt = scene.get("t2i_prompt", "")
        if not prompt:
            results.append({"scene_id": sid, "success": False, "message": "No t2i_prompt"})
            continue
        char_names = scene.get("characters_in_scene", [])
        char_spec = get_characters_visual_specs(novel_id, char_names) if char_names else ""
        char_prefix = f"featuring {char_spec}, " if char_spec else ""
        locked_prompt = style_prefix + char_prefix + prompt + style_suffix
        negative = scene.get("negative_prompt", "")
        ratio = scene.get("aspect_ratio", "16:9")
        success, result = generate_image(
            prompt=locked_prompt,
            novel_id=novel_id,
            scene_id=sid,
            negative_prompt=negative,
            aspect_ratio=ratio,
            force_regenerate=req.force_regenerate or False,
        )
        results.append({
            "scene_id": sid,
            "success": success,
            "message": result if not success else "ok",
            "image_url": f"/api/novels/{novel_id}/images/{sid}" if success else None,
        })
        import time; time.sleep(0.5)

    return {"status": "done", "results": results}

@app.get("/api/novels/{novel_id}/images/{scene_id}")
def serve_image(novel_id: str, scene_id: int):
    from backend.crew.image_gen import get_image_path
    path = get_image_path(novel_id, scene_id)
    if not path:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/png")

@app.get("/api/novels/{novel_id}/images")
def list_images(novel_id: str):
    from backend.crew.image_gen import list_generated_images
    images = list_generated_images(novel_id)
    return [{"scene_id": img["scene_id"], "image_url": f"/api/novels/{novel_id}/images/{img['scene_id']}"} for img in images]

@app.delete("/api/novels/{novel_id}/images/{scene_id}")
def delete_image(novel_id: str, scene_id: int):
    from backend.crew.image_gen import get_image_path
    from pathlib import Path
    path = get_image_path(novel_id, scene_id)
    if path:
        Path(path).unlink()
    return {"status": "ok"}


# ── Video Generation ──────────────────────────────────────────────────────────

@app.post("/api/novels/{novel_id}/videos/generate")
def generate_videos(novel_id: str, req: GenerateVideosRequest):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    from backend.crew.datastore import load_scenes
    from backend.crew.image_gen import get_image_path
    from backend.crew.video_gen import generate_scene_video
    import time as _time

    scenes = load_scenes(novel_id)
    if not scenes:
        raise HTTPException(status_code=400, detail="No scenes found. Run pipeline first.")

    results = []
    for scene in scenes:
        sid = scene.get("scene_id", 0)
        if req.scene_ids and sid not in req.scene_ids:
            continue
        prompt = scene.get("t2i_prompt", "") or scene.get("panel_description", "")
        narration = scene.get("narration") or scene.get("panel_description", "")
        dialogues = scene.get("dialogues", [])
        img_path = get_image_path(novel_id, sid)
        success, result = generate_scene_video(
            novel_id=novel_id,
            scene_id=sid,
            prompt=prompt,
            storyboard_image_path=img_path,
            force_regenerate=req.force_regenerate or False,
            narration=narration,
            dialogues=dialogues,
        )
        results.append({
            "scene_id": sid,
            "success": success,
            "message": result if not success else "ok",
            "video_url": f"/api/novels/{novel_id}/videos/{sid}" if success else None,
        })
        _time.sleep(1)

    return {"status": "done", "results": results}

@app.get("/api/novels/{novel_id}/videos/final")
def serve_final_video_early(novel_id: str):
    from backend.crew.datastore import BASE_DATA_DIR
    path = BASE_DATA_DIR / novel_id / "final.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="尚未組裝，請先呼叫 /videos/assemble")
    return FileResponse(str(path), media_type="video/mp4", filename=f"{novel_id}_final.mp4")

@app.get("/api/novels/{novel_id}/videos/{scene_id}")
def serve_video(novel_id: str, scene_id: int):
    from backend.crew.video_gen import get_video_path
    path = get_video_path(novel_id, scene_id)
    if not path:
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(path, media_type="video/mp4")

@app.get("/api/novels/{novel_id}/videos")
def list_videos(novel_id: str):
    from backend.crew.video_gen import list_generated_videos
    videos = list_generated_videos(novel_id)
    return [{"scene_id": v["scene_id"], "video_url": f"/api/novels/{novel_id}/videos/{v['scene_id']}"} for v in videos]

@app.delete("/api/novels/{novel_id}/videos/{scene_id}")
def delete_video(novel_id: str, scene_id: int):
    from backend.crew.video_gen import get_video_path
    from pathlib import Path
    path = get_video_path(novel_id, scene_id)
    if path:
        Path(path).unlink()
    return {"status": "ok"}


@app.post("/api/novels/{novel_id}/videos/assemble")
def assemble_video(novel_id: str):
    """Concatenate all scene videos into a single final.mp4 using FFmpeg."""
    import subprocess
    import tempfile
    from backend.crew.datastore import BASE_DATA_DIR
    from backend.crew.video_gen import list_generated_videos

    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")

    videos = list_generated_videos(novel_id)
    if not videos:
        raise HTTPException(status_code=400, detail="尚無場景影片，請先生成影片")

    output_path = BASE_DATA_DIR / novel_id / "final.mp4"

    # Write FFmpeg concat list (forward slashes required on Windows)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False,
                                     encoding="utf-8") as f:
        for v in videos:
            safe_path = v['path'].replace("\\", "/")
            f.write(f"file '{safe_path}'\n")
        concat_file = f.name

    try:
        from backend.crew.video_gen import _find_ffmpeg
        result = subprocess.run(
            [
                _find_ffmpeg(), "-y",
                "-f", "concat", "-safe", "0",
                "-i", concat_file,
                "-c", "copy",
                str(output_path),
            ],
            capture_output=True, timeout=300, encoding="utf-8", errors="ignore",
        )
        if result.returncode != 0:
            err = (result.stderr or "") + (result.stdout or "")
            print(f"[assemble] FFmpeg failed:\n{err[-800:]}")
            raise HTTPException(status_code=500, detail=f"FFmpeg 組裝錯誤: {err[-400:]}")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="找不到 ffmpeg，請確認伺服器已安裝 FFmpeg")
    finally:
        import os as _os
        _os.unlink(concat_file)

    return {
        "status": "ok",
        "scene_count": len(videos),
        "output_url": f"/api/novels/{novel_id}/videos/final",
    }




# ── Novel Visual Style ────────────────────────────────────────────────────────

@app.get("/api/novels/{novel_id}/style")
def api_get_style(novel_id: str):
    style = load_novel_style(novel_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not set")
    return style

@app.put("/api/novels/{novel_id}/style")
def api_save_style(novel_id: str, req: StyleSaveRequest):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    return save_novel_style(novel_id, req.dict())

@app.delete("/api/novels/{novel_id}/style")
def api_reset_style(novel_id: str):
    from pathlib import Path
    from backend.crew.datastore import _novel_dir
    p = _novel_dir(novel_id) / "style.json"
    if p.exists():
        p.unlink()
    return {"status": "ok"}


# ── Timeline ──────────────────────────────────────────────────────────────────

@app.put("/api/novels/{novel_id}/timeline/{chapter_number}")
def api_save_timeline(novel_id: str, chapter_number: int, req: TimelineSaveRequest):
    if not get_novel(novel_id):
        raise HTTPException(status_code=404, detail="Novel not found")
    return save_timeline(novel_id, chapter_number, req.dict())

@app.get("/api/novels/{novel_id}/timeline/{chapter_number}")
def api_get_timeline(novel_id: str, chapter_number: int):
    result = load_timeline(novel_id, chapter_number)
    if not result:
        raise HTTPException(status_code=404, detail="Timeline not found")
    return result

@app.get("/api/novels/{novel_id}/timelines")
def api_list_timelines(novel_id: str):
    return list_timelines(novel_id)

@app.delete("/api/novels/{novel_id}/timeline/{chapter_number}")
def api_delete_timeline(novel_id: str, chapter_number: int):
    delete_timeline(novel_id, chapter_number)
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
