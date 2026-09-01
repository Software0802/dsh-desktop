# Pi Desktop

An independent Electron desktop client with a DSH-inspired three-panel UI and Pi as its agent kernel.

## Run

```powershell
npm install
npm run build
npm start
```

The client starts Pi lazily when the first prompt is sent. It resolves `pi` from `PATH` by default. Set `PI_DESKTOP_PI_BIN` to an explicit Pi executable and `PI_DESKTOP_CWD` to the workspace used by the agent.

The plugin market surface currently provides the adapter seam and starter catalog for `aiskill.market`. Pi-native Skills are marked separately from DSH UI plugins, which will use an adapter or isolated host in the next integration slice.
