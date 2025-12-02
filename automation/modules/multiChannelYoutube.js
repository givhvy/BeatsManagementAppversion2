import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { HttpsProxyAgent } from 'https-proxy-agent';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * YouTube Uploader cho từng channel riêng biệt
 */
class MultiChannelYouTubeUploader {
  constructor(channelConfig, globalConfig) {
    this.channel = channelConfig;
    this.config = globalConfig;
    this.oauth2Client = null;
    this.youtube = null;
    this.isReady = false;
    // configPath đã là thư mục channel rồi, không cần dirname
    this.uploadCountFile = path.join(this.channel.configPath, 'upload-count.json');
    this.scheduleFile = path.join(this.channel.configPath, 'scheduled-dates.json');
  }

  async initialize() {
    try {
      const credentials = await fs.readJson(this.channel.credentialsPath);
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Kiểm tra token
      if (await fs.pathExists(this.channel.tokenPath)) {
        const token = await fs.readJson(this.channel.tokenPath);
        this.oauth2Client.setCredentials(token);

        this.youtube = google.youtube({
          version: 'v3',
          auth: this.oauth2Client
        });

        this.isReady = true;
        return true;
      } else {
        console.log(`⚠️  ${this.channel.name}: Chưa có token, cần chạy getToken.js`);
        return false;
      }
    } catch (error) {
      console.error(`❌ ${this.channel.name} - Lỗi khởi tạo:`, error.message);
      return false;
    }
  }

  async uploadVideo(videoPath, metadata) {
    let readStream = null;

    try {
      const fileSize = (await fs.stat(videoPath)).size;
      const fileName = path.basename(videoPath);

      console.log(`\n📤 [${this.channel.name}] Đang upload: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

      // === FILMORA-LIKE TIMEZONE CALCULATION ===
      // Calculate publish time in Los Angeles timezone (like Filmora does)
      const publishAt = await this.calculateFilmoraPublishTime();

      // === FILMORA-LIKE REQUEST BODY ===
      // Build request body with Filmora-style metadata
      const requestBody = {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: this.config.youtubeSettings.defaultCategory || "10", // Music category
          defaultLanguage: "en", // Filmora always uses English
          defaultAudioLanguage: "en", // Filmora audio language
        },
        status: {
          privacyStatus: this.config.youtubeSettings.defaultPrivacy,
          publishAt: publishAt.utcISO, // ISO 8601 UTC format
          selfDeclaredMadeForKids: false,
        },
        recordingDetails: {
          locationDescription: "Los Angeles, CA" // Filmora location tag
        }
      };

      // === LOG TIMEZONE INFO (for verification) ===
      console.log(`\n⏰ TIMEZONE INFO:`);
      console.log(`   📍 Los Angeles Time: ${publishAt.laTime}`);
      console.log(`   🌍 UTC Publish Time: ${publishAt.utcISO}`);

      // === FILMORA-LIKE REQUEST OPTIONS ===
      // Prepare request options with custom User-Agent
      const requestOptions = {
        part: 'snippet,status,recordingDetails',
        requestBody,
        media: {
          body: fs.createReadStream(videoPath),
        },
        // Filmora User-Agent header
        headers: {
          'User-Agent': 'Wondershare Filmora/12.3.0 (Windows 10; en-US)'
        }
      };

      // === US PROXY SUPPORT (Optional) ===
      // If US proxy is enabled, use it for upload
      if (this.config.audienceMode?.useUSProxy && this.config.audienceMode?.proxyURL) {
        const proxyAgent = new HttpsProxyAgent(this.config.audienceMode.proxyURL);
        // Note: googleapis library uses axios internally, configure transport
        this.youtube.context._options.headers = requestOptions.headers;
        console.log(`   🌐 Using US Proxy: ${this.config.audienceMode.proxyURL}`);
      }

      readStream = requestOptions.media.body;

      const response = await this.youtube.videos.insert(requestOptions);

      // Đảm bảo stream đã đóng hoàn toàn
      await new Promise((resolve) => {
        if (readStream && !readStream.closed) {
          readStream.close();
          readStream.once('close', resolve);
        } else {
          resolve();
        }
      });

      // Lưu ngày schedule và tăng counter sau khi upload thành công
      await this.saveScheduledDate(publishAt.dayjsObj.format('YYYY-MM-DD'));
      const videoCount = await this.incrementUploadCount();

      console.log(`\n✅ [${this.channel.name}] Upload thành công: ${metadata.title}`);
      console.log(`📅 Sẽ public lúc: ${publishAt.laTime}`);
      console.log(`📊 Video thứ ${videoCount} trong ngày hôm nay`);
      console.log(`🔗 Video ID: ${response.data.id}`);

      // Đợi thêm một chút để đảm bảo Windows release file handle
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Di chuyển video sang thư mục Processed
      await this.moveToProcessed(videoPath);

      return {
        success: true,
        videoId: response.data.id,
        publishAt: publishAt.utcISO,
        publishAtLA: publishAt.laTime,
        videoUrl: `https://www.youtube.com/watch?v=${response.data.id}`,
        channelName: this.channel.name,
      };
    } catch (error) {
      console.error(`❌ [${this.channel.name}] Lỗi upload:`, error.message);

      // Đảm bảo stream được đóng khi có lỗi
      if (readStream && !readStream.closed) {
        readStream.close();
      }

      if (error.code === 401) {
        console.log(`🔄 [${this.channel.name}] Token hết hạn, đang làm mới...`);
        await this.refreshToken();
        return this.uploadVideo(videoPath, metadata);
      }

      return {
        success: false,
        error: error.message,
        channelName: this.channel.name,
      };
    }
  }

  async getTodayUploadCount() {
    try {
      const today = dayjs().tz(this.config.timezone).format('YYYY-MM-DD');

      if (await fs.pathExists(this.uploadCountFile)) {
        const data = await fs.readJson(this.uploadCountFile);
        return data[today] || 0;
      }

      return 0;
    } catch (error) {
      console.error(`⚠️  [${this.channel.name}] Lỗi đọc upload count:`, error.message);
      return 0;
    }
  }

  async incrementUploadCount() {
    try {
      const today = dayjs().tz(this.config.timezone).format('YYYY-MM-DD');
      let data = {};

      if (await fs.pathExists(this.uploadCountFile)) {
        data = await fs.readJson(this.uploadCountFile);
      }

      data[today] = (data[today] || 0) + 1;

      // Xóa các ngày cũ hơn 7 ngày để file không quá lớn
      const sevenDaysAgo = dayjs().tz(this.config.timezone).subtract(7, 'day').format('YYYY-MM-DD');
      Object.keys(data).forEach(date => {
        if (date < sevenDaysAgo) {
          delete data[date];
        }
      });

      await fs.writeJson(this.uploadCountFile, data, { spaces: 2 });

      return data[today];
    } catch (error) {
      console.error(`⚠️  [${this.channel.name}] Lỗi ghi upload count:`, error.message);
      return 1;
    }
  }

  /**
   * FILMORA-LIKE PUBLISH TIME CALCULATION
   *
   * This method calculates the publish time using Los Angeles timezone (America/Los_Angeles)
   * to make YouTube algorithm recognize the video as "from a US creator".
   *
   * The method:
   * 1. Gets current time in Los Angeles timezone
   * 2. Sets publish time to 12:00 AM (midnight) of the next available day
   * 3. Converts to UTC ISO 8601 format for YouTube API
   * 4. Returns both LA time (human readable) and UTC time (for API)
   *
   * @returns {Promise<Object>} Object with { laTime, utcISO, dayjsObj }
   */
  async calculateFilmoraPublishTime() {
    const LA_TIMEZONE = 'America/Los_Angeles';

    // Get current time in Los Angeles
    const nowLA = dayjs().tz(LA_TIMEZONE);

    // Get configured publish time (default to 12:00 AM if not set)
    const [hours, minutes] = (this.config.publishTime || '00:00').split(':').map(Number);

    // Read all scheduled dates to avoid conflicts
    const scheduledDates = await this.getScheduledDates();

    // Set publish time for today at configured hour
    let publishAtLA = nowLA.hour(hours).minute(minutes).second(0).millisecond(0);

    // If the publish time has already passed today, move to tomorrow
    if (publishAtLA.isBefore(nowLA)) {
      publishAtLA = publishAtLA.add(1, 'day');
    }

    // Find the next available date (no video scheduled on that date)
    while (scheduledDates.includes(publishAtLA.format('YYYY-MM-DD'))) {
      publishAtLA = publishAtLA.add(1, 'day');
    }

    // Convert to UTC for YouTube API (ISO 8601 format)
    const publishAtUTC = publishAtLA.utc();

    return {
      laTime: publishAtLA.format('YYYY-MM-DD HH:mm:ss [PST/PDT]'), // Human readable LA time
      utcISO: publishAtUTC.toISOString(), // ISO 8601 UTC format for API
      dayjsObj: publishAtLA // Original dayjs object for further operations
    };
  }

  /**
   * LEGACY METHOD (kept for backward compatibility)
   * Use calculateFilmoraPublishTime() for Filmora-like uploads
   */
  async calculatePublishTime() {
    const now = dayjs().tz(this.config.timezone);
    const [hours, minutes] = this.config.publishTime.split(':').map(Number);

    // Đọc tất cả video đã được schedule (từ ngày hôm nay trở đi)
    const scheduledDates = await this.getScheduledDates();

    let publishAt = now.hour(hours).minute(minutes).second(0);

    // Nếu giờ publish hôm nay đã qua, bắt đầu từ ngày mai
    if (publishAt.isBefore(now)) {
      publishAt = publishAt.add(1, 'day');
    }

    // Tìm ngày trống tiếp theo (chưa có video nào được schedule)
    while (scheduledDates.includes(publishAt.format('YYYY-MM-DD'))) {
      publishAt = publishAt.add(1, 'day');
    }

    return publishAt;
  }

  async getScheduledDates() {
    try {
      const today = dayjs().tz(this.config.timezone).format('YYYY-MM-DD');

      if (await fs.pathExists(this.scheduleFile)) {
        const data = await fs.readJson(this.scheduleFile);

        // Lọc lấy các ngày từ hôm nay trở đi
        return data.filter(date => date >= today);
      }

      return [];
    } catch (error) {
      console.error(`⚠️  [${this.channel.name}] Lỗi đọc scheduled dates:`, error.message);
      return [];
    }
  }

  async saveScheduledDate(scheduleDate) {
    try {
      let dates = [];

      if (await fs.pathExists(this.scheduleFile)) {
        dates = await fs.readJson(this.scheduleFile);
      }

      dates.push(scheduleDate);

      // Xóa các ngày cũ hơn 7 ngày để file không quá lớn
      const sevenDaysAgo = dayjs().tz(this.config.timezone).subtract(7, 'day').format('YYYY-MM-DD');
      dates = dates.filter(date => date >= sevenDaysAgo);

      await fs.writeJson(this.scheduleFile, dates, { spaces: 2 });
    } catch (error) {
      console.error(`⚠️  [${this.channel.name}] Lỗi lưu scheduled date:`, error.message);
    }
  }

  async refreshToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      await fs.writeJson(this.channel.tokenPath, credentials);
      console.log(`✅ [${this.channel.name}] Token đã được làm mới`);
    } catch (error) {
      console.error(`❌ [${this.channel.name}] Không thể làm mới token:`, error.message);
    }
  }

  async moveToProcessed(videoPath, maxRetries = 5) {
    const fileName = path.basename(videoPath);
    const processedPath = path.join(this.channel.processedPath, fileName);

    await fs.ensureDir(this.channel.processedPath);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Kiểm tra xem file đích đã tồn tại chưa
        if (await fs.pathExists(processedPath)) {
          // Nếu đã tồn tại, thêm timestamp vào tên file để tránh conflict
          const ext = path.extname(fileName);
          const baseName = path.basename(fileName, ext);
          const timestamp = Date.now();
          const newFileName = `${baseName}_${timestamp}${ext}`;
          const newProcessedPath = path.join(this.channel.processedPath, newFileName);

          await fs.move(videoPath, newProcessedPath);
          console.log(`📦 [${this.channel.name}] Đã di chuyển video sang Processed/ (${newFileName})`);
          return;
        } else {
          await fs.move(videoPath, processedPath);
          console.log(`📦 [${this.channel.name}] Đã di chuyển video sang Processed/`);
          return;
        }
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EPERM') {
          if (attempt < maxRetries) {
            console.log(`⏳ [${this.channel.name}] File đang bị lock, thử lại lần ${attempt}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
          } else {
            console.error(`⚠️  [${this.channel.name}] Không thể di chuyển file sau ${maxRetries} lần thử: ${error.message}`);
            console.log(`💡 [${this.channel.name}] File sẽ ở lại trong thư mục upload. Bạn có thể xóa thủ công.`);
          }
        } else {
          console.error(`⚠️  [${this.channel.name}] Lỗi di chuyển file:`, error.message);
          break;
        }
      }
    }
  }
}

export default MultiChannelYouTubeUploader;
