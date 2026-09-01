# Pi Desk DSH

Pi-powered desktop client and local implementation of a human-approved self-improving agent loop.

The Python CLI remains named `pi-agent`; the desktop client lives in `pi-desktop/`.

## Python Loop

The loop uses two file-based skills:

1. `SKILL.md` instructs the task agent.
2. `IMPROVER.md` defines the conservative observer that turns feedback into a proposed skill update.

The improver never changes the active skill directly. A proposal must be applied with `approve`, which creates a backup first. Runs, feedback, and proposals are stored as JSONL for auditability.

## Desktop Client

`pi-desktop/` is an independent Electron + React + TypeScript client with a DSH-inspired three-panel UI. It starts Pi lazily with `pi --mode rpc`, keeps the renderer behind a preload IPC bridge, and remains usable in offline preview mode before Pi is available.

```powershell
cd pi-desktop
npm install
npm run build
npm start
```

Set `PI_DESKTOP_PI_BIN` to an explicit Pi executable and `PI_DESKTOP_CWD` to the workspace used by the agent.

## Handoff

The current implementation state, pending work, blockers, verification, and next move are maintained in [docs/handoff/](docs/handoff/README.md).
