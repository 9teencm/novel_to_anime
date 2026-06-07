# backend/crew/memory/__init__.py
"""
共享記憶體模組 — 供所有 Agent 跨任務讀寫角色與世界觀狀態。

使用 Singleton 模式，確保整條 Pipeline 共用同一份記憶體實例。
每次啟動新的 run_animation_pipeline() 前應呼叫 reset_shared_memory()
以清除上一次執行的殘留狀態。
"""

from .character_db import CharacterDB
from .world_db import WorldDB

_memory_instance: "SharedMemory | None" = None


class SharedMemory:
    """匯聚 CharacterDB 與 WorldDB 的頂層容器。"""

    def __init__(self):
        self.characters = CharacterDB()
        self.world = WorldDB()

    def reset(self):
        self.characters = CharacterDB()
        self.world = WorldDB()

    def summary(self) -> str:
        return (
            f"[Memory] 角色: {self.characters.count()} 筆 | "
            f"世界觀規則: {self.world.count()} 條"
        )


def get_shared_memory() -> SharedMemory:
    """取得（或初始化）全域 SharedMemory singleton。"""
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = SharedMemory()
    return _memory_instance


def reset_shared_memory() -> None:
    """重置記憶體，在新的 Pipeline 執行前呼叫。"""
    global _memory_instance
    if _memory_instance is not None:
        _memory_instance.reset()
    else:
        _memory_instance = SharedMemory()


__all__ = ["SharedMemory", "get_shared_memory", "reset_shared_memory"]
