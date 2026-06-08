"""
ComfyUI SDXL 分鏡圖生成模組
=============================
透過 ComfyUI REST API 呼叫遠端 GPU（Tailscale）
使用 Stable Diffusion XL 1.0 Base 生成場景分鏡圖

用法：
  from backend.crew.comfyui_sdxl_gen import generate_image_comfyui
  ok, path_or_err = generate_image_comfyui(
      novel_id="abc123",
      scene_id=1,
      prompt="anime scene, ...",
  )
"""

import json
import time
import uuid
import requests
from pathlib import Path
from typing import Optional, Tuple

# ── 設定 ──────────────────────────────────────────────────────────────────────

COMFYUI_HOST = "100.72.78.12"
COMFYUI_PORT = 8188
BASE_URL      = f"http://{COMFYUI_HOST}:{COMFYUI_PORT}"

TIMEOUT_QUEUE  = 30
TIMEOUT_POLL   = 300   # 最長等待 5 分鐘
POLL_INTERVAL  = 3

NODE_POSITIVE  = "2"
NODE_NEGATIVE  = "3"
NODE_LATENT    = "4"
NODE_SAMPLER   = "5"
NODE_SAVE      = "7"


# ── 工具函式 ──────────────────────────────────────────────────────────────────

def _is_available() -> bool:
    try:
        r = requests.get(f"{BASE_URL}/system_stats", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def _build_workflow(
    prompt: str,
    negative_prompt: str,
    width: int,
    height: int,
    seed: int,
    steps: int,
    cfg: float,
) -> dict:
    workflow_path = Path(__file__).parent.parent.parent / "sdxl_t2i_workflow.json"
    with open(workflow_path, encoding="utf-8") as f:
        wf = json.load(f)

    wf[NODE_POSITIVE]["inputs"]["text"]  = prompt
    wf[NODE_NEGATIVE]["inputs"]["text"]  = negative_prompt
    wf[NODE_LATENT]["inputs"]["width"]   = width
    wf[NODE_LATENT]["inputs"]["height"]  = height
    wf[NODE_SAMPLER]["inputs"]["seed"]   = seed
    wf[NODE_SAMPLER]["inputs"]["steps"]  = steps
    wf[NODE_SAMPLER]["inputs"]["cfg"]    = cfg

    return wf


def _queue_prompt(workflow: dict) -> Optional[str]:
    client_id = str(uuid.uuid4())
    payload = {"prompt": workflow, "client_id": client_id}
    r = requests.post(f"{BASE_URL}/prompt", json=payload, timeout=TIMEOUT_QUEUE)
    if r.status_code == 200:
        return r.json().get("prompt_id")
    return None


def _wait_for_result(prompt_id: str) -> Optional[dict]:
    deadline = time.time() + TIMEOUT_POLL
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE_URL}/history/{prompt_id}", timeout=10)
            if r.status_code == 200:
                history = r.json()
                if prompt_id in history:
                    return history[prompt_id]
        except Exception:
            pass
        time.sleep(POLL_INTERVAL)
    return None


def _download_image(result: dict, save_path: Path, node_id: str = NODE_SAVE) -> bool:
    outputs = result.get("outputs", {})
    node_out = outputs.get(node_id, {})
    images = node_out.get("images", [])
    if not images:
        return False

    img_info = images[0]
    params = {
        "filename": img_info.get("filename", ""),
        "subfolder": img_info.get("subfolder", ""),
        "type": img_info.get("type", "output"),
    }
    r = requests.get(f"{BASE_URL}/view", params=params, stream=True, timeout=60)
    if r.status_code != 200:
        return False

    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path.exists() and save_path.stat().st_size > 1000


# ── 公開 API ──────────────────────────────────────────────────────────────────

def generate_image_comfyui(
    novel_id: str,
    scene_id: int,
    prompt: str,
    negative_prompt: str = "bad quality, blurry, watermark, distorted, ugly, low resolution",
    aspect_ratio: str = "16:9",
    seed: int = -1,
    steps: int = 25,
    cfg: float = 7.0,
    force_regenerate: bool = False,
) -> Tuple[bool, str]:
    """
    呼叫遠端 ComfyUI SDXL 生成場景分鏡圖。

    Returns
    -------
    (True, 圖片路徑) 或 (False, 錯誤訊息)
    """
    from backend.crew.datastore import BASE_DATA_DIR

    save_path = BASE_DATA_DIR / novel_id / "images" / f"scene_{scene_id:03d}.png"
    if save_path.exists() and not force_regenerate:
        return True, str(save_path)

    if not _is_available():
        return False, f"ComfyUI 無法連線（{BASE_URL}）"

    dimensions = {"16:9": (1024, 576), "9:16": (576, 1024), "1:1": (1024, 1024)}
    width, height = dimensions.get(aspect_ratio, (1024, 576))

    actual_seed = seed if seed >= 0 else int(time.time() * 1000) % (2**31)
    workflow = _build_workflow(prompt, negative_prompt, width, height, actual_seed, steps, cfg)

    prompt_id = _queue_prompt(workflow)
    if not prompt_id:
        return False, "送出 ComfyUI queue 失敗"

    print(f"[comfyui_sdxl] 場景 {scene_id} 已送出，prompt_id={prompt_id}")

    result = _wait_for_result(prompt_id)
    if not result:
        return False, f"ComfyUI 生成逾時（>{TIMEOUT_POLL}s）"

    ok = _download_image(result, save_path)
    if ok:
        print(f"[comfyui_sdxl] 場景 {scene_id} 完成：{save_path}")
        return True, str(save_path)
    return False, "圖片下載失敗"


def is_comfyui_available() -> bool:
    return _is_available()
