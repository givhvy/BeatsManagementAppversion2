import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Quét thư mục config để tự động phát hiện tất cả channels
 * Cấu trúc: config/AccountX/channelY/credentials.json & token.json
 */
class ChannelScanner {
  constructor(configBasePath) {
    this.configBasePath = configBasePath;
  }

  /**
   * Quét và trả về danh sách tất cả channels
   * @returns {Array} Danh sách channel objects
   */
  async scanChannels() {
    const channels = [];

    try {
      // Kiểm tra thư mục config tồn tại
      if (!(await fs.pathExists(this.configBasePath))) {
        console.log('⚠️  Thư mục config chưa tồn tại, đang tạo...');
        await fs.ensureDir(this.configBasePath);
        return channels;
      }

      // Lấy danh sách accounts (AccountA, AccountB, ...)
      const accounts = await fs.readdir(this.configBasePath);

      for (const account of accounts) {
        const accountPath = path.join(this.configBasePath, account);

        // Bỏ qua file, chỉ lấy thư mục
        const stat = await fs.stat(accountPath);
        if (!stat.isDirectory()) continue;

        // Bỏ qua thư mục ẩn và file .gitkeep
        if (account.startsWith('.')) continue;

        // Lấy danh sách channels trong account
        const channelDirs = await fs.readdir(accountPath);

        for (const channelDir of channelDirs) {
          const channelPath = path.join(accountPath, channelDir);

          // Bỏ qua file
          const channelStat = await fs.stat(channelPath);
          if (!channelStat.isDirectory()) continue;

          // Bỏ qua thư mục ẩn
          if (channelDir.startsWith('.')) continue;

          // Kiểm tra xem có credentials.json không
          const credentialsPath = path.join(channelPath, 'credentials.json');
          const tokenPath = path.join(channelPath, 'token.json');
          const channelConfigPath = path.join(channelPath, 'config.json');

          if (await fs.pathExists(credentialsPath)) {
            // Load channel config (nếu có)
            let channelConfig = {
              displayName: `${account} - ${channelDir}`,
              autoUpload: true,
              metadataTemplate: null,
            };

            if (await fs.pathExists(channelConfigPath)) {
              try {
                const loadedConfig = await fs.readJson(channelConfigPath);
                channelConfig = { ...channelConfig, ...loadedConfig };
              } catch (error) {
                console.warn(`⚠️  Lỗi đọc config ${channelDir}:`, error.message);
              }
            }

            channels.push({
              account,
              channelId: channelDir,
              name: channelConfig.displayName,
              configPath: channelPath,
              credentialsPath,
              tokenPath,
              uploadsPath: path.join(__dirname, '../uploads', account, channelDir, 'BeatsUpload'),
              processedPath: path.join(__dirname, '../uploads', account, channelDir, 'Processed'),
              logPath: path.join(__dirname, '../logs', `${account}-${channelDir}.log`),
              hasToken: await fs.pathExists(tokenPath),
              autoUpload: channelConfig.autoUpload,
              metadataTemplate: channelConfig.metadataTemplate,
            });
          }
        }
      }

      console.log(`✅ Đã quét ${channels.length} channel(s)`);
      channels.forEach(ch => {
        console.log(`   📺 ${ch.name} - ${ch.hasToken ? '✅ Ready' : '⚠️  Cần token'}`);
      });

      return channels;
    } catch (error) {
      console.error('❌ Lỗi quét channels:', error.message);
      return [];
    }
  }

  /**
   * Tạo cấu trúc thư mục cho channel mới
   */
  async createChannelStructure(account, channelId) {
    const channelConfigPath = path.join(this.configBasePath, account, channelId);
    const uploadsPath = path.join(__dirname, '../uploads', account, channelId, 'BeatsUpload');
    const processedPath = path.join(__dirname, '../uploads', account, channelId, 'Processed');

    await fs.ensureDir(channelConfigPath);
    await fs.ensureDir(uploadsPath);
    await fs.ensureDir(processedPath);

    // Tạo file .gitkeep
    await fs.writeFile(path.join(uploadsPath, '.gitkeep'), '');
    await fs.writeFile(path.join(processedPath, '.gitkeep'), '');

    console.log(`✅ Đã tạo cấu trúc cho channel: ${account}/${channelId}`);

    return {
      configPath: channelConfigPath,
      uploadsPath,
      processedPath,
    };
  }
}

export default ChannelScanner;
