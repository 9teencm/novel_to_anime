# backend/crew/memory/character_db.py
"""
角色資料庫 — 儲存從小說中提取的所有角色資訊。

提供 CRUD 操作，並支援依姓名模糊查詢。
後續 Agent（如 Director、Consistency）可直接查詢以確保角色一致性。
"""

from typing import Dict, List, Optional


class CharacterRecord:
    """單一角色的記憶體記錄。"""

    def __init__(
        self,
        name: str,
        role: str,
        appearance: str,
        personality: str = "",
        relationship: str = "",
    ):
        self.name = name
        self.role = role
        self.appearance = appearance
        self.personality = personality
        self.relationship = relationship
        # 為 Consistency Agent 保存的 Prompt 標籤（由 consistency_skills 填入）
        self.prompt_tags: str = ""
        # 一致性鎖定標誌
        self.face_locked: bool = True
        self.outfit_locked: bool = True

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "role": self.role,
            "appearance": self.appearance,
            "personality": self.personality,
            "relationship": self.relationship,
            "prompt_tags": self.prompt_tags,
            "locks": {
                "face": self.face_locked,
                "outfit": self.outfit_locked,
            },
        }

    def __repr__(self) -> str:
        return f"<CharacterRecord name={self.name!r} role={self.role!r}>"


class CharacterDB:
    """角色資料庫，以角色姓名為 key 儲存。"""

    def __init__(self):
        self._store: Dict[str, CharacterRecord] = {}

    # ── 寫入 ──────────────────────────────────────────────────────
    def upsert(self, record: CharacterRecord) -> None:
        """新增或更新角色記錄（以姓名為唯一索引）。"""
        self._store[record.name] = record

    def upsert_from_dict(self, data: dict) -> None:
        """從字典直接 upsert，方便從 LLM 輸出直接寫入。"""
        record = CharacterRecord(
            name=data.get("name", "Unknown"),
            role=data.get("role", ""),
            appearance=data.get("appearance", ""),
            personality=data.get("personality", ""),
            relationship=data.get("relationship", ""),
        )
        if "prompt_tags" in data:
            record.prompt_tags = data["prompt_tags"]
        self.upsert(record)

    # ── 讀取 ──────────────────────────────────────────────────────
    def get(self, name: str) -> Optional[CharacterRecord]:
        """精確查詢。"""
        return self._store.get(name)

    def search(self, keyword: str) -> List[CharacterRecord]:
        """模糊查詢（姓名包含 keyword）。"""
        kw = keyword.lower()
        return [r for r in self._store.values() if kw in r.name.lower()]

    def all(self) -> List[CharacterRecord]:
        return list(self._store.values())

    def count(self) -> int:
        return len(self._store)

    # ── 輸出 ──────────────────────────────────────────────────────
    def to_prompt_context(self) -> str:
        """
        產出給 Agent 使用的角色一致性上下文字串，
        格式化為易讀的 Markdown，讓 LLM 直接參考。
        """
        if not self._store:
            return "（尚無角色資料）"
        lines = ["## 已鎖定角色外貌（Character Consistency Reference）\n"]
        for r in self._store.values():
            tags = r.prompt_tags if r.prompt_tags else r.appearance
            lines.append(f"- **{r.name}** ({r.role}): {tags}")
        return "\n".join(lines)
