from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from .config import ensure_layout, skill_dir
from .provider import Provider
from .skills import base_path, improver_path, read_skill, replace_skill, skill_version
from .store import append_jsonl, find_record, new_id, now, read_jsonl


class AgentEngine:
    def __init__(self, home: Path, skill: str, provider: Provider) -> None:
        self.home = home
        self.skill = skill
        self.provider = provider
        ensure_layout(home, skill)

    def run(self, task: str) -> dict[str, Any]:
        current_skill = read_skill(self.home, self.skill)
        run_id = new_id("run")
        system = "You are a reliable task agent. Follow the skill below.\n\n" + current_skill
        output = self.provider.complete(system, task)
        record = {
            "id": run_id,
            "skill": self.skill,
            "skill_version": skill_version(current_skill),
            "task": task,
            "output": output,
            "created_at": now(),
        }
        append_jsonl(self.home / "runs.jsonl", record)
        return record

    def add_feedback(self, run_id: str, rating: str, comment: str, author: str) -> dict[str, Any]:
        if rating not in {"good", "bad", "mixed"}:
            raise ValueError("rating must be good, bad, or mixed")
        run = find_record(self.home / "runs.jsonl", run_id)
        if not run or "task" not in run:
            raise ValueError(f"run not found: {run_id}")
        record = {
            "id": new_id("feedback"),
            "run_id": run_id,
            "rating": rating,
            "comment": comment,
            "author": author,
            "created_at": now(),
        }
        append_jsonl(self.home / "feedback.jsonl", record)
        return record

    def improve(self) -> dict[str, Any]:
        current_skill = read_skill(self.home, self.skill)
        observer_skill = improver_path(self.home, self.skill).read_text(encoding="utf-8")
        feedback = read_jsonl(self.home / "feedback.jsonl")
        if not feedback:
            raise ValueError("no feedback is available; run the agent and add feedback first")
        runs = {record["id"]: record for record in read_jsonl(self.home / "runs.jsonl")}
        evidence = []
        for item in feedback:
            run = runs.get(item.get("run_id"), {})
            evidence.append({"feedback": item, "run": {"task": run.get("task"), "output": run.get("output")}})
        system = (
            "You improve agent operating skills. Be conservative, precise, and evidence-based.\n\n"
            "Follow this Improver Skill:\n"
            f"{observer_skill}"
        )
        user = (
            "Return JSON with exactly these keys: summary, reasoning, updated_skill. "
            "updated_skill must be a complete Markdown skill. Do not include markdown fences around the JSON.\n\n"
            f"<CURRENT_SKILL>\n{current_skill}\n</END_CURRENT_SKILL>\n\n"
            f"<FEEDBACK>\n{json.dumps(evidence, ensure_ascii=False, indent=2)}\n</FEEDBACK>\n\n"
            "<UPDATED_SKILL>\nThe complete proposed skill must be in the updated_skill JSON field.\n</UPDATED_SKILL>"
        )
        raw = self.provider.complete(system, user)
        proposal = self._parse_proposal(raw, current_skill)
        proposal.update(
            {
                "id": new_id("proposal"),
                "skill": self.skill,
                "based_on_version": skill_version(current_skill),
                "status": "proposed",
                "created_at": now(),
            }
        )
        append_jsonl(self.home / "proposals.jsonl", proposal)
        return proposal

    def approve(self, proposal_id: str) -> dict[str, Any]:
        proposal = find_record(self.home / "proposals.jsonl", proposal_id)
        if not proposal or proposal.get("status") != "proposed":
            raise ValueError(f"proposed proposal not found: {proposal_id}")
        path = base_path(self.home, self.skill)
        current = read_skill(self.home, self.skill)
        if skill_version(current) != proposal.get("based_on_version"):
            raise ValueError("skill changed since proposal was created; generate a new proposal")
        backup = self.home / "backups" / f"{self.skill}-{proposal_id}.md"
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup)
        replace_skill(path, proposal["updated_skill"])
        result = {"id": proposal_id, "status": "approved", "backup": str(backup), "updated_at": now()}
        append_jsonl(self.home / "proposals.jsonl", result)
        return result

    def status(self) -> dict[str, Any]:
        current = read_skill(self.home, self.skill)
        proposals = read_jsonl(self.home / "proposals.jsonl")
        latest_status: dict[str, str] = {}
        for item in proposals:
            if item.get("id"):
                latest_status[item["id"]] = item.get("status", "proposed")
        return {
            "home": str(self.home),
            "skill": self.skill,
            "skill_path": str(skill_dir(self.home, self.skill)),
            "skill_version": skill_version(current),
            "runs": len(read_jsonl(self.home / "runs.jsonl")),
            "feedback": len(read_jsonl(self.home / "feedback.jsonl")),
            "proposals": len(proposals),
            "pending_proposals": sum(status == "proposed" for status in latest_status.values()),
        }

    @staticmethod
    def _parse_proposal(raw: str, current_skill: str) -> dict[str, str]:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        try:
            value = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"improver returned invalid JSON: {exc}") from exc
        required = {"summary", "reasoning", "updated_skill"}
        if not required.issubset(value) or not isinstance(value["updated_skill"], str):
            raise ValueError("improver response must contain summary, reasoning, and updated_skill")
        if not value["updated_skill"].strip():
            raise ValueError("improver returned an empty skill")
        if len(value["updated_skill"]) > max(len(current_skill) * 4, 10000):
            raise ValueError("improver proposal is unexpectedly large")
        return {key: str(value[key]) for key in required}
