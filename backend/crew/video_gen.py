"""
Video Generation — Ken Burns + Dynamic ASS Subtitles
=====================================================
- Ken Burns zoompan effect on storyboard PNG
- Duration: dynamically calculated from narration + dialogue count
  narration: 2s fixed
  each dialogue line: max(2.5s, len(line)*0.12s)
  total: capped at 20s
- Subtitles: ASS format, sequential timing per dialogue line
- Output: backend/data/{novel_id}/videos/scene_NNN.mp4 (720p)
- Assembly: scene clips → final.mp4 via ffmpeg concat
"""

import subprocess
import shutil
import os
from pathlib import Path
from typing import Optional, Tuple, List


# ── FFmpeg discovery ──────────────────────────────────────────────────────────

def _find_ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    if local_appdata:
        winget_root = Path(local_appdata) / "Microsoft" / "WinGet" / "Packages"
        try:
            for d in winget_root.glob("Gyan.FFmpeg*"):
                exe = next(d.rglob("ffmpeg.exe"), None)
                if exe:
                    return str(exe)
        except Exception:
            pass
    for c in [r"C:\ffmpeg\bin\ffmpeg.exe", r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"]:
        if Path(c).exists():
            return c
    return "ffmpeg"


# ── Path helpers ──────────────────────────────────────────────────────────────

def _videos_dir(novel_id: str) -> Path:
    from backend.crew.datastore import BASE_DATA_DIR
    d = BASE_DATA_DIR / novel_id / "videos"
    d.mkdir(parents=True, exist_ok=True)
    return d


# ── Ken Burns motion presets ──────────────────────────────────────────────────

_MOTIONS = [
    ("'zoom+0.0015'",                "'iw/2-(iw/zoom/2)'",   "'ih/2-(ih/zoom/2)'"),
    ("'if(eq(on,1),1.3,zoom-0.0015)'", "'iw/2-(iw/zoom/2)'", "'ih/2-(ih/zoom/2)'"),
    ("'zoom+0.001'",                 "'on*1.2'",              "'ih/2-(ih/zoom/2)'"),
    ("'zoom+0.001'",                 "'iw-on*1.2'",           "'ih/2-(ih/zoom/2)'"),
    ("'zoom+0.0012'",                "'iw/4-(iw/zoom/4)'",    "'3*ih/4-(ih/zoom/4)'"),
    ("'zoom+0.0012'",                "'3*iw/4-(iw/zoom/4)'",  "'ih/4-(ih/zoom/4)'"),
]

# Slow-motion Ken Burns for long scenes (> 8s)
_MOTIONS_SLOW = [
    ("'zoom+0.0006'", "'iw/2-(iw/zoom/2)'",  "'ih/2-(ih/zoom/2)'"),
    ("'zoom+0.0005'", "'on*0.5'",             "'ih/2-(ih/zoom/2)'"),
    ("'zoom+0.0005'", "'iw-on*0.5'",          "'ih/2-(ih/zoom/2)'"),
]


# ── Duration calculator ───────────────────────────────────────────────────────

def _calc_duration(narration: str, dialogues: list) -> float:
    """
    Estimate video duration so every dialogue line has time to be read.
      narration: 2s
      each line : max(2.5s, char_count * 0.12s)
      minimum   : 3s
      maximum   : 20s
    """
    dur = 2.0 if narration else 0.0
    for d in dialogues:
        line = d.get("line", "") if isinstance(d, dict) else str(d)
        dur += max(2.5, len(line) * 0.12)
    return max(3.0, min(dur, 20.0))


# ── ASS subtitle builder ──────────────────────────────────────────────────────

def _ts(seconds: float) -> str:
    """Convert float seconds → ASS timestamp H:MM:SS.cc"""
    h  = int(seconds // 3600)
    m  = int((seconds % 3600) // 60)
    s  = seconds % 60
    cs = int(round((s % 1) * 100))
    return f"{h}:{m:02d}:{int(s):02d}.{cs:02d}"


def _wrap_ass(text: str, width: int = 20) -> str:
    """Split into lines of ≤ width CJK chars using ASS hard line-break (\\N)."""
    text = text.strip()
    chunks: List[str] = []
    while len(text) > width:
        chunks.append(text[:width])
        text = text[width:]
    if text:
        chunks.append(text)
    return "\\N".join(chunks[:3])


def _build_ass(narration: str, dialogues: list, total_duration: float) -> str:
    """
    Build ASS subtitle content.
    narration  → 0 to 2s (or full duration if no dialogues)
    dialogues  → sequential after narration, each sized by line length
    """
    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "PlayResX: 1280\n"
        "PlayResY: 720\n"
        "WrapStyle: 0\n\n"
        "[V4+ Styles]\n"
        "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,"
        "OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,"
        "ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,"
        "Alignment,MarginL,MarginR,MarginV,Encoding\n"
        # Style: white text, black outline (BorderStyle=1), bottom-centre
        "Style: Default,Microsoft YaHei UI,30,"
        "&H00FFFFFF,&H000000FF,&H00000000,&H80000000,"
        "0,0,0,0,100,100,0,0,1,2,1,2,20,20,30,1\n"
        # Speaker style: slightly smaller, cyan tint
        "Style: Speaker,Microsoft YaHei UI,24,"
        "&H00FFE066,&H000000FF,&H00000000,&H80000000,"
        "1,0,0,0,100,100,0,0,1,2,1,2,20,20,65,1\n\n"
        "[Events]\n"
        "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n"
    )

    events: List[str] = []
    cursor = 0.0

    # Narration block
    if narration:
        n_end = 2.0 if dialogues else total_duration
        events.append(
            f"Dialogue: 0,{_ts(0)},{_ts(n_end)},Default,,0,0,0,,{_wrap_ass(narration)}"
        )
        cursor = n_end

    # Dialogue lines
    for d in dialogues:
        if isinstance(d, dict):
            speaker = d.get("speaker", "")
            line    = d.get("line", "").strip()
        else:
            speaker, line = "", str(d).strip()

        if not line:
            continue

        line_dur = max(2.5, len(line) * 0.12)
        t_start  = cursor
        t_end    = min(cursor + line_dur, total_duration)

        # Speaker name on its own line above the dialogue
        if speaker:
            events.append(
                f"Dialogue: 0,{_ts(t_start)},{_ts(t_end)},Speaker,,0,0,0,,{_wrap_ass(speaker)}"
            )
        events.append(
            f"Dialogue: 0,{_ts(t_start)},{_ts(t_end)},Default,,0,0,0,,{_wrap_ass(line)}"
        )
        cursor = t_end

    return header + "\n".join(events) + "\n"


# ── Core render ───────────────────────────────────────────────────────────────

def _ken_burns_with_subtitles(
    image_path: str,
    output_path: Path,
    narration: str = "",
    dialogues: list = None,
    duration: float = 5.0,
    motion_index: int = 0,
) -> Tuple[bool, str]:
    if dialogues is None:
        dialogues = []

    fps         = 25
    total_frames = int(duration * fps)
    out_w, out_h = 1280, 720
    fonts_dir    = r"C:\Windows\Fonts"

    # Choose slower motion preset for long scenes
    motions = _MOTIONS_SLOW if duration > 8 else _MOTIONS
    z, x, y = motions[motion_index % len(motions)]

    zoompan = (
        f"scale=8000:-1,"
        f"zoompan=z={z}:x={x}:y={y}:d={total_frames}:s={out_w}x{out_h}:fps={fps},"
        f"setsar=1"
    )

    ffmpeg_bin = _find_ffmpeg()
    has_subs   = bool(narration or dialogues)
    ass_path   = output_path.with_suffix(".ass")

    if has_subs:
        ass_content = _build_ass(narration, dialogues, duration)
        ass_path.write_text(ass_content, encoding="utf-8")
        ass_esc = str(ass_path).replace("\\", "/").replace(":", "\\:")
        if Path(fonts_dir).exists():
            fd_esc = fonts_dir.replace("\\", "/").replace(":", "\\:")
            vf = f"{zoompan},subtitles='{ass_esc}:fontsdir={fd_esc}'"
        else:
            vf = f"{zoompan},subtitles='{ass_esc}'"
    else:
        vf = zoompan

    cmd = [
        ffmpeg_bin, "-y",
        "-loop", "1", "-i", image_path,
        "-vf", vf,
        "-t", str(duration),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-preset", "fast", "-crf", "23",
        str(output_path),
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, timeout=300,
            encoding="utf-8", errors="ignore",
        )
        ok = (result.returncode == 0
              and output_path.exists()
              and output_path.stat().st_size > 1000)

        if ok:
            _try_unlink(ass_path)
            return True, str(output_path)

        stderr = result.stderr or ""
        # Retry without subtitles if subtitle filter caused the error
        if has_subs and any(k in stderr.lower() for k in ("subtitles", "ass", "font", "invalid")):
            print(f"[video_gen] subtitle filter failed, retrying without subs:\n{stderr[-400:]}")
            _try_unlink(ass_path)
            return _ken_burns_with_subtitles(
                image_path, output_path, narration="", dialogues=[],
                duration=duration, motion_index=motion_index,
            )
        return False, f"FFmpeg 錯誤: {stderr[-400:]}"

    except subprocess.TimeoutExpired:
        return False, "FFmpeg 逾時"
    except FileNotFoundError:
        return False, f"找不到 ffmpeg（路徑：{ffmpeg_bin}）"
    except Exception as e:
        return False, f"渲染錯誤: {e}"
    finally:
        _try_unlink(ass_path)


def _try_unlink(path: Path):
    try:
        if path.exists():
            path.unlink()
    except Exception:
        pass


def _get_video_duration(video_path: str) -> float:
    """用 ffprobe 取得影片實際秒數，失敗回傳預設 3.06s（49幀@16fps）。"""
    ffmpeg_bin = _find_ffmpeg()
    ffprobe_bin = ffmpeg_bin.replace("ffmpeg", "ffprobe")
    try:
        result = subprocess.run(
            [ffprobe_bin, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", video_path],
            capture_output=True, encoding="utf-8", timeout=10,
        )
        return float(result.stdout.strip())
    except Exception:
        return 3.0625  # 49 frames @ 16fps


def _burn_subtitles_on_video(
    video_path: Path,
    narration: str,
    dialogues: list,
) -> Tuple[bool, str]:
    """
    在已生成的影片上疊加 ASS 字幕（後處理）。
    字幕時序會自動縮放到影片實際長度。
    """
    if not narration and not dialogues:
        return True, str(video_path)

    duration = _get_video_duration(str(video_path))
    ass_path = video_path.with_suffix(".ass")
    tmp_path = video_path.with_stem(video_path.stem + "_sub")
    fonts_dir = r"C:\Windows\Fonts"
    ffmpeg_bin = _find_ffmpeg()

    try:
        ass_content = _build_ass(narration, dialogues, duration)
        ass_path.write_text(ass_content, encoding="utf-8")
        ass_esc = str(ass_path).replace("\\", "/").replace(":", "\\:")

        if Path(fonts_dir).exists():
            fd_esc = fonts_dir.replace("\\", "/").replace(":", "\\:")
            vf = f"subtitles='{ass_esc}:fontsdir={fd_esc}'"
        else:
            vf = f"subtitles='{ass_esc}'"

        cmd = [
            ffmpeg_bin, "-y",
            "-i", str(video_path),
            "-vf", vf,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "19",
            "-c:a", "copy",
            str(tmp_path),
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=120,
                                encoding="utf-8", errors="ignore")
        ok = (result.returncode == 0
              and tmp_path.exists()
              and tmp_path.stat().st_size > 1000)
        if ok:
            video_path.unlink()
            tmp_path.rename(video_path)
            return True, str(video_path)

        stderr = result.stderr or ""
        # 字幕濾鏡失敗就保留原始影片
        if any(k in stderr.lower() for k in ("subtitles", "ass", "font")):
            print(f"[video_gen] 字幕疊加失敗，保留原始影片: {stderr[-300:]}")
            return True, str(video_path)
        return False, f"字幕疊加 FFmpeg 錯誤: {stderr[-300:]}"

    except Exception as e:
        return True, str(video_path)  # 疊加失敗就保留原始影片
    finally:
        _try_unlink(ass_path)
        _try_unlink(tmp_path)


# ── Public API ────────────────────────────────────────────────────────────────

def generate_scene_video(
    novel_id: str,
    scene_id: int,
    prompt: str,
    storyboard_image_path: Optional[str] = None,
    force_regenerate: bool = False,
    narration: str = "",
    dialogues: list = None,
) -> Tuple[bool, str]:
    """
    生成場景影片。
    優先順序：ComfyUI Wan2.1-I2V（本地 GPU）→ Ken Burns FFmpeg（本地）
    Returns (success, file_path_or_error).
    """
    if dialogues is None:
        dialogues = []

    save_path = _videos_dir(novel_id) / f"scene_{scene_id:03d}.mp4"
    if save_path.exists() and not force_regenerate:
        return True, str(save_path)

    if not storyboard_image_path or not Path(storyboard_image_path).exists():
        return False, "找不到分鏡圖，請先在「分鏡時間軸」生成分鏡圖"

    # 1. 嘗試 ComfyUI Wan2.1-I2V（本地 GPU）
    try:
        from backend.crew.comfyui_gen import generate_video_comfyui, is_comfyui_available
        if is_comfyui_available():
            ok, result = generate_video_comfyui(
                novel_id=novel_id,
                scene_id=scene_id,
                image_path=storyboard_image_path,
                prompt=prompt or "anime scene, smooth camera motion, cinematic, high quality",
                force_regenerate=force_regenerate,
            )
            if ok:
                print(f"[video_gen] 場景 {scene_id} 使用 ComfyUI I2V 生成完成，疊加字幕...")
                _burn_subtitles_on_video(Path(result), narration, dialogues)
                return True, result
            print(f"[video_gen] ComfyUI I2V 失敗：{result}，改用 Ken Burns")
    except Exception as e:
        print(f"[video_gen] ComfyUI I2V 例外：{e}，改用 Ken Burns")

    # 2. Fallback：Ken Burns + 字幕
    duration = _calc_duration(narration, dialogues)
    return _ken_burns_with_subtitles(
        image_path=storyboard_image_path,
        output_path=save_path,
        narration=narration,
        dialogues=dialogues,
        duration=duration,
        motion_index=scene_id,
    )


def get_video_path(novel_id: str, scene_id: int) -> Optional[str]:
    path = _videos_dir(novel_id) / f"scene_{scene_id:03d}.mp4"
    return str(path) if path.exists() else None


def list_generated_videos(novel_id: str) -> list:
    d = _videos_dir(novel_id)
    if not d.exists():
        return []
    result = []
    for f in sorted(d.glob("scene_*.mp4")):
        try:
            scene_id = int(f.stem.split("_")[1])
            result.append({"scene_id": scene_id, "path": str(f)})
        except Exception:
            pass
    return result
