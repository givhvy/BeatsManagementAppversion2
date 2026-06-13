// Emergency data restore script
const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, 'data', 'beats-data.json');
const userDataPath = path.join(process.env.APPDATA, 'beats-management-studio', 'beats-data.json');

console.log('Backup file:', backupPath);
console.log('UserData file:', userDataPath);

if (!fs.existsSync(backupPath)) {
  console.error('ERROR: Backup file not found!');
  process.exit(1);
}

// Read backup
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
console.log('\nBackup contains:');
console.log('- Packs:', backupData.packs?.length || 0);
console.log('- GenrePacks:', backupData.genrePacks?.length || 0);

// Read current userData
let currentData = {};
if (fs.existsSync(userDataPath)) {
  currentData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
  console.log('\nCurrent userData contains:');
  console.log('- Packs:', currentData.packs?.length || 0);
  console.log('- GenrePacks:', currentData.genrePacks?.length || 0);
}

// Restore
console.log('\nRestoring data...');
fs.writeFileSync(userDataPath, JSON.stringify(backupData, null, 2));
console.log('✓ Data restored successfully!');
console.log('\nPlease restart the Beats Management Studio app.');
