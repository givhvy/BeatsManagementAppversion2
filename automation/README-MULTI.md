# 🎬 YouTube Multi-Channel Auto Uploader

Hệ thống upload video tự động lên **nhiều kênh YouTube** từ **nhiều tài khoản Google Cloud**, chạy hoàn toàn **local offline** trên Windows.

---

## ✨ Tính năng

✅ **Multi-channel support** - Quản lý không giới hạn channels
✅ **Multi-account support** - Mỗi channel có Google Cloud Project riêng
✅ **Auto-detect channels** - Tự động quét và khởi tạo channels mới
✅ **File watcher** - Drop video vào folder → Tự động upload
✅ **Schedule publish** - Tự động public lúc 12:00 đêm (UTC+7)
✅ **AI metadata** - Tự động tạo title, description, tags
✅ **Web dashboard** - Quản lý tất cả channels trong 1 UI
✅ **Individual logs** - Log riêng cho từng channel
✅ **Auto move files** - Video upload xong được di chuyển sang Processed/
✅ **Quota management** - 1 channel = 1 project = Không limit

---

## 🚀 Quick Start

### 1. Cài đặt

```bash
npm install
```

### 2. Setup channels

Xem hướng dẫn chi tiết trong [MULTI-CHANNEL-SETUP.md](MULTI-CHANNEL-SETUP.md)

Tóm tắt:
- Tạo Google Cloud Project cho mỗi channel
- Lưu `credentials.json` vào `config/AccountX/channelY/`
- Chạy `node getToken-multi.js` để lấy token

### 3. Khởi động

```bash
node main-multi.js
```

### 4. Upload video

Drop video vào folder tương ứng:

```bash
uploads/AccountA/channel1/BeatsUpload/
uploads/AccountA/channel2/BeatsUpload/
uploads/AccountB/channel3/BeatsUpload/
```

### 5. Quản lý

Mở UI: http://localhost:3000

---

## 📁 Cấu trúc

```
config/
├── AccountA/
│   ├── channel1/
│   │   ├── credentials.json  ← OAuth từ Google Cloud
│   │   └── token.json         ← Tạo bằng getToken-multi.js
│   └── channel2/
│       ├── credentials.json
│       └── token.json
└── AccountB/
    ├── channel3/
    │   ├── credentials.json
    │   └── token.json
    └── channel4/
        ├── credentials.json
        └── token.json

uploads/
├── AccountA/
│   ├── channel1/
│   │   ├── BeatsUpload/    ← Drop video vào đây
│   │   └── Processed/       ← Video đã upload
│   └── channel2/
│       ├── BeatsUpload/
│       └── Processed/
└── AccountB/
    ├── channel3/
    │   ├── BeatsUpload/
    │   └── Processed/
    └── channel4/
        ├── BeatsUpload/
        └── Processed/

logs/
├── AccountA-channel1.log
├── AccountA-channel2.log
├── AccountB-channel3.log
└── AccountB-channel4.log
```

---

## 📖 Hướng dẫn chi tiết

Xem file [MULTI-CHANNEL-SETUP.md](MULTI-CHANNEL-SETUP.md) để có hướng dẫn đầy đủ về:

- Cách tạo Google Cloud Project
- Cách lấy OAuth credentials
- Cách setup token cho từng channel
- Cách thêm channel mới
- Troubleshooting

---

## 🎯 Workflow

```
1. Drop video → uploads/AccountX/channelY/BeatsUpload/
2. Watcher phát hiện → Tạo metadata (AI/Template)
3. Thêm vào queue với status "draft"
4. Mở UI → Chọn channel → Xem video
5. (Optional) Sửa metadata
6. Nhấn "Upload" → Bắt đầu upload lên YouTube
7. Video được set: privacy=private, publishAt=00:00
8. Upload xong → Di chuyển sang Processed/
9. Ghi log vào logs/AccountX-channelY.log
10. Video tự động public lúc 00:00
```

---

## 🔐 Bảo mật

✅ Tất cả credentials và tokens trong `.gitignore`
✅ Mỗi channel dùng OAuth riêng
✅ Không hardcode API keys
✅ Dữ liệu lưu hoàn toàn local
✅ Không cần server 24/7

---

## 📊 Quota Management

**Mỗi Google Cloud Project:** 10,000 units/ngày (miễn phí)
**Upload 1 video:** ~1,600 units
**→ Tối đa:** ~6 videos/ngày/project

**Giải pháp:**
- 1 channel = 1 project riêng
- Nhiều channels = Scale không giới hạn
- Không cần Google Cloud Billing

---

## 🛠️ Commands

| Command | Mô tả |
|---------|-------|
| `npm install` | Cài đặt dependencies |
| `node getToken-multi.js` | Lấy OAuth token cho channels |
| `node main-multi.js` | Khởi động server multi-channel |
| `npm start` | Khởi động server (single-channel cũ) |

---

## 📱 UI Features

- **Channel selector** - Dropdown chọn channel
- **Real-time status** - Xem queue, history, logs
- **Edit metadata** - Sửa title, description, tags trước khi upload
- **Upload confirmation** - Xác nhận trước khi upload
- **Dark theme** - Giao diện tối, hiện đại
- **Responsive** - Tương thích mobile

---

## ➕ Thêm channel mới

### 3 bước đơn giản:

1. **Tạo Google Cloud Project mới**
2. **Lưu credentials:**
   ```bash
   mkdir -p config/AccountC/channel5
   copy credentials.json config/AccountC/channel5/
   ```
3. **Restart server** - Hệ thống tự phát hiện!

Không cần sửa code!

---

## 🆚 So sánh Single vs Multi

| Feature | Single-Channel | Multi-Channel |
|---------|---------------|---------------|
| Số channels | 1 | Không giới hạn |
| Google Cloud Projects | 1 | 1 project/channel |
| Quota limit | 6 videos/ngày | 6 videos/ngày/channel |
| Upload folder | `uploads/BeatsUpload/` | `uploads/Account/channel/BeatsUpload/` |
| Config | `config/credentials.json` | `config/Account/channel/credentials.json` |
| Logs | `logs/upload.log` | `logs/Account-channel.log` |
| UI | Simple dashboard | Multi-channel dashboard |
| Setup complexity | Dễ | Trung bình |
| Scalability | Giới hạn | Không giới hạn |

---

## 🔄 Migration từ Single → Multi

Nếu bạn đang dùng version single-channel cũ:

1. **Giữ nguyên code cũ** (không cần xóa)
2. **Setup multi-channel** theo hướng dẫn
3. **Chạy song song:**
   - `npm start` → Single-channel (port 3000)
   - `node main-multi.js` → Multi-channel (port 3001)
4. **Chuyển dần** channels sang multi-channel

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra [MULTI-CHANNEL-SETUP.md](MULTI-CHANNEL-SETUP.md)
2. Xem logs tại `logs/AccountX-channelY.log`
3. Kiểm tra console output
4. Verify credentials và tokens

---

## 📄 License

MIT License - Free to use

---

**Happy uploading! 🎉**

Mở http://localhost:3000 để bắt đầu!
