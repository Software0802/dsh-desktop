# Pi Desktop

Electron desktop client. The window chrome mirrors DeepSeek Harness. Pi is the agent kernel; this package does not copy the DSH runtime.

## Run the desktop app

```powershell
npm install
npm run build
npm start
```

`npm start` opens the Electron window. Set `PI_DESKTOP_PI_BIN` to an explicit Pi executable and `PI_DESKTOP_CWD` to the workspace used by the agent. Pi starts on the first prompt.

The plugin market is a starter catalog plus a link to `aiskill.market`. DSH UI plugins stay marked `adapter` or `isolated` until a compatibility host exists.
