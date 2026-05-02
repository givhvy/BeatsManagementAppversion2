# Beats Management Studio Source Layout

This folder is the maintainable source home for the Electron app.

- `main/` contains the Electron main process and IPC/backend-style handlers.
- `renderer/` contains the browser UI loaded by the Electron window.
- `renderer/styles/` contains renderer CSS and design tokens.
- `renderer/legacy/` contains the existing renderer script before deeper feature-by-feature module extraction.

The root `main.js` is intentionally a tiny compatibility entrypoint because `package.json` points Electron at it.
