# DSH Desktop repository rules

This repository owns the desktop product around an unmodified DeepSeek Harness checkout.

## Prerequisites and setup

- Use Node.js `^22.19.0` or `>=24.0.0` and the root Yarn `4.18.0` release through Corepack.
- Initialize the pinned upstream checkout with `git submodule update --init --recursive`.
- Install root dependencies with `corepack yarn install --immutable`.

## Build, run, and verify

- Start the desktop development workflow with `corepack yarn dev`.
- Build the desktop package with `corepack yarn build`.
- Run unit tests with `corepack yarn test`.
- Run type checking with `corepack yarn typecheck`.
- Run the complete headless gate with `corepack yarn check`.
- Run upstream operations through the root scripts, such as `corepack yarn upstream:build`.

- `deepseek-harness/` is a pinned upstream Git submodule. Never edit files inside it from a desktop feature branch.
- `dsh-plugin-desktop/` owns the Cordis Host and Client faces, Electron bootstrap, packaging, and release tests.
- `dsh-community-fabric/` owns the community interoperability RFC. Until schemas and a reviewed reference adapter exist, it remains a private documentation scaffold and must not declare loadable DSH or package entry points.
- `dsh-community-market/` owns the community-market shell. Until its runtime is implemented, it remains a private documentation scaffold and must not declare loadable DSH or package entry points.
- The outer repository and all owned packages use the root Yarn release with `nodeLinker: node-modules`.
- The upstream submodule keeps its own pnpm workspace. Run upstream commands through the root `upstream:*` scripts, whose Yarn portable-shell commands enter the submodule before invoking Corepack.
- Compatibility mode must run the upstream default client without overrides. Advanced presentation belongs to desktop-owned client plugins and may replace documented slots or services through profile composition.
- Keep graphical application launch explicit. Builds, typechecks, unit tests, and Loader smokes must remain headless-safe.
- Commit before major changes of direction and keep the submodule pin update separate from desktop behavior changes.
- Keep the repository topology and package-manager split consistent with the [owning Agent Note](.agents/notes/implemented/process/2026-08-15-pinned-upstream-and-isolated-yarn-workspace.md).

## Pi Desk DSH Integration

This repository also contains the independent Pi-powered client under `pi-desktop/` and the existing Python self-improving loop under `pi_agent/`. They are project-owned additions; the original DSH Desktop remains the reference product and its upstream Harness checkout remains unmodified.

- Pi is the agent kernel for `pi-desktop`; integrate it through documented RPC or SDK interfaces and never modify Pi core.
- `pi-desktop/` is an isolated npm workspace. Do not merge its npm dependency tree into the DSH Yarn workspace or import Electron/Node APIs into Renderer code.
- `pi_agent/` keeps its human-approval, version-conflict, backup, and JSONL audit guarantees. Do not add a second approval path or execute arbitrary Skill code.
- Pi-native Extensions and `SKILL.md` Skills may use the native path. DSH UI plugins are not Pi plugins and must remain explicitly marked as `adapter` or `isolated` until a tested compatibility runtime exists.
- `aiskill.market` is only a verified integration after its catalog and install protocol are confirmed. A starter catalog or external link must not be described as a live installer.
- Do not edit `deepseek-harness/` for Pi Desk DSH work. Keep the DSH submodule pin unchanged unless the task explicitly targets an upstream update.
- Pi Desk DSH integration changes are developed on branch `pi-desk-dsh`; do not push them directly to `master` and do not force-push.
- The current state and next move live in `docs/handoff/`. Update the newest dated handoff when implementation status, blockers, verification, or scope changes.
- The integration boundary includes `pi-desktop/`, `pi_agent/`, `README.pi-desk-dsh.md`, `docs/handoff/`, and the related root ignore/README links. Do not stage generated files, local state, secrets, or unrelated DSH changes.
