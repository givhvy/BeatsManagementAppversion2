import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { fileURLToPath } from 'url';

dayjs.extend(utc);
dayjs.extend(timezone);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = path.join(__dirname, '../config/token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../config/credentials.json');

class YouTubeUploader {
  constructor(config) {
    this.config = config;
    this.oauth2Client = null;
    this.youtube = null;
  }

  async initialize() {
    try {
      const credentials = await fs.readJson(CREDENTIALS_PATH);
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Kiểm tra token đã tồn tại chưa
      if (await fs.pathExists(TOKEN_PATH)) {
        const token = await fs.readJson(TOKEN_PATH);
        this.oauth2Client.setCredentials(token);
      } else {
        await this.getAccessToken();
      }

      this.youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });

      return true;
    } catch (error) {
      console.error('❌ Lỗi khởi tạo YouTube API:', error.message);
      return false;
    }
  }

  async getAccessToken() {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n🔐 Vui lòng truy cập URL sau để xác thực:');
    console.log(authUrl);
    console.log('\n📋 Sau khi xác thực, copy code và paste vào file config/token.json');
    console.log('   Format: {"access_token":"...","refresh_token":"...","scope":"...","token_type":"Bearer","expiry_date":...}');

    throw new Error('Cần xác thực OAuth. Vui lòng làm theo hướng dẫn ở trên.');
  }

  async uploadVideo(videoPath, metadata) {
    try {
      const fileSize = (await fs.stat(videoPath)).size;
      const fileName = path.basename(videoPath);

      console.log(`\n📤 Đang upload: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

      // Tính thời gian publish (12:00 AM hôm nay hoặc ngày mai)
      const publishAt = this.calculatePublishTime();

      const requestBody = {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: this.config.youtubeSettings.defaultCategory,
          defaultLanguage: this.config.youtubeSettings.defaultLanguage,
        },
        status: {
          privacyStatus: this.config.youtubeSettings.defaultPrivacy,
          publishAt: publishAt.toISOString(),
          selfDeclaredMadeForKids: false,
        },
      };

      const media = {
        body: fs.createReadStream(videoPath),
      };

      const response = await this.youtube.videos.insert({
        part: 'snippet,status',
        requestBody,
        media,
      });

      console.log(`✅ Upload thành công: ${metadata.title}`);
      console.log(`📅 Sẽ public lúc: ${publishAt.tz(this.config.timezone).format('DD/MM/YYYY HH:mm:ss')}`);
      console.log(`🔗 Video ID: ${response.data.id}`);

      return {
        success: true,
        videoId: response.data.id,
        publishAt: publishAt.toISOString(),
        videoUrl: `https://www.youtube.com/watch?v=${response.data.id}`,
      };
    } catch (error) {
      console.error('❌ Lỗi upload video:', error.message);

      if (error.code === 401) {
        console.log('🔄 Token hết hạn, đang làm mới...');
        await this.refreshToken();
        return this.uploadVideo(videoPath, metadata);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  calculatePublishTime() {
    const now = dayjs().tz(this.config.timezone);
    const [hours, minutes] = this.config.publishTime.split(':').map(Number);

    let publishAt = now.hour(hours).minute(minutes).second(0);

    // Nếu giờ publish đã qua trong ngày hôm nay, lùi sang ngày mai
    if (publishAt.isBefore(now)) {
      publishAt = publishAt.add(1, 'day');
    }

    return publishAt;
  }

  async refreshToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      await fs.writeJson(TOKEN_PATH, credentials);
      console.log('✅ Token đã được làm mới');
    } catch (error) {
      console.error('❌ Không thể làm mới token:', error.message);
      await this.getAccessToken();
    }
  }

  async getChannelInfo() {
    try {
      const response = await this.youtube.channels.list({
        part: 'snippet,contentDetails,statistics',
        mine: true,
      });

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Lỗi lấy thông tin channel:', error.message);
      return null;
    }
  }
}

export default YouTubeUploader;
