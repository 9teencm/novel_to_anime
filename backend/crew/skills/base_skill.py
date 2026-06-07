# backend/crew/skills/base_skill.py
"""
AgentSkill 基底類別 — 所有 Agent 工具的共用介面。

繼承 CrewAI BaseTool，加入：
  - agent_name   : 所屬 Agent 標識，用於日誌追蹤
  - version      : 工具版本，方便未來升級時切換
  - _log()       : 統一的帶前綴日誌方法
  - _get_memory(): 快速取得共享記憶體 singleton
"""

from abc import abstractmethod
from typing import Any, Optional, Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


class AgentSkill(BaseTool):
    """所有 Agent 專屬工具的基底類別。"""

    agent_name: str = Field(default="Unknown Agent", description="所屬 Agent 名稱")
    version: str = Field(default="1.0.0", description="工具版本")

    # ── 子類別必須實作 ──────────────────────────────────────────────
    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        ...

    @abstractmethod
    def _run(self, *args: Any, **kwargs: Any) -> Any:
        ...

    # ── 共用工具方法 ────────────────────────────────────────────────
    def _log(self, message: str) -> None:
        """輸出帶 Agent 前綴的日誌，Pipeline 會攔截此輸出。"""
        print(f"[{self.agent_name}] {message}")

    def _get_memory(self):
        """取得全域共享記憶體（CharacterDB + WorldDB singleton）。"""
        from backend.crew.memory import get_shared_memory
        return get_shared_memory()
