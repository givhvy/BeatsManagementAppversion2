# 🛠️ Filmora Config Tools

Các công cụ để quản lý và kiểm tra cấu hình Filmora mode cho tất cả channels.

---

## 📋 Available Tools

### 1. **check-filmora-config.js** - Config Checker

Kiểm tra tất cả channels và hiển thị trạng thái Filmora mode.

**Usage:**
```bash
node tools/check-filmora-config.js
```

**Output:**
- ✅ Danh sách channels có Filmora mode
- ❌ Danh sách channels thiếu Filmora mode
- 📊 Thống kê tổng quan

**Example output:**
```
📊 SUMMARY
═══════════════════════════════════════════════════════════

Total channels scanned: 8
✅ With Filmora mode: 8
❌ Without Filmora mode: 0
⚠️  Errors: 0
```

---

### 2. **migrate-to-filmora.js** - Migration Tool

Tự động thêm Filmora mode vào tất cả channels chưa có.

**Usage:**
```bash
node tools/migrate-to-filmora.js
```

**What it does:**
1. Scan tất cả channels
2. Tìm channels thiếu `audienceMode`
3. Tạo backup của config cũ (`.backup`)
4. Thêm `audienceMode` mặc định
5. Lưu config mới

**Safety features:**
- ✅ Tạo backup tự động (`config.json.backup`)
- ✅ Yêu cầu xác nhận trước khi thay đổi
- ✅ Dry-run mode có sẵn (set `DRY_RUN = true`)
- ✅ Validate JSON structure

**Dry-run mode:**

Để xem trước thay đổi mà không sửa file:

1. Mở file `tools/migrate-to-filmora.js`
2. Đổi `const DRY_RUN = false;` thành `const DRY_RUN = true;`
3. Chạy: `node tools/migrate-to-filmora.js`

---

## 🚀 Quick Start

### Kiểm tra channels hiện tại:
```bash
node tools/check-filmora-config.js
```

### Migrate tất cả channels:
```bash
node tools/migrate-to-filmora.js
# Nhập "yes" khi được hỏi
```

### Verify sau khi migrate:
```bash
node tools/check-filmora-config.js
```

---

## 📝 Config Structure

Khi migrate, tool sẽ thêm section này vào mỗi `config.json`:

```json
{
  "displayName": "Your Channel Name",
  "autoUpload": true,
  "metadataTemplate": {
    ...
  },

  "audienceMode": {
    "enabled": true,
    "mode": "filmora-like",
    "useUSProxy": false,
    "proxyURL": ""
  }
}
```

---

## 🔄 Migration Workflow

```
1. Check current status
   ↓
   node tools/check-filmora-config.js

2. Run migration
   ↓
   node tools/migrate-to-filmora.js

3. Verify results
   ↓
   node tools/check-filmora-config.js

4. Restart uploader
   ↓
   npm start
```

---

## 📊 Example Output

### Before Migration:
```
📊 SUMMARY
═══════════════════════════════════════════════════════════

Total channels scanned: 8
✅ With Filmora mode: 1
❌ Without Filmora mode: 7
⚠️  Errors: 0

❌ CHANNELS NEEDING MIGRATION
═══════════════════════════════════════════════════════════

• AccountA/channel1 - C1
• AccountA/channel2 - C2 - Boom Bap Type Beats
• AccountA/channel3 - C3 - Young Nudy x Lucki Type Beats
...
```

### After Migration:
```
📊 SUMMARY
═══════════════════════════════════════════════════════════

Total channels scanned: 8
✅ With Filmora mode: 8
❌ Without Filmora mode: 0
⚠️  Errors: 0

✅ ALL CHANNELS CONFIGURED!
```

---

## 🛡️ Safety & Backup

### Backup Files

Mỗi config được backup tự động:
```
config/
  AccountA/
    channel1/
      config.json         ← New config with audienceMode
      config.json.backup  ← Original config
```

### Restore từ Backup

Nếu cần rollback:
```bash
# Windows
copy config\AccountA\channel1\config.json.backup config\AccountA\channel1\config.json

# Linux/Mac
cp config/AccountA/channel1/config.json.backup config/AccountA/channel1/config.json
```

---

## 🔧 Advanced Usage

### Check một channel cụ thể:

```bash
# Edit check-filmora-config.js, thêm filter
# Hoặc dùng grep
node tools/check-filmora-config.js | grep "channel4"
```

### Migrate chỉ một account:

```bash
# Edit migrate-to-filmora.js
# Thêm điều kiện filter account
if (account !== 'AccountA') continue;
```

---

## 📖 Related Documentation

- [FILMORA-MODE-README.md](../FILMORA-MODE-README.md) - Full Filmora mode documentation
- [QUICK-START-FILMORA.md](../QUICK-START-FILMORA.md) - Quick start guide
- [examples/filmora-upload-example.js](../examples/filmora-upload-example.js) - Code examples

---

## ❓ FAQ

### Q: Có cần phải restart uploader sau khi migrate không?

**A:** Có. Chạy `npm start` để load config mới.

### Q: Tool có thể chạy nhiều lần không?

**A:** Có. Tool tự động skip channels đã có `audienceMode`.

### Q: Backup files có thể xóa không?

**A:** Có. Sau khi verify config hoạt động tốt, bạn có thể xóa `.backup` files.

### Q: Nếu tôi tạo channel mới thì sao?

**A:** Channels mới tự động có `audienceMode` (đã update trong `main-multi.js`). Không cần migrate.

### Q: Tool có hoạt động với channels không có config.json không?

**A:** Không. Tool sẽ skip và báo warning. Bạn cần tạo config.json trước.

---

## 🎯 Next Steps

Sau khi migrate xong:

1. ✅ Verify: `node tools/check-filmora-config.js`
2. ✅ Restart: `npm start`
3. ✅ Upload video test
4. ✅ Check console logs xem timezone (LA → UTC)
5. ✅ Monitor YouTube Analytics sau 7-14 ngày

---

**Made with ❤️ for automated YouTube uploading**
