// Check which .env file dotenv is reading
const path = require('path');
const fs = require('fs');

console.log('Current directory:', __dirname);
console.log('Process cwd:', process.cwd());

const envPath = path.join(__dirname, '.env');
console.log('\nExpected .env path:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('\nFile content:');
  console.log(content);
  console.log('\n---');

  const lines = content.split('\n');
  const tokenLine = lines.find(line => line.startsWith('PINTEREST_ACCESS_TOKEN='));
  if (tokenLine) {
    const token = tokenLine.split('=')[1];
    console.log('Token in file:', token ? token.substring(0, 30) + '...' + token.substring(token.length - 20) : 'N/A');
  }
}

// Now load dotenv
require('dotenv').config();
const token = process.env.PINTEREST_ACCESS_TOKEN;
console.log('\nToken after dotenv.config():', token ? token.substring(0, 30) + '...' + token.substring(token.length - 20) : 'N/A');
