import json
import tempfile
import unittest
from pathlib import Path

from pi_agent.config import ensure_layout
from pi_agent.engine import AgentEngine
from pi_agent.provider import OfflineProvider
from pi_agent.skills import initialize, read_skill


class LoopTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        ensure_layout(self.home, "default")
        initialize(self.home, "default")
        self.engine = AgentEngine(self.home, "default", OfflineProvider())

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_feedback_improve_and_approve(self) -> None:
        run = self.engine.run("test task")
        self.engine.add_feedback(run["id"], "bad", "Needs more context", "tester")
        proposal = self.engine.improve()
        self.assertEqual(proposal["status"], "proposed")
        before = read_skill(self.home, "default")
        result = self.engine.approve(proposal["id"])
        self.assertEqual(result["status"], "approved")
        self.assertEqual(read_skill(self.home, "default"), before)
        self.assertTrue(Path(result["backup"]).exists())

    def test_approval_rejects_stale_proposal(self) -> None:
        run = self.engine.run("test task")
        self.engine.add_feedback(run["id"], "mixed", "Keep the answer focused", "tester")
        proposal = self.engine.improve()
        skill_path = self.home / "skills" / "default" / "SKILL.md"
        skill_path.write_text(skill_path.read_text(encoding="utf-8") + "\nNew rule.\n", encoding="utf-8")
        with self.assertRaises(ValueError):
            self.engine.approve(proposal["id"])


if __name__ == "__main__":
    unittest.main()
