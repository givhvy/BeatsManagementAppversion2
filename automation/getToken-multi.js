import { google } from 'googleapis';
import fs from 'fs-extra';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import ChannelScanner from './modules/channelScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

async function getTokenForChannel(channel) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔐 Đang xác thực cho: ${channel.name}`);
  console.log(`${'='.repeat(60)}`);

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

  console.log('\n📋 Truy cập URL sau để xác thực:\n');
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
        console.log(`\n✅ Token đã lưu cho ${channel.name}`);
        console.log(`📁 Path: ${channel.tokenPath}\n`);
        resolve(true);
      } catch (error) {
        console.error(`\n❌ Lỗi lấy token cho ${channel.name}:`, error.message, '\n');
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log('\n🚀 YouTube Multi-Channel Token Generator\n');

  const scanner = new ChannelScanner(path.join(__dirname, 'config'));
  const channels = await scanner.scanChannels();

  if (channels.length === 0) {
    console.log('⚠️  Chưa có channel nào.');
    console.log('📖 Vui lòng tạo cấu trúc thư mục và thêm credentials.json');
    console.log('   Ví dụ: config/AccountA/channel1/credentials.json');
    console.log('');
    return;
  }

  // Lọc channels chưa có token
  const channelsNeedToken = channels.filter(ch => !ch.hasToken);

  if (channelsNeedToken.length === 0) {
    console.log('✅ Tất cả channels đã có token!');
    console.log('\n🚀 Chạy lệnh sau để khởi động server:');
    console.log('   node main-multi.js');
    console.log('');
    return;
  }

  console.log(`📺 Tìm thấy ${channelsNeedToken.length} channel(s) cần token:\n`);
  channelsNeedToken.forEach((ch, idx) => {
    console.log(`   ${idx + 1}. ${ch.name}`);
  });

  console.log('\n--- Bắt đầu lấy token cho từng channel ---\n');

  for (const channel of channelsNeedToken) {
    await getTokenForChannel(channel);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Hoàn tất! Tất cả channels đã có token.');
  console.log('='.repeat(60));
  console.log('\n🚀 Chạy lệnh sau để khởi động server:');
  console.log('   node main-multi.js');
  console.log('\n💡 Mở UI tại: http://localhost:3000');
  console.log('');
}

main().catch(error => {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
});
