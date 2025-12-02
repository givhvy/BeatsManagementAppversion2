# ✅ Installation Checklist

## Pre-Installation

- [ ] Node.js đã cài đặt (>= 16.x)
  ```bash
  node --version
  ```

- [ ] npm đã cài đặt (>= 8.x)
  ```bash
  npm --version
  ```

- [ ] Git đã cài đặt (optional, để clone repo)
  ```bash
  git --version
  ```

## Installation Steps

- [ ] **Step 1:** Clone/Download project vào máy
  ```bash
  cd autovid
  ```

- [ ] **Step 2:** Cài đặt dependencies
  ```bash
  npm install
  ```
  - Chờ ~2-5 phút để tải packages
  - Kiểm tra không có lỗi

- [ ] **Step 3:** Cấu hình Pinterest Token
  - [x] File `.env` đã tồn tại ✅
  - [x] Token đã được thêm vào `.env` ✅
  - Format: `PINTEREST_ACCESS_TOKEN=pina_...`

- [ ] **Step 4:** Verify thư mục `output/` tồn tại
  ```bash
  ls output/
  ```

## First Run

- [ ] **Step 5:** Khởi động app
  ```bash
  npm start
  ```

- [ ] **Step 6:** Kiểm tra app window mở thành công

- [ ] **Step 7:** Kiểm tra Pinterest token hợp lệ
  - Nhìn vào status bar
  - Nếu thấy: "Sẵn sàng - Nhấn 'Tải Boards' để bắt đầu" → ✅ OK
  - Nếu thấy cảnh báo → ❌ Check token

## Functional Testing

- [ ] **Test 1:** Load Boards
  - Nhấn "Tải Boards"
  - Danh sách boards hiện ra
  - Không có lỗi

- [ ] **Test 2:** Search Images
  - Nhập keyword: "aesthetic"
  - Nhấn "Tìm kiếm"
  - Ảnh hiển thị trong preview

- [ ] **Test 3:** Randomize
  - Nhấn "Randomize"
  - Ảnh thay đổi
  - Có thể randomize nhiều lần

- [ ] **Test 4:** Select Audio
  - Nhấn "Chọn File Audio"
  - Chọn file MP3 hoặc WAV
  - Tên file hiển thị
  - Audio player có thể play

- [ ] **Test 5:** Render Video
  - Nhập tên output: "test-video"
  - Nhấn "Render Video"
  - Progress bar chạy
  - Video render thành công
  - File `output/test-video.mp4` tồn tại

- [ ] **Test 6:** Open Output Folder
  - Nhấn "Mở Folder Output"
  - File explorer mở thư mục `output/`
  - Video file có thể play

## Troubleshooting Checklist

### If app không khởi động:

- [ ] Check Node.js version >= 16
- [ ] Delete `node_modules/` và chạy `npm install` lại
- [ ] Check antivirus không block app
- [ ] Check port không bị conflict

### If Pinterest token không hợp lệ:

- [ ] Token format đúng: `pina_...`
- [ ] Không có space/newline thừa
- [ ] Token chưa bị revoke trên Pinterest
- [ ] Regenerate token mới tại: https://developers.pinterest.com/tools/access_token/
- [ ] Restart app sau khi update `.env`

### If không tải được boards:

- [ ] Check internet connection
- [ ] Check Pinterest API rate limit (đợi 1 giờ)
- [ ] Check token có permission `boards:read`
- [ ] Xem console logs (DevTools)

### If không tìm thấy ảnh:

- [ ] Thử keyword khác (tiếng Anh)
- [ ] Check boards có chứa ảnh không
- [ ] Thử search broader keyword (vd: "art" thay vì "specific art style")

### If audio file không hợp lệ:

- [ ] File format: MP3, WAV, OGG, M4A
- [ ] File không bị corrupt
- [ ] Thử convert file sang MP3 với tool khác
- [ ] Bitrate >= 128kbps

### If render video lỗi:

- [ ] Check ảnh đã được chọn
- [ ] Check audio đã được chọn
- [ ] Check disk space đủ (>1GB free)
- [ ] Check `output/` folder có quyền write
- [ ] Xem error message trong alert
- [ ] Xem logs trong console

### If FFmpeg không hoạt động:

- [ ] Reinstall: `rm -rf node_modules && npm install`
- [ ] Check `node_modules/ffmpeg-static/` tồn tại
- [ ] Windows: Tạm tắt antivirus
- [ ] macOS: Check security settings cho phép app chạy

## Performance Checklist

- [ ] App khởi động trong < 5s
- [ ] Load boards trong < 5s
- [ ] Search images trong < 10s
- [ ] Download image trong < 3s
- [ ] Render video (3min audio) trong < 15s
- [ ] UI responsive, không lag

## Build Checklist (Optional)

Nếu muốn build executable:

- [ ] **Windows:**
  ```bash
  npm run build:win
  ```
  - File output: `dist/AutoVid Setup X.X.X.exe`

- [ ] **macOS:**
  ```bash
  npm run build:mac
  ```
  - File output: `dist/AutoVid-X.X.X.dmg`

- [ ] Test executable trên máy sạch (không có Node.js)

## Security Checklist

- [ ] `.env` không được commit lên Git
- [ ] `.gitignore` chứa `.env`
- [ ] Token không bị share public
- [ ] Không screenshot token
- [ ] Backup token ở nơi an toàn

## Final Verification

- [ ] ✅ App khởi động thành công
- [ ] ✅ Pinterest API hoạt động
- [ ] ✅ Có thể load boards
- [ ] ✅ Có thể search & random images
- [ ] ✅ Có thể chọn audio
- [ ] ✅ Có thể render video
- [ ] ✅ Video output chất lượng tốt
- [ ] ✅ Có thể mở output folder

## Success Criteria

✅ **PASSED** nếu:
- Tất cả functional tests pass
- Không có error trong console
- Video render thành công
- Video có thể play trên media player

❌ **FAILED** nếu:
- Có bất kỳ critical error nào
- Không load được boards
- Không render được video

## Next Steps After Success

1. **Create your first video:**
   - Search keyword yêu thích
   - Chọn beat
   - Render!

2. **Explore features:**
   - Thử nhiều keywords khác nhau
   - Test với nhiều loại beat
   - Experiment với output names

3. **Optimize workflow:**
   - Tìm keyword hiệu quả
   - Organize beats trong folder
   - Batch create nhiều videos

4. **Share your work:**
   - Upload lên YouTube
   - Share trên social media
   - Get feedback!

## Support

Nếu vẫn gặp vấn đề sau khi check hết checklist:

1. **Read docs:**
   - README.md
   - QUICKSTART.md
   - PINTEREST_SETUP.md

2. **Check logs:**
   - Open DevTools (Ctrl+Shift+I / Cmd+Option+I)
   - Check Console tab
   - Look for error messages

3. **Search issues:**
   - Check GitHub Issues
   - Google error message

4. **Ask for help:**
   - Open new GitHub Issue
   - Provide:
     - OS & version
     - Node.js version
     - Error logs
     - Steps to reproduce

---

**Installation Date:** _________________

**Tested By:** _________________

**Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
_________________________________________
_________________________________________
_________________________________________
