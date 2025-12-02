# 🚀 Release 1.0 - Multi-Channel Support

## 📅 Release Date: 2025-10-09

## ✨ Tính năng mới

### 1. **Multi-Channel Management**
- Hỗ trợ upload lên nhiều YouTube channel cùng lúc
- Mỗi channel có OAuth credentials riêng
- Mỗi channel có metadata template riêng
- Mỗi channel có tên hiển thị tùy chỉnh

### 2. **Drag & Drop Upload từ UI**
- Kéo thả video trực tiếp vào UI
- Không cần copy vào folder
- Upload nhiều video cùng lúc
- Chọn channel trước khi upload

### 3. **Custom Metadata Template**
- Mỗi channel có template riêng cho title, description, tags
- Phù hợp với nhiều thể loại beat khác nhau (Hip Hop, Lofi, Trap, Drill...)
- Tùy chỉnh qua file `config.json` trong folder channel

### 4. **Auto-Upload Mode**
- Bật/tắt chế độ tự động upload không cần confirm
- Cấu hình riêng cho từng channel
- Video tự động upload ngay khi detect

## 🏗️ Cấu trúc thư mục mới

```
config/
├── config.json                    # Cấu hình chung
└── AccountA/                      # Google Cloud Account
    ├── channel1/                  # Channel 1
    │   ├── credentials.json       # OAuth credentials
    │   ├── token.json             # Access token
    │   └── config.json            # Channel config
    └── channel2/                  # Channel 2
        ├── credentials.json
        ├── token.json
        └── config.json

uploads/
└── AccountA/
    ├── channel1/
    │   ├── BeatsUpload/           # Folder upload
    │   └── Processed/             # Video đã xử lý
    └── channel2/
        ├── BeatsUpload/
        └── Processed/
```

## ⚙️ Channel Config (config.json)

```json
{
  "displayName": "Hip Hop Beats",
  "autoUpload": false,
  "metadataTemplate": {
    "titlePrefix": "",
    "titleSuffix": "| Free Hip Hop Beat",
    "descriptionTemplate": "🎵 Free Hip Hop Beat for non-profit use\n\n📥 Download: [Link]\n💰 Buy License: [Link]\n\n🎹 BPM: {bpm}\n🎼 Key: {key}\n\n#hiphop #beat #typebeat",
    "defaultTags": ["hip hop", "beat", "type beat", "free beat", "rap", "instrumental"],
    "category": "10",
    "privacy": "private",
    "language": "vi"
  }
}
```

## 🔧 Hướng dẫn thêm channel mới

### Cách 1: Channel mới trong cùng Google Cloud Account

**Khi nào dùng:** Bạn muốn thêm channel nhưng dùng chung API quota với channel cũ.

```bash
# 1. Tạo cấu trúc folder
mkdir config\AccountA\channel3
mkdir uploads\AccountA\channel3\BeatsUpload
mkdir uploads\AccountA\channel3\Processed

# 2. Vào Google Cloud Console (cùng project cũ)
# - APIs & Services > Credentials
# - CREATE CREDENTIALS > OAuth client ID
# - Application type: Desktop app
# - Download JSON

# 3. Copy credentials
copy Downloads\client_secret_*.json config\AccountA\channel3\credentials.json

# 4. Tạo config.json
# Copy từ channel khác và chỉnh sửa displayName, metadataTemplate

# 5. Get token
node getToken-multi.js AccountA channel3

# 6. Restart server
npm start
```

### Cách 2: Channel mới với Google Cloud Project riêng

**Khi nào dùng:** Bạn muốn API quota riêng (10,000 units/day mỗi project).

```bash
# 1. Tạo cấu trúc folder
mkdir config\AccountA\channel3
mkdir uploads\AccountA\channel3\BeatsUpload
mkdir uploads\AccountA\channel3\Processed

# 2. Tạo Google Cloud Project MỚI
# - Vào https://console.cloud.google.com/
# - NEW PROJECT > Đặt tên: "YouTube Channel 3"
# - Chọn project mới vừa tạo
# - APIs & Services > Library > Enable "YouTube Data API v3"
# - APIs & Services > Credentials > CREATE CREDENTIALS > OAuth client ID
# - Download JSON

# 3. Copy credentials
copy Downloads\client_secret_*.json config\AccountA\channel3\credentials.json

# 4. Tạo config.json
notepad config\AccountA\channel3\config.json
```

**Nội dung config.json:**

```json
{
  "displayName": "Trap Beats",
  "autoUpload": true,
  "metadataTemplate": {
    "titlePrefix": "[FREE] ",
    "titleSuffix": " | Hard Trap Beat",
    "descriptionTemplate": "🔥 Hard Trap Beat\n\n💰 Purchase: [Your Link]\n\n#trap #beat #typebeat #hardtrap",
    "defaultTags": ["trap", "beat", "hard trap", "type beat", "free beat"],
    "category": "10",
    "privacy": "private",
    "language": "vi"
  }
}
```

```bash
# 5. Get token
node getToken-multi.js AccountA channel3

# Paste code từ OAuth flow

# 6. Restart server
npm start
```

### Cách 3: Thêm AccountB (Google Cloud Account khác)

**Khi nào dùng:** Bạn có nhiều Google Cloud Account.

```bash
# 1. Tạo cấu trúc
mkdir config\AccountB
mkdir config\AccountB\channel1
mkdir uploads\AccountB\channel1\BeatsUpload

# 2. Tạo project trên AccountB
# Đăng xuất AccountA, đăng nhập AccountB
# Làm tương tự như Cách 2

# 3. Get token với AccountB
node getToken-multi.js AccountB channel1

# 4. Restart
npm start
```

## 🚀 Khởi động Multi-Channel

```bash
npm start
```

Hoặc sử dụng file multi-channel:

```bash
node main-multi.js
```

Mở UI: http://localhost:3000

## 📊 UI Features

- **Channel Selector**: Chọn channel để xem queue/history
- **Drag & Drop Zone**: Upload video trực tiếp
- **Queue Management**: Edit metadata trước khi upload
- **History**: Xem video đã upload
- **Logs**: Real-time logs cho từng channel

## 🔑 OAuth Token Management

### Get token cho channel mới:

```bash
node getToken-multi.js <Account> <ChannelId>
```

Ví dụ:
```bash
node getToken-multi.js AccountA channel1
node getToken-multi.js AccountA channel2
node getToken-multi.js AccountB channel1
```

### Reset token:

```bash
# Xóa token cũ
del config\AccountA\channel2\token.json

# Get token mới
node getToken-multi.js AccountA channel2
```

## 📝 Metadata Template Variables

Trong `descriptionTemplate`, bạn có thể dùng các biến:

- `{bpm}` - BPM của beat (tự động detect hoặc "Unknown")
- `{key}` - Key của beat (tự động detect hoặc "Unknown")

Ví dụ:
```json
{
  "descriptionTemplate": "🎵 Free Beat\n\nBPM: {bpm}\nKey: {key}\n\n#beat"
}
```

## ⚡ Auto-Upload Config

**Bật auto-upload:** Video tự động upload ngay khi detect

```json
{
  "autoUpload": true
}
```

**Tắt auto-upload:** Video vào queue, cần confirm trong UI

```json
{
  "autoUpload": false
}
```

## 🎨 Ví dụ Metadata Template

### Hip Hop Channel:

```json
{
  "displayName": "Hip Hop Beats",
  "autoUpload": false,
  "metadataTemplate": {
    "titleSuffix": " | Free Hip Hop Beat",
    "descriptionTemplate": "🎤 Free Hip Hop Beat\n\n📥 Free Download: [Link]\n💰 License: [Link]\n\n#hiphop #beat #typebeat",
    "defaultTags": ["hip hop", "beat", "type beat", "rap"]
  }
}
```

### Lofi Channel:

```json
{
  "displayName": "Lofi Beats",
  "autoUpload": true,
  "metadataTemplate": {
    "titleSuffix": " | Chill Lofi Beat",
    "descriptionTemplate": "☕ Chill Lofi Beat for study & relax\n\n#lofi #chillbeat #studymusic",
    "defaultTags": ["lofi", "chill beat", "study music", "relaxing"]
  }
}
```

### Trap Channel:

```json
{
  "displayName": "Hard Trap",
  "autoUpload": true,
  "metadataTemplate": {
    "titlePrefix": "[FREE] ",
    "titleSuffix": " | Hard Trap Beat",
    "descriptionTemplate": "🔥 Hard Trap Beat\n\n💰 Purchase: [Link]\n\n#trap #hardtrap #typebeat",
    "defaultTags": ["trap", "hard trap", "type beat", "808"]
  }
}
```

## 🐛 Bug Fixes

- Fixed: Token expiration handling
- Fixed: Multiple file upload race condition
- Fixed: Queue processing for multiple channels

## 🎯 Performance

- Concurrent upload support
- Independent queue per channel
- Separate logging per channel
- No blocking between channels

## 📊 API Quota Management

**Với setup multi-project:**

- Channel 1 (Project A): 10,000 units/day = ~6 videos
- Channel 2 (Project B): 10,000 units/day = ~6 videos
- Channel 3 (Project C): 10,000 units/day = ~6 videos

**Tổng: ~18 videos/day**

**Với setup single-project:**

- Tất cả channels dùng chung: 10,000 units/day = ~6 videos total

## ⚠️ Breaking Changes

- Cấu trúc folder config đã thay đổi
- Cần migrate từ `config/credentials.json` sang `config/AccountA/channel1/credentials.json`

### Migration từ version cũ:

```bash
# Backup
xcopy config config_backup /E /I

# Tạo structure mới
mkdir config\AccountA\channel1

# Move files
move config\credentials.json config\AccountA\channel1\credentials.json
move config\token.json config\AccountA\channel1\token.json

# Tạo config.json mới
notepad config\AccountA\channel1\config.json
```

## 🔐 Security

- Mỗi channel có OAuth riêng
- Token không chia sẻ giữa các channel
- Credentials nằm local, không upload
- Đã thêm `.gitignore` cho tất cả config files

## 🎉 Credits

Built with ❤️ for producers

---

**Happy uploading! 🚀**
