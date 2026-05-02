# Main Process

`main.js` owns the Electron window, IPC handlers, filesystem operations, automation server control, and external integrations.

It defines `APP_ROOT` because the file now lives in `src/main` while data folders, automation scripts, modules, icons, cache, and output still live at the project root.
