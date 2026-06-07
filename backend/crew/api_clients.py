# backend/crew/api_clients.py
"""
集中式 API 客戶端模組 — 全免費無需 Key 版本。

服務對應：
  DuckDuckGo      : 網頁搜尋 + 圖片搜尋  (取代 Serper + Unsplash)
  edge-tts        : 文字轉語音            (取代 ElevenLabs TTS)
  Pollinations.ai : 文字生圖              (取代 Replicate SDXL)

所有函式在呼叫失敗時回傳含 "error" 欄位的 dict，不會中斷 Pipeline。
"""

import os
import asyncio
import base64
import requests
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# DuckDuckGo — 網頁搜尋
# ─────────────────────────────────────────────────────────────────────────────

def serper_search(query: str, num_results: int = 5) -> dict:
    """
    以 DuckDuckGo 執行網頁搜尋（取代 Serper）。
    回傳 {"query": str, "results": [{"title", "link", "snippet"}, ...]}
    """
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            raw = list(ddgs.text(query, max_results=num_results))
        results = [
            {"title": r.get("title", ""), "link": r.get("href", ""), "snippet": r.get("body", "")}
            for r in raw
        ]
        return {"query": query, "results": results}
    except Exception as e:
        return {"error": "DuckDuckGo search failed: " + str(e), "query": query}


def serper_image_search(query: str, num_results: int = 4) -> dict:
    """
    以 DuckDuckGo 執行圖片搜尋（取代 Serper Images）。
    回傳 {"query": str, "images": [{"title", "image_url", "source"}, ...]}
    """
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            raw = list(ddgs.images(query, max_results=num_results))
        images = [
            {"title": r.get("title", ""), "image_url": r.get("image", ""), "source": r.get("url", "")}
            for r in raw
        ]
        return {"query": query, "images": images}
    except Exception as e:
        return {"error": "DuckDuckGo image search failed: " + str(e), "query": query}


# ─────────────────────────────────────────────────────────────────────────────
# DuckDuckGo — 圖庫搜尋 (取代 Unsplash)
# ─────────────────────────────────────────────────────────────────────────────

def unsplash_search(query: str, num_results: int = 4, orientation: str = "landscape") -> dict:
    """
    以 DuckDuckGo 圖片搜尋取代 Unsplash。
    回傳 {"query": str, "photos": [{"url_regular", "url_thumb", "description", "photographer"}, ...]}
    """
    try:
        from ddgs import DDGS
        search_query = query + " " + orientation
        with DDGS() as ddgs:
            raw = list(ddgs.images(search_query, max_results=num_results))
        photos = [
            {
                "id": str(i),
                "url_regular": r.get("image", ""),
                "url_thumb":   r.get("thumbnail", r.get("image", "")),
                "description": r.get("title", ""),
                "photographer": r.get("source", ""),
            }
            for i, r in enumerate(raw)
        ]
        return {"query": query, "photos": photos}
    except Exception as e:
        return {"error": "DuckDuckGo photo search failed: " + str(e), "query": query}


# ─────────────────────────────────────────────────────────────────────────────
# edge-tts — 文字轉語音 (取代 ElevenLabs TTS)
# ─────────────────────────────────────────────────────────────────────────────

def elevenlabs_tts(
    text: str,
    voice_id: str = "zh-TW-HsiaoChenNeural",  # 繁中女聲，可改為 zh-CN-XiaoxiaoNeural
    model_id: str = "edge-tts",
    output_path: Optional[str] = None,
) -> dict:
    """
    以 edge-tts（微軟免費 TTS）生成語音，取代 ElevenLabs。
    voice_id 即 edge-tts 的 voice 名稱。
    回傳 {"audio_base64": str, "file_path": str, "voice": str}
    """
    try:
        import edge_tts

        if output_path is None:
            output_path = "/tmp/edge_tts_output.mp3"

        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

        async def _synthesize():
            communicate = edge_tts.Communicate(text, voice_id)
            await communicate.save(output_path)

        asyncio.run(_synthesize())

        with open(output_path, "rb") as f:
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "audio_base64": audio_b64,
            "file_path":    output_path,
            "voice":        voice_id,
            "text_length":  len(text),
        }
    except Exception as e:
        return {"error": "edge-tts failed: " + str(e)}


def elevenlabs_sound_effect(
    prompt: str,
    duration_seconds: float = 5.0,
    output_path: Optional[str] = None,
) -> dict:
    """
    以 edge-tts 朗讀音效描述取代 ElevenLabs Sound Effects。
    （真實音效生成需付費 API；此版本生成描述語音作為佔位）
    """
    description_text = "Sound effect: " + prompt
    return elevenlabs_tts(
        description_text,
        voice_id="zh-TW-HsiaoChenNeural",
        output_path=output_path or "/tmp/sfx_preview.mp3",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Pollinations.ai — 文字生圖 (取代 Replicate SDXL)
# ─────────────────────────────────────────────────────────────────────────────

def replicate_txt2img(
    prompt: str,
    negative_prompt: str = "blurry, deformed, ugly, bad anatomy, watermark",
    width: int = 1024,
    height: int = 576,
    num_inference_steps: int = 30,
    guidance_scale: float = 7.5,
    model_version: Optional[str] = None,
) -> dict:
    """
    以 Pollinations.ai 免費 API 生圖，取代 Replicate。
    無需 Key，直接 HTTP GET，回傳圖片 URL。
    回傳 {"image_url": str, "prompt": str, "model": str}
    """
    try:
        import urllib.parse
        encoded_prompt = urllib.parse.quote(prompt)
        url = (
            "https://image.pollinations.ai/prompt/" + encoded_prompt
            + "?width=" + str(width)
            + "&height=" + str(height)
            + "&nologo=true"
            + "&enhance=true"
        )
        # 驗證 URL 可訪問（HEAD request）
        resp = requests.head(url, timeout=15, allow_redirects=True)
        if resp.status_code not in (200, 302, 301):
            return {"error": "Pollinations returned status " + str(resp.status_code), "prompt": prompt}

        return {
            "image_url": url,
            "prompt":    prompt,
            "model":     "pollinations/flux",
        }
    except Exception as e:
        return {"error": "Pollinations.ai failed: " + str(e), "prompt": prompt}
