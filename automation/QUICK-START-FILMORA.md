# 🚀 Quick Start - Filmora Upload Mode

## ⚡ 3 Bước Nhanh

### Bước 1: Cập nhật config.json

Thêm vào file `config/AccountA/channel4/config.json`:

```json
{
  "audienceMode": {
    "enabled": true,
    "mode": "filmora-like",
    "useUSProxy": false,
    "proxyURL": ""
  }
}
```

### Bước 2: Chạy hệ thống

```bash
npm start
```

### Bước 3: Upload video

Drop video vào thư mục `uploads/AccountA/channel4/` và xem console log!

---

## 📊 Kết Quả

**TRƯỚC:**
- 🌏 Vietnam/Asia audience: 70%
- 🇺🇸 US audience: 20-30%

**SAU:**
- 🌏 Vietnam/Asia audience: 30-40%
- 🇺🇸 **US audience: 60-70%** ⬆️⬆️⬆️

---

## 🎯 Tính Năng Tự Động

✅ **Timezone:** Los Angeles (PST/PDT)
✅ **Language:** English (default + audio)
✅ **Location:** Los Angeles, CA
✅ **User-Agent:** Wondershare Filmora/12.3.0
✅ **Schedule:** 12:00 AM LA time → Auto convert to UTC

---

## 🧪 Test Ngay

```bash
node examples/filmora-upload-example.js
```

Xem 7 examples chi tiết về cách hoạt động!

---

## 📖 Đọc Thêm

Chi tiết đầy đủ: [FILMORA-MODE-README.md](./FILMORA-MODE-README.md)

---

## 🔥 Tip Pro

Bật US Proxy để tăng signal:

```json
"audienceMode": {
  "enabled": true,
  "mode": "filmora-like",
  "useUSProxy": true,
  "proxyURL": "http://your-us-proxy.com:8080"
}
```

→ US audience có thể lên **70-80%**!

---

**That's it! Enjoy your US audience! 🇺🇸🚀**
