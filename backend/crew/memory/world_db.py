# backend/crew/memory/world_db.py
"""
世界觀資料庫 — 儲存從小說中提取的設定規則。

規則以字串清單形式保存，支援去重與類別標記。
"""

from typing import List, Optional


class WorldRule:
    """單一世界觀規則。"""

    def __init__(self, rule: str, category: str = "general"):
        self.rule = rule.strip()
        # 類別範例：power_system / geography / social / magic / technology
        self.category = category

    def __repr__(self) -> str:
        return f"<WorldRule [{self.category}] {self.rule[:40]!r}>"


class WorldDB:
    """世界觀規則資料庫。"""

    def __init__(self):
        self._rules: List[WorldRule] = []

    # ── 寫入 ──────────────────────────────────────────────────────
    def add(self, rule: str, category: str = "general") -> None:
        """加入規則，自動去重（以規則文字為比對依據）。"""
        existing = {r.rule for r in self._rules}
        if rule.strip() not in existing:
            self._rules.append(WorldRule(rule, category))

    def add_bulk(self, rules: List[str], category: str = "general") -> None:
        for r in rules:
            if r:
                self.add(r, category)

    # ── 讀取 ──────────────────────────────────────────────────────
    def all(self) -> List[WorldRule]:
        return list(self._rules)

    def by_category(self, category: str) -> List[WorldRule]:
        return [r for r in self._rules if r.category == category]

    def count(self) -> int:
        return len(self._rules)

    # ── 輸出 ──────────────────────────────────────────────────────
    def to_prompt_context(self) -> str:
        """產出給 Agent 使用的世界觀設定上下文字串。"""
        if not self._rules:
            return "（尚無世界觀規則）"
        lines = ["## 世界觀設定（World Rules Reference）\n"]
        for i, r in enumerate(self._rules, 1):
            lines.append(f"{i}. [{r.category}] {r.rule}")
        return "\n".join(lines)

    def to_list(self) -> List[str]:
        return [r.rule for r in self._rules]
