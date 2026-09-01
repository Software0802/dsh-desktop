from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path


BASE_TEMPLATE = """# Base Agent Skill

## Mission
Complete the user's task accurately and explain the result briefly.

## Principles
- Inspect relevant context before acting.
- Prefer the smallest correct change.
- State assumptions and uncertainty instead of inventing facts.
- Verify important outputs before reporting completion.

## Feedback-derived guidance
No approved feedback-derived guidance yet.
"""

IMPROVER_TEMPLATE = """# Improver Skill

You are an observer agent. Review accumulated task outputs and human feedback.
Propose only small, generalizable changes to the Base Agent Skill.

Do not treat a single personal preference as a universal rule. Preserve existing
guidance unless feedback gives a clear reason to change it. Return a complete
replacement skill, not a patch. Never approve or apply your own proposal.
"""


def base_path(home: Path, skill: str) -> Path:
    return home / "skills" / skill / "SKILL.md"


def improver_path(home: Path, skill: str) -> Path:
    return home / "skills" / skill / "IMPROVER.md"


def read_skill(home: Path, skill: str) -> str:
    path = base_path(home, skill)
    if not path.exists():
        raise FileNotFoundError(f"Skill is not initialized: {path}")
    return path.read_text(encoding="utf-8")


def skill_version(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:12]


def initialize(home: Path, skill: str) -> tuple[Path, Path]:
    directory = home / "skills" / skill
    directory.mkdir(parents=True, exist_ok=True)
    base = base_path(home, skill)
    improver = improver_path(home, skill)
    if not base.exists():
        base.write_text(BASE_TEMPLATE, encoding="utf-8")
    if not improver.exists():
        improver.write_text(IMPROVER_TEMPLATE, encoding="utf-8")
    return base, improver


def replace_skill(path: Path, content: str) -> None:
    fd, temporary_name = tempfile.mkstemp(prefix="skill-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(content.rstrip() + "\n")
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary_name, path)
    except BaseException:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise
