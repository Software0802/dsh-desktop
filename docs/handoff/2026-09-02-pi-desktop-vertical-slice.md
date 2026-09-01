# Session Handoff: Pi Desktop Vertical Slice

Date: 2026-09-02

Repository: `Software0802/dsh-desktop`

Project root: `dsh-desktop/`

## Objective

Build an independent desktop client with a DSH-inspired UI, Pi as the agent kernel, a plugin surface, and an `aiskill.market` entry point. Preserve the existing Python self-improving loop and keep all user-visible agent changes reviewable.

## Completed

- Researched the DSH Desktop Electron shell, three-panel layout, sidebar market action, market overlay, and upstream conversation UI.
- Selected `Software0802/dsh-desktop` as the target repository and kept its existing DSH source and `deepseek-harness` submodule intact.
- Added the independent `pi-desktop/` Electron + React + TypeScript application.
- Added the DSH-inspired desktop layout: sidebar, session list, conversation surface, composer, details panel, settings view, and responsive narrow layout.
- Added Pi JSONL RPC integration in `pi-desktop/src/main.ts`:
  - Starts `pi --mode rpc` lazily on the first prompt.
  - Sends `prompt` commands with request IDs.
  - Reads strict LF-delimited JSON records.
  - Forwards Pi events to the renderer through preload IPC.
  - Reports offline, starting, ready, and error states.
- Added the renderer/preload boundary in `pi-desktop/src/preload.ts` and `pi-desktop/src/renderer/App.tsx`.
- Added a starter plugin catalog in `pi-desktop/src/shared/types.ts`:
  - Pi-native Skills.
  - DSH UI plugins marked as `adapter` or `isolated`.
  - External link to `https://aiskill.market/`.
- Added local market search, Installed filtering, install-state interaction, and DSH compatibility labels.
- Added `pi-desktop/README.md` with launch and runtime environment instructions.
- Added project-level rules in `AGENTS.md` and this handoff directory.
- Renamed the outer project directory from `untitled-project/` to `pi-desk-dsh/`; `pi-agent` and `pi-desktop` remain the Python CLI and desktop subproject names.
- Fixed Electron production asset loading by making Vite emit relative asset URLs in `pi-desktop/vite.config.ts`; `file://` startup now loads the renderer instead of showing only the window background.
- Made failed Pi prompt writes and unexpected Pi process exits resolve promptly in `pi-desktop/src/main.ts`, preventing a permanently busy composer.
- Limited root pytest discovery to `tests/` in `pyproject.toml` so the read-only DSH reference tests are not collected by the project test command.
- The existing Python MVP remains available and unchanged.

## Pending

Priority 1:

- Implement real Pi session state loading and durable session switching instead of the current single in-memory conversation.
- Handle completed assistant messages, tool execution events, and Pi extension UI requests in the renderer.
- Add an explicit abort/cancel action for an active Pi turn.

Priority 2:

- Verify and implement the real `aiskill.market` catalog and install protocol.
- Add a Pi plugin installer/registry for Skills and Extensions with local installation state.
- Define the DSH UI plugin adapter protocol, or implement an isolated DSH host for plugins that cannot run natively in Pi.

Priority 3:

- Port more DSH conversation behavior and details-panel functionality.
- Add packaging/distribution configuration for Windows and macOS.
- Add focused tests once the corresponding behavior is implemented and existing checks cannot cover it.

## Blockers And Risks

- DSH UI plugins depend on Cordis/DSH runtime contracts and cannot be loaded directly as Pi Extensions.
- The public `aiskill.market` catalog/install API has not been verified; the current market is a local starter catalog plus an external link.
- A clean Electron dependency install previously left the platform binary absent on this machine. The cached `electron-v37.10.3-win32-x64.zip` was extracted locally to verify `v37.10.3`; reproduce this issue before changing dependency strategy.
- `npm install` reported two high-severity audit findings. They were not auto-fixed because that could introduce unrelated dependency changes.

## Verification

Passed in `pi-desktop/`:

```text
npm install
npm run typecheck
npm run build
npm exec electron -- --version   # v37.10.3
```

Passed after the startup fix:

```text
npm run typecheck
npm run build
npm start                  # process remained running without startup errors
```

Passed in the project root:

```text
python -m pytest           # 2 passed
```

The outer directory rename was verified with the old path absent and the new path present.

The target repository was clean before this integration; the `deepseek-harness` submodule remains unchanged.

Still not run for this slice:

- Live Pi prompt with a configured provider/API key.
- Full Electron UI interaction test.

## Intentionally Untouched

- Existing DSH runtime/source packages, except the explicitly changed root README, root rules, and ignore file.
- The `deepseek-harness` submodule and its pinned commit.
- Pi core or the external `@earendil-works/pi-coding-agent` package.
- Existing Python MVP implementation under `pi_agent/` and `tests/`.
- Any API key, environment secret, or local runtime state.

## Next Move

Implement durable Pi session state and event projection first. Then replace the starter market catalog with a verified `aiskill.market` adapter, keeping DSH UI plugin execution explicitly behind an adapter or isolated-host boundary.
