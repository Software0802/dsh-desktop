from __future__ import annotations

import os
from pathlib import Path


def home_dir(explicit: str | None = None) -> Path:
    return Path(explicit or os.environ.get("PI_AGENT_HOME", "~/.pi-agent")).expanduser()


def skill_dir(home: Path, skill: str) -> Path:
    return home / "skills" / skill


def ensure_layout(home: Path, skill: str) -> None:
    (skill_dir(home, skill) / "references").mkdir(parents=True, exist_ok=True)
    (home / "backups").mkdir(parents=True, exist_ok=True)
