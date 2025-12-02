# 🎬 YouTube Multi-Channel Uploader - Hướng Dẫn Setup

## 📋 Tổng quan

Hệ thống này cho phép bạn quản lý **nhiều channel YouTube** từ **nhiều tài khoản Google Cloud** khác nhau, chạy hoàn toàn local trên Windows.

---

## 🗂️ Cấu trúc thư mục

```
youtube-auto-uploader/
├── config/
│   ├── AccountA/
│   │   ├── channel1/
│   │   │   ├── credentials.json
│   │   │   └── token.json
│   │   └── channel2/
│   │       ├── credentials.json
│   │       └── token.json
│   └── AccountB/
│       ├── channel3/
│       │   ├── credentials.json
│       │   └── token.json
│       └── channel4/
│           ├── credentials.json
│           └── token.json
├── uploads/
│   ├── AccountA/
│   │   ├── channel1/
│   │   │   ├── BeatsUpload/    ← Drop video vào đây
│   │   │   └── Processed/       ← Video đã upload
│   │   └── channel2/
│   │       ├── BeatsUpload/
│   │       └── Processed/
│   └── AccountB/
│       ├── channel3/
│       │   ├── BeatsUpload/
│       │   └── Processed/
│       └── channel4/
│           ├── BeatsUpload/
│           └── Processed/
├── logs/
│   ├── AccountA-channel1.log
│   ├── AccountA-channel2.log
│   ├── AccountB-channel3.log
│   └── AccountB-channel4.log
├── modules/
│   ├── channelScanner.js          ← Tự động quét channels
│   ├── multiChannelYoutube.js     ← YouTube uploader cho từng channel
│   ├── ai.js                      ← Metadata generator
│   └── logger.js
├── ui/
│   ├── index-multi.html           ← UI multi-channel
│   ├── style-multi.css
│   └── script-multi.js
├── main-multi.js                  ← Server chính multi-channel
├── getToken-multi.js              ← Script lấy token cho từng channel
└── package.json
```

---

## 🚀 Bước 1: Cài đặt dependencies

```bash
npm install
```

---

## 🔐 Bước 2: Setup Google Cloud cho từng channel

### Mỗi channel cần 1 Google Cloud Project riêng để tránh quota limit

#### 2.1. Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới cho từng channel:
   - **AccountA-channel1** → Project name: `youtube-channel1`
   - **AccountA-channel2** → Project name: `youtube-channel2`
   - **AccountB-channel3** → Project name: `youtube-channel3`
   - v.v...

#### 2.2. Bật YouTube Data API v3

Cho **MỖI PROJECT**:
1. Vào **APIs & Services** > **Library**
2. Tìm: `YouTube Data API v3`
3. **ENABLE**

#### 2.3. Tạo OAuth 2.0 Client ID

Cho **MỖI PROJECT**:
1. Vào **APIs & Services** > **Credentials**
2. **CREATE CREDENTIALS** > **OAuth client ID**
3. Nếu chưa có OAuth consent screen:
   - **CONFIGURE CONSENT SCREEN**
   - Chọn **External** > **CREATE**
   - Điền thông tin cơ bản
   - **SAVE AND CONTINUE**
4. Application type: **Desktop app**
5. Name: `YouTube Uploader - ChannelX`
6. **CREATE**
7. **DOWNLOAD JSON**

#### 2.4. Lưu credentials vào đúng thư mục

```bash
# Ví dụ cho AccountA/channel1
mkdir -p config/AccountA/channel1
copy Downloads/client_secret_xxx.json config/AccountA/channel1/credentials.json

# Ví dụ cho AccountA/channel2
mkdir -p config/AccountA/channel2
copy Downloads/client_secret_yyy.json config/AccountA/channel2/credentials.json

# Tương tự cho các channel khác...
```

---

## 🔑 Bước 3: Lấy OAuth token cho từng channel

Tạo file `getToken-multi.js`:

```javascript
import { google } from 'googleapis';
import fs from 'fs-extra';
import readline from 'readline';
import ChannelScanner from './modules/channelScanner.js';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

async function getTokenForChannel(channel) {
  console.log(`\n🔐 Đang xác thực cho: ${channel.name}`);

  const credentials = await fs.readJson(channel.credentialsPath);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('📋 Truy cập URL sau để xác thực:');
  console.log(authUrl);
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Nhập code từ trang xác thực: ', async (code) => {
      rl.close();

      try {
        const { tokens } = await oAuth2Client.getToken(code);
        await fs.writeJson(channel.tokenPath, tokens, { spaces: 2 });
        console.log(`✅ Token đã lưu cho ${channel.name}: ${channel.tokenPath}\n`);
        resolve(true);
      } catch (error) {
        console.error(`❌ Lỗi lấy token cho ${channel.name}:`, error.message);
        resolve(false);
      }
    });
  });
}

async function main() {
  const scanner = new ChannelScanner('./config');
  const channels = await scanner.scanChannels();

  if (channels.length === 0) {
    console.log('⚠️  Chưa có channel nào. Vui lòng thêm credentials trước.');
    return;
  }

  // Lọc channels chưa có token
  const channelsNeedToken = channels.filter(ch => !ch.hasToken);

  if (channelsNeedToken.length === 0) {
    console.log('✅ Tất cả channels đã có token!');
    return;
  }

  console.log(`\n📺 Tìm thấy ${channelsNeedToken.length} channel(s) cần token:\n`);
  channelsNeedToken.forEach((ch, idx) => {
    console.log(`${idx + 1}. ${ch.name}`);
  });

  console.log('\n--- Bắt đầu lấy token cho từng channel ---\n');

  for (const channel of channelsNeedToken) {
    await getTokenForChannel(channel);
  }

  console.log('\n✅ Hoàn tất! Chạy npm start để khởi động hệ thống.\n');
}

main();
```

Chạy script:

```bash
node getToken-multi.js
```

Script sẽ lần lượt yêu cầu xác thực cho **MỖI CHANNEL** chưa có token.

---

## 📦 Bước 4: Tạo cấu trúc thư mục upload

Hệ thống sẽ tự tạo thư mục, nhưng bạn cũng có thể tạo thủ công:

```bash
# AccountA/channel1
mkdir -p uploads/AccountA/channel1/BeatsUpload
mkdir -p uploads/AccountA/channel1/Processed

# AccountA/channel2
mkdir -p uploads/AccountA/channel2/BeatsUpload
mkdir -p uploads/AccountA/channel2/Processed

# AccountB/channel3
mkdir -p uploads/AccountB/channel3/BeatsUpload
mkdir -p uploads/AccountB/channel3/Processed

# v.v...
```

---

## ▶️ Bước 5: Khởi động hệ thống

```bash
node main-multi.js
```

Console sẽ hiển thị:

```
🚀 YouTube Multi-Channel Uploader đang khởi động...

✅ Đã quét 4 channel(s)
   📺 AccountA - channel1 - ✅ Ready
   📺 AccountA - channel2 - ✅ Ready
   📺 AccountB - channel3 - ✅ Ready
   📺 AccountB - channel4 - ⚠️  Cần token

🔧 Đang khởi tạo: AccountA - channel1
✅ AccountA - channel1: Sẵn sàng
👁️  AccountA - channel1: Đang theo dõi uploads/AccountA/channel1/BeatsUpload

🔧 Đang khởi tạo: AccountA - channel2
✅ AccountA - channel2: Sẵn sàng
👁️  AccountA - channel2: Đang theo dõi uploads/AccountA/channel2/BeatsUpload

...

✅ Server đang chạy tại: http://localhost:3000
📺 Đang quản lý 4 channel(s)
⏰ Thời gian publish: 00:00 (Asia/Ho_Chi_Minh)

💡 Thả video vào thư mục tương ứng để tự động upload!
```

---

## 🎯 Bước 6: Upload video

### Tự động upload khi drop vào folder:

```bash
# Upload cho channel1
copy "my-video.mp4" "uploads/AccountA/channel1/BeatsUpload/"

# Upload cho channel2
copy "another-video.mp4" "uploads/AccountA/channel2/BeatsUpload/"

# Upload cho channel3
copy "beat-rnb.mp4" "uploads/AccountB/channel3/BeatsUpload/"
```

### Hệ thống sẽ tự động:

1. **Phát hiện video mới** (trong vòng 2 giây)
2. **Tạo metadata** (title, description, tags) dựa trên tên file
3. **Thêm vào queue** với status "draft"
4. **Hiển thị trong UI** tại http://localhost:3000

### Trong UI:

1. Chọn channel từ dropdown
2. Xem video trong hàng đợi
3. Nhấn **"Sửa"** để chỉnh metadata (nếu cần)
4. Nhấn **"Upload"** để xác nhận
5. Video được upload lên YouTube với status **private**
6. Schedule tự động publish lúc **00:00 (UTC+7)**
7. Video được di chuyển sang thư mục **Processed/**

---

## ➕ Thêm channel mới

### Chỉ cần 3 bước:

1. **Tạo Google Cloud Project mới**
2. **Lưu credentials:**
   ```bash
   mkdir -p config/AccountC/channel5
   copy credentials.json config/AccountC/channel5/
   ```
3. **Khởi động lại server:**
   ```bash
   node main-multi.js
   ```

Hệ thống tự động phát hiện và khởi tạo channel mới!

---

## 📊 UI Features

### Multi-Channel Dashboard

- **Dropdown chọn channel**: Xem riêng từng channel
- **Channel info**: Status, Queue count, History count
- **Upload paths**: Đường dẫn folder upload và log
- **Queue management**: Sửa metadata, xác nhận upload, xóa
- **History**: Xem video đã upload thành công/thất bại
- **Logs viewer**: Xem log real-time của từng channel

### Dark Theme UI

Giao diện tối, hiện đại, dễ nhìn, tương tự n8n workflow automation.

---

## 🛡️ Bảo mật

✅ **credentials.json** và **token.json** trong `.gitignore`
✅ Mỗi channel dùng OAuth riêng
✅ Token lưu local, không gửi ra ngoài
✅ Dữ liệu hoàn toàn offline

---

## 📝 Quota Management

**Mỗi Google Cloud Project có quota: 10,000 units/ngày**

Upload 1 video ≈ 1,600 units → **~6 videos/ngày/project**

### Giải pháp:

- **1 channel = 1 project** → Không bị limit
- **Nhiều channels** → Scale không giới hạn
- **Không cần billing** (miễn phí hoàn toàn)

---

## 🔧 Troubleshooting

### Channel không xuất hiện trong danh sách?

→ Kiểm tra `credentials.json` có trong thư mục `config/AccountX/channelY/` chưa

### Video không tự động upload?

→ Kiểm tra token đã được tạo chưa (`token.json` tồn tại?)

### Lỗi "Insufficient Permission"?

→ Token chỉ có quyền upload. Đây là bình thường, không ảnh hưởng upload.

### Lỗi "Invalid video keywords"?

→ Tags có ký tự đặc biệt hoặc quá dài. Hệ thống đã tự động fix.

---

## ✅ Tóm tắt workflow

```
1. Drop video vào uploads/AccountX/channelY/BeatsUpload/
2. Watcher phát hiện → Tạo metadata
3. Thêm vào queue với status "draft"
4. Vào UI → Chọn channel → Sửa metadata (optional)
5. Nhấn "Upload" → Bắt đầu upload lên YouTube
6. Upload xong → Di chuyển sang Processed/
7. Video schedule publish lúc 00:00
8. Ghi log vào logs/AccountX-channelY.log
```

---

**Hệ thống hoàn toàn tự động, chỉ cần drop video là xong! 🚀**

Mở http://localhost:3000 để quản lý tất cả channels!
