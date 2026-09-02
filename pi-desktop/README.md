# Pi Desktop

An independent Electron desktop client. The window chrome mirrors DeepSeek Harness. The agent kernel is Pi RPC, not the DSH runtime.

## Run

```powershell
npm install
npm run build
npm start
```

The client starts Pi lazily when the first prompt is sent. It resolves `pi` from `PATH` by default. Set `PI_DESKTOP_PI_BIN` to an explicit Pi executable and `PI_DESKTOP_CWD` to the workspace used by the agent.

The plugin market surface currently provides the adapter seam and starter catalog for `aiskill.market`. Pi-native Skills are marked separately from DSH UI plugins, which will use an adapter or isolated host in the next integration slice.
