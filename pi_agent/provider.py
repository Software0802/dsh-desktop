from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Protocol


class Provider(Protocol):
    def complete(self, system: str, user: str) -> str:
        ...


class ClaudeProvider:
    def __init__(self, model: str | None = None) -> None:
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.model = model or os.environ.get("PI_AGENT_MODEL", "claude-sonnet-4-20250514")
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set; use --offline for local smoke tests")

    def complete(self, system: str, user: str) -> str:
        payload = json.dumps(
            {
                "model": self.model,
                "max_tokens": 4096,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.load(response)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Claude API returned HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Claude API request failed: {exc.reason}") from exc

        blocks = result.get("content", [])
        text = "".join(block.get("text", "") for block in blocks if block.get("type") == "text")
        if not text:
            raise RuntimeError("Claude API returned no text content")
        return text


class OfflineProvider:
    def complete(self, system: str, user: str) -> str:
        if "UPDATED_SKILL" in user:
            return json.dumps(
                {
                    "summary": "Offline smoke-test proposal",
                    "reasoning": "The offline provider cannot infer domain rules; it returns the current skill unchanged.",
                    "updated_skill": _extract_section(user, "CURRENT_SKILL", "END_CURRENT_SKILL"),
                }
            )
        return "Offline agent response. Configure ANTHROPIC_API_KEY to run Claude."


def _extract_section(text: str, start: str, end: str) -> str:
    marker_start = f"<{start}>"
    marker_end = f"</{end}>"
    if marker_start not in text or marker_end not in text:
        return ""
    return text.split(marker_start, 1)[1].split(marker_end, 1)[0].strip()
