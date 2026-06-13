# Beats Management Studio

Electron app quản lý beats + tạo video + tự động upload YouTube. Không dùng bundler/framework — main process là CommonJS, renderer là script-tag globals.

**Đọc `ARCHITECTURE.md` trước khi sửa code.** Tóm tắt:

- Main process: `src/main/main.js` chỉ là composer. IPC handlers nằm trong `src/main/ipc/<feature>.js` (mỗi tab một file, đăng ký qua `ipc/index.js`). Process con/server nằm trong `src/main/services/`. Đường dẫn cứng khai báo trong `src/main/paths.js`. State chung trong `src/main/app-state.js`.
- Renderer: `src/renderer/` — file đánh số `NN-` thể hiện thứ tự load trong `index.html`. Mỗi tab gồm 3 file: `app/NN-x.js`, `partials/NN-x.html`, `styles/app/NN-x.css`.
- KHÔNG thêm `ipcMain.handle` vào `main.js` — đặt vào đúng file domain trong `ipc/`.
- File JSON dữ liệu lưu ở `userData`, một số mirror về `data/` cho git.

## Lệnh
- `npm start` — chạy app (hot reload bật sẵn).
- `npm run build` — electron-builder portable Windows.
- `npm run start:automation` — chạy riêng automation server (port 9000).

## Lưu ý
- App phụ thuộc đường dẫn ngoài repo (ổ D:, `F:\PlaygroundTest\foronlytestingforbeatsmanagement`...) — xem `paths.js`.
- `automation/`, `autovid/`, `youtube-social-scheduler/` là sub-project có package.json riêng.
- `docs/archive/` chứa tài liệu/file cũ đã ngưng dùng — không tham chiếu từ code.
