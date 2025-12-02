# Hướng dẫn sử dụng YouTube Multi-Channel Uploader

## 🚀 Khởi động

taskkill //F //IM node.exe && cd "f:\PlaygroundTest\automation" && node main-multi.js

```chạy ứng dụng:
npm start
```

Mở trình duyệt: http://localhost:3000

## 📁 Cấu trúc

```
config/AccountA/
├── channel1/
│   ├── credentials.json   (OAuth từ Google Cloud)
│   ├── token.json         (Auto tạo sau khi login)
│   └── config.json        (Cấu hình channel)
└── channel2/
    ├── credentials.json
    ├── token.json
    └── config.json
```

## ⚙️ Cấu hình channel (config.json)

```json
{
  "displayName": "Tên hiển thị",
  "autoUpload": false,
  "metadataTemplate": {
    "titlePrefix": "",
    "titleSuffix": "| Free Beat",
    "descriptionTemplate": "🎵 Free beat\n\n#beat #typebeat",
    "defaultTags": ["beat", "type beat", "free"],
    "category": "10",
    "privacy": "private",
    "language": "vi"
  }
}
```

## 📤 Upload video

**Cách 1:** Drag & drop vào UI (http://localhost:3000)

**Cách 2:** Copy vào folder:
- Channel 1: `uploads/AccountA/channel1/BeatsUpload/`
- Channel 2: `uploads/AccountA/channel2/BeatsUpload/`

## 🔑 Thêm channel mới

1. Tạo Google Cloud Project → Enable YouTube Data API v3
2. Tạo OAuth 2.0 credentials → Download JSON
3. Tạo folder: `config/AccountA/channel3/`
4. Đặt credentials vào: `config/AccountA/channel3/credentials.json`
5. Chạy: `node getToken-multi.js AccountA channel3`
6. Restart server

## ⚡ Auto-upload

Trong `config.json`: `"autoUpload": true` → Video tự động upload không cần confirm
