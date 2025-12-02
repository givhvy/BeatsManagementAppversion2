# 🎬 YouTube Auto Uploader

Hệ thống tự động upload video lên YouTube và schedule đăng công khai, chạy hoàn toàn local trên Windows.

## ✨ Tính năng

- ✅ Tự động theo dõi folder và upload video
- ✅ Tự động sinh tiêu đề, mô tả, tags bằng AI (Claude hoặc Ollama)
- ✅ Schedule publish video vào 12:00 đêm (có thể tùy chỉnh)
- ✅ Giao diện web đẹp, hiện đại để quản lý
- ✅ Hỗ trợ upload thủ công qua drag & drop
- ✅ Logging đầy đủ
- ✅ Chạy hoàn toàn offline (chỉ cần internet khi upload)

## 📋 Yêu cầu

- **Node.js** >= 18.0.0
- **Windows** 10/11
- **Tài khoản Google** với YouTube channel

## 🚀 Cài đặt

### Bước 1: Clone hoặc tải project

```bash
cd f:\PlaygroundTest\automation
```

### Bước 2: Cài dependencies

```bash
npm install
```

### Bước 3: Tạo Google Cloud Project và lấy credentials

#### 3.1. Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới:
   - Nhấp **Select a project** > **NEW PROJECT**
   - Đặt tên: `YouTube Uploader` (hoặc tùy ý)
   - Nhấp **CREATE**

#### 3.2. Bật YouTube Data API v3

1. Vào **APIs & Services** > **Library**
2. Tìm kiếm: `YouTube Data API v3`
3. Nhấp vào kết quả > **ENABLE**

#### 3.3. Tạo OAuth 2.0 Client ID

1. Vào **APIs & Services** > **Credentials**
2. Nhấp **CREATE CREDENTIALS** > **OAuth client ID**
3. Nếu chưa có OAuth consent screen:
   - Nhấp **CONFIGURE CONSENT SCREEN**
   - Chọn **External** > **CREATE**
   - Điền:
     - App name: `YouTube Uploader`
     - User support email: email của bạn
     - Developer contact: email của bạn
   - Nhấp **SAVE AND CONTINUE** (bỏ qua Scopes và Test users)
   - Nhấp **BACK TO DASHBOARD**

4. Quay lại **Credentials** > **CREATE CREDENTIALS** > **OAuth client ID**
5. Chọn:
   - Application type: **Desktop app**
   - Name: `YouTube Uploader Client`
6. Nhấp **CREATE**
7. **DOWNLOAD JSON** → Lưu file về

#### 3.4. Copy credentials vào project

1. Đổi tên file vừa tải về thành `credentials.json`
2. Copy vào folder `config/`:

```bash
copy Downloads\credentials.json f:\PlaygroundTest\automation\config\credentials.json
```

### Bước 4: Cấu hình AI (Tùy chọn)

Mở file [config/config.json](config/config.json) và cập nhật:

#### Sử dụng Claude AI:

```json
{
  "aiProvider": "claude",
  "aiSettings": {
    "claudeApiKey": "sk-ant-api03-...",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

#### Sử dụng Ollama (local):

1. Cài Ollama: https://ollama.ai/download
2. Pull model: `ollama pull llama2`
3. Cấu hình:

```json
{
  "aiProvider": "ollama",
  "aiSettings": {
    "ollamaUrl": "http://localhost:11434",
    "model": "llama2"
  }
}
```

> **Lưu ý:** Nếu không cấu hình AI, hệ thống sẽ tự động tạo metadata từ tên file.

### Bước 5: Khởi chạy lần đầu

```bash
npm start
```

Bạn sẽ thấy thông báo:

```
🔐 Vui lòng truy cập URL sau để xác thực:
https://accounts.google.com/o/oauth2/v2/auth?...

📋 Sau khi xác thực, copy code và paste vào file config/token.json
```

#### 5.1. Xác thực OAuth

1. Copy URL và mở trong trình duyệt
2. Đăng nhập Google account có channel YouTube
3. Cho phép ứng dụng truy cập
4. Copy **authorization code** hiện ra

#### 5.2. Lấy token

Có 2 cách:

**Cách 1: Tự động (khuyên dùng)**

1. Tạo file `getToken.js` trong thư mục gốc:

```javascript
import { google } from 'googleapis';
import fs from 'fs-extra';
import readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = './config/token.json';
const CREDENTIALS_PATH = './config/credentials.json';

const credentials = await fs.readJson(CREDENTIALS_PATH);
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  rl.close();
  const { tokens } = await oAuth2Client.getToken(code);
  await fs.writeJson(TOKEN_PATH, tokens);
  console.log('Token stored to', TOKEN_PATH);
});
```

2. Chạy:

```bash
node getToken.js
```

3. Paste code vừa copy
4. Token sẽ được tự động lưu vào `config/token.json`

**Cách 2: Thủ công**

1. Sử dụng [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Cấu hình:
   - Nhấp ⚙️ (góc trên bên phải) > **Use your own OAuth credentials**
   - Paste Client ID và Client Secret từ file `credentials.json`
3. Step 1: Select & authorize APIs
   - Tìm: `YouTube Data API v3`
   - Chọn: `https://www.googleapis.com/auth/youtube.upload`
   - **Authorize APIs**
4. Step 2: Exchange authorization code for tokens
   - **Exchange authorization code for tokens**
   - Copy toàn bộ JSON response
5. Tạo file `config/token.json` và paste JSON vào

### Bước 6: Khởi động lại

```bash
npm start
```

Nếu thành công, bạn sẽ thấy:

```
✅ YouTube API sẵn sàng
📺 Channel: Tên Channel Của Bạn
👥 Subscribers: 123

✅ Server đang chạy tại: http://localhost:3000
📁 Đang theo dõi folder: f:\PlaygroundTest\automation\uploads\BeatsUpload
⏰ Thời gian publish: 00:00 (Asia/Ho_Chi_Minh)

💡 Thả video vào folder để tự động upload!
```

## 📖 Hướng dẫn sử dụng

### Upload tự động

1. Copy/move file video vào folder: `uploads/BeatsUpload/`
2. Hệ thống tự động:
   - Phát hiện video mới
   - Tạo metadata bằng AI
   - Upload lên YouTube
   - Schedule publish lúc 12:00 đêm

### Upload thủ công qua UI

1. Mở trình duyệt: http://localhost:3000
2. Kéo thả video vào vùng **Drop Zone**
3. Hoặc điền form thủ công:
   - Tiêu đề
   - Mô tả
   - Tags
4. Nhấp **Upload ngay**

### Xem trạng thái

- **Hàng đợi**: Video đang chờ upload
- **Lịch sử**: Video đã upload (thành công hoặc thất bại)
- Nhấp **Thử lại** nếu upload thất bại

## ⚙️ Cấu hình

Mở file [config/config.json](config/config.json):

```json
{
  "uploadFolder": "uploads/BeatsUpload",     // Folder để drop video
  "logFolder": "logs",                        // Folder chứa log
  "timezone": "Asia/Ho_Chi_Minh",            // Múi giờ
  "publishTime": "00:00",                     // Giờ publish (24h format)
  "randomUploadTime": false,                  // Upload random giờ trong ngày
  "aiProvider": "claude",                     // "claude" hoặc "ollama"
  "port": 3000,                               // Port web UI
  "youtubeSettings": {
    "defaultCategory": "10",                  // 10 = Music
    "defaultPrivacy": "private",              // private, public, unlisted
    "defaultLanguage": "vi"
  }
}
```

### YouTube Categories

- `1` - Film & Animation
- `10` - Music
- `20` - Gaming
- `22` - People & Blogs
- `23` - Comedy
- `24` - Entertainment
- `25` - News & Politics
- `26` - Howto & Style
- `27` - Education
- `28` - Science & Technology

### Múi giờ

Xem danh sách: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

Ví dụ:
- Việt Nam: `Asia/Ho_Chi_Minh`
- New York: `America/New_York`
- London: `Europe/London`

## 🔧 Xử lý sự cố

### Lỗi: "credentials.json not found"

→ Chưa copy credentials.json vào folder `config/`

### Lỗi: "token.json not found"

→ Chưa xác thực OAuth. Làm theo Bước 5.

### Lỗi: "Invalid Credentials"

→ Token hết hạn. Xóa file `config/token.json` và chạy lại `npm start`.

### Lỗi: "The request cannot be completed because you have exceeded your quota"

→ Đã vượt quota YouTube API (mặc định 10,000 units/ngày).

**Giải pháp:**

1. Đợi 24h để quota reset
2. Hoặc tạo project mới cho channel khác
3. Hoặc request tăng quota: https://support.google.com/youtube/contact/yt_api_form

### Video không tự động public lúc 12:00 đêm

→ Kiểm tra:

1. `publishTime` trong config.json
2. `timezone` đúng chưa
3. Video đã upload với status `private` chưa (xem trong YouTube Studio)

### AI không tạo metadata

→ Kiểm tra:

1. Claude API key hợp lệ (nếu dùng Claude)
2. Ollama đang chạy (nếu dùng Ollama): `ollama serve`
3. Nếu không cần AI, hệ thống vẫn tạo metadata từ tên file

## 📁 Cấu trúc thư mục

```
youtube-auto-uploader/
├── main.js                    # File chính
├── package.json
├── README.md
├── config/
│   ├── config.json            # Cấu hình chung
│   ├── credentials.json       # OAuth client (tự tạo)
│   └── token.json             # Token sau khi xác thực (tự tạo)
├── modules/
│   ├── youtube.js             # Module YouTube upload
│   ├── ai.js                  # Module AI generate metadata
│   └── logger.js              # Module logging
├── ui/
│   ├── index.html             # Giao diện web
│   ├── style.css
│   └── script.js
├── uploads/
│   └── BeatsUpload/           # Folder để drop video
└── logs/
    ├── upload.log             # Log tất cả
    └── error.log              # Log lỗi
```

## 🔐 Bảo mật

- ✅ Token OAuth chỉ lưu local trong `config/token.json`
- ✅ Không gửi dữ liệu ra ngoài (trừ API YouTube chính thống)
- ✅ Thêm `config/credentials.json` và `config/token.json` vào `.gitignore`
- ⚠️ **KHÔNG** chia sẻ file credentials hoặc token với người khác
- ⚠️ **KHÔNG** commit credentials lên Git

## 📊 Quota YouTube API

Mỗi project Google Cloud có quota **10,000 units/ngày** (miễn phí).

Chi phí upload 1 video: **~1,600 units**

→ Upload được tối đa **6-7 video/ngày** trên 1 project.

### Tăng quota

1. Tạo nhiều project cho nhiều channel
2. Hoặc request tăng quota: https://support.google.com/youtube/contact/yt_api_form

## 🔄 Reset token / Đổi channel

### Đổi sang channel khác:

1. Xóa file `config/token.json`
2. Chạy lại `npm start`
3. Đăng nhập tài khoản mới khi xác thực OAuth

### Reset toàn bộ:

```bash
del config\token.json
npm start
```

## 📝 Log files

- `logs/upload.log` - Log tất cả hoạt động
- `logs/error.log` - Log lỗi

Xem log trực tiếp:

```bash
tail -f logs/upload.log
```

Hoặc mở bằng Notepad/VSCode.

## 🛠️ Development

### Chạy ở chế độ dev:

```bash
npm run dev
```

### Test upload 1 video:

1. Copy file test vào `uploads/BeatsUpload/`
2. Xem log trong console
3. Kiểm tra YouTube Studio

## ❓ FAQ

### Video có bị public ngay không?

Không. Video sẽ upload với status **private** và tự động public vào giờ `publishTime` (mặc định 00:00).

### Có thể upload nhiều video cùng lúc không?

Có. Hệ thống xử lý từng video một theo hàng đợi.

### Có cần server 24/7 không?

Không. Chỉ cần chạy khi upload. Sau khi upload xong, có thể tắt máy.

### AI có bắt buộc không?

Không. Nếu không cấu hình AI, hệ thống tự tạo metadata từ tên file.

### Có hỗ trợ macOS/Linux không?

Code tương thích nhưng chưa test. Có thể thay đổi path format trong config.

## 🎯 Roadmap

- [ ] Hỗ trợ thumbnail tự động
- [ ] Playlist auto-assign
- [ ] Multiple channel management
- [ ] Video editing tự động (intro/outro)
- [ ] Analytics dashboard

## 📞 Hỗ trợ

Nếu gặp lỗi, tạo issue tại: [GitHub Issues](#)

## 📄 License

MIT License - Free to use

---

**Chúc bạn upload thành công! 🎉**
