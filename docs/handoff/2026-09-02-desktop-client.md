# Session Handoff: Desktop client direction

Date: 2026-09-02

Repository: `Software0802/dsh-desktop`

## Objective

Ship an Electron **desktop client**. The window looks like DeepSeek Harness. The agent kernel stays outside the client (Pi over RPC). Do not replicate the DSH/Cordis kernel, and do not turn this repo into an RPC-completeness project.

## Scope

In scope:

- Native window: one app instance, product name, Harness chrome, `npm start` as the desktop launch path.
- Pi as a kernel socket only: start `pi --mode rpc` when the user sends a prompt.

Out of scope:

- Copying or modifying `deepseek-harness/`.
- Making the RPC stream a lossless kernel replica (tool events, abort protocol, extension UI host) unless a desktop surface actually needs that next.
- Treating the Vite renderer preview as the product.

## Completed

- `pi-desktop/` is an Electron app with DeepSeek Harness chrome restored.
- Window bootstrap now names the app `deepseek`, keeps a single instance, and shows the window on `ready-to-show`.

## Pending

Priority 1 (desktop client):

- Keep `npm start` as the way to run the product.
- Later: packaging for Windows/macOS/Linux.

Priority 2 (only when a desktop surface needs it):

- Durable sessions, richer Pi events, abort, market installer.

## Next Move

Build the desktop client, not the kernel. Next desktop work is packaging and native window polish when asked. Do not prioritize lossless RPC projection.
