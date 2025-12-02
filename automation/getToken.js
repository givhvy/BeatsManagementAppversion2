import { google } from 'googleapis';
import fs from 'fs-extra';
import readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = './config/token.json';
const CREDENTIALS_PATH = './config/credentials.json';

async function getToken() {
  try {
    const credentials = await fs.readJson(CREDENTIALS_PATH);
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

    console.log('\n🔐 Authorize this app by visiting this url:\n');
    console.log(authUrl);
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('📋 Enter the code from that page here: ', async (code) => {
      rl.close();

      try {
        const { tokens } = await oAuth2Client.getToken(code);
        await fs.writeJson(TOKEN_PATH, tokens, { spaces: 2 });
        console.log('\n✅ Token stored to', TOKEN_PATH);
        console.log('\n🚀 Now you can run: npm start\n');
      } catch (error) {
        console.error('❌ Error retrieving access token:', error.message);
      }
    });
  } catch (error) {
    console.error('❌ Error reading credentials.json:', error.message);
    console.log('\n💡 Make sure you have placed credentials.json in the config/ folder\n');
  }
}

getToken();
