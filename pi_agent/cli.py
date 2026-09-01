from __future__ import annotations

import argparse
import json
import sys

from .config import ensure_layout, home_dir
from .engine import AgentEngine
from .provider import ClaudeProvider, OfflineProvider
from .skills import initialize


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(prog="pi-agent", description="Local human-approved self-improving agent loop")
    root.add_argument("--home", help="state directory; defaults to PI_AGENT_HOME or ~/.pi-agent")
    root.add_argument("--skill", default="default", help="skill name")
    root.add_argument("--offline", action="store_true", help="use deterministic local provider")
    commands = root.add_subparsers(dest="command", required=True)

    commands.add_parser("init", help="create the base and improver skills")
    run = commands.add_parser("run", help="run a task")
    run.add_argument("task")
    feedback = commands.add_parser("feedback", help="record human feedback for a run")
    feedback.add_argument("--run-id", required=True)
    feedback.add_argument("--rating", required=True, choices=["good", "bad", "mixed"])
    feedback.add_argument("--comment", required=True)
    feedback.add_argument("--author", default="local-user")
    commands.add_parser("improve", help="generate a reviewable skill proposal")
    approve = commands.add_parser("approve", help="approve and apply a proposal")
    approve.add_argument("proposal_id")
    commands.add_parser("status", help="show local loop status")
    return root


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    home = home_dir(args.home)
    if args.command == "init":
        ensure_layout(home, args.skill)
        base, improver = initialize(home, args.skill)
        print(json.dumps({"base_skill": str(base), "improver_skill": str(improver)}, indent=2))
        return 0

    needs_provider = args.command in {"run", "improve"}
    provider = (OfflineProvider() if args.offline else ClaudeProvider()) if needs_provider else OfflineProvider()
    engine = AgentEngine(home, args.skill, provider)
    try:
        if args.command == "run":
            value = engine.run(args.task)
        elif args.command == "feedback":
            value = engine.add_feedback(args.run_id, args.rating, args.comment, args.author)
        elif args.command == "improve":
            value = engine.improve()
        elif args.command == "approve":
            value = engine.approve(args.proposal_id)
        elif args.command == "status":
            value = engine.status()
        else:
            raise ValueError(f"unknown command: {args.command}")
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
