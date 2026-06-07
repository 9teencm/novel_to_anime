"""
Image Generation Module — HF API only (FLUX.1-schnell → SDXL fallback)
Stores generated images under backend/data/{novel_id}/images/
"""

import os
import time
import base64
import requests
from pathlib import Path
from typing import Optional, Tuple

HF_FLUX_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
HF_SDXL_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"


def _get_hf_token() -> Optional[str]:
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")


def _images_dir(novel_id: str) -> Path:
    from backend.crew.datastore import BASE_DATA_DIR
    d = BASE_DATA_DIR / novel_id / "images"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _hf_post(url: str, headers: dict, payload: dict) -> requests.Response:
    """POST with one 503 retry."""
    r = requests.post(url, headers=headers, json=payload, timeout=120)
    if r.status_code == 503:
        time.sleep(25)
        r = requests.post(url, headers=headers, json=payload, timeout=120)
    return r


def _save_response(response: requests.Response, filepath: Path) -> bool:
    """Try to extract image bytes from response and save. Returns True on success."""
    content_type = response.headers.get("content-type", "")
    if "image" in content_type:
        filepath.write_bytes(response.content)
        return True
    try:
        data = response.json()
        if isinstance(data, list) and data and "generated_image" in data[0]:
            filepath.write_bytes(base64.b64decode(data[0]["generated_image"]))
            return True
    except Exception:
        pass
    return False


def _hf_generate(prompt: str, filepath: Path, width: int, height: int,
                 negative_prompt: str = "") -> Tuple[bool, str]:
    """Call HF FLUX.1-schnell → SDXL, save to filepath. Returns (ok, path_or_error)."""
    token = _get_hf_token()
    if not token:
        return False, "未設定 HF_TOKEN，請在 backend/.env 加入 HF_TOKEN=your_token"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Use-Cache": "false",
    }

    attempts = [
        (HF_FLUX_URL, "FLUX.1-schnell", {
            "inputs": prompt,
            "parameters": {"width": width, "height": height, "num_inference_steps": 4},
        }),
        (HF_SDXL_URL, "SDXL", {
            "inputs": prompt,
            "parameters": {
                "width": min(width, 1024),
                "height": min(height, 1024),
                "negative_prompt": negative_prompt or "blurry, low quality, watermark",
                "num_inference_steps": 20,
                "guidance_scale": 7.5,
            },
        }),
    ]

    last_error = ""
    for url, label, payload in attempts:
        try:
            r = _hf_post(url, headers, payload)
            if r.status_code == 200:
                if _save_response(r, filepath):
                    return True, str(filepath)
                last_error = f"{label}: 非圖片回應"
            elif r.status_code == 401:
                return False, "HF_TOKEN 無效（401）"
            elif r.status_code == 403:
                return False, "Token 權限不足（403）－請勾選 'Make calls to Inference Providers'"
            elif r.status_code == 429:
                return False, "請求過於頻繁（429），請稍後再試"
            else:
                try:
                    err = r.json()
                except Exception:
                    err = r.text[:200]
                last_error = f"{label} HTTP {r.status_code}: {err}"
        except requests.Timeout:
            last_error = f"{label} 請求逾時"
        except Exception as e:
            last_error = f"{label} 例外: {e}"

    return False, last_error or "圖像生成失敗"


# ── Scene image ───────────────────────────────────────────────────────────────

def generate_image(
    prompt: str,
    novel_id: str,
    scene_id: int,
    negative_prompt: str = "",
    aspect_ratio: str = "16:9",
    force_regenerate: bool = False,
) -> Tuple[bool, str]:
    """Generate a scene image via HF API. Returns (success, file_path_or_error)."""
    filepath = _images_dir(novel_id) / f"scene_{scene_id:03d}.png"
    if filepath.exists() and not force_regenerate:
        return True, str(filepath)

    dimensions = {"16:9": (1024, 576), "9:16": (576, 1024), "1:1": (768, 768)}
    width, height = dimensions.get(aspect_ratio, (1024, 576))
    return _hf_generate(prompt, filepath, width, height, negative_prompt)


# ── Query helpers ─────────────────────────────────────────────────────────────

def get_image_path(novel_id: str, scene_id: int) -> Optional[str]:
    path = _images_dir(novel_id) / f"scene_{scene_id:03d}.png"
    return str(path) if path.exists() else None


def get_image_url(novel_id: str, scene_id: int) -> Optional[str]:
    if get_image_path(novel_id, scene_id):
        return f"/api/novels/{novel_id}/images/{scene_id}"
    return None


def list_generated_images(novel_id: str) -> list:
    d = _images_dir(novel_id)
    if not d.exists():
        return []
    result = []
    for f in sorted(d.glob("scene_*.png")):
        try:
            scene_id = int(f.stem.split("_")[1])
            result.append({"scene_id": scene_id, "path": str(f)})
        except Exception:
            pass
    return result
