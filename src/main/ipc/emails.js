// Email account list management (email.txt, format: email:password:recovery per line).
const { ipcMain } = require('electron');
const fs = require('fs');
const { EMAIL_FILE_PATH } = require('../paths');

function register() {
  ipcMain.handle('load-emails', async () => {
    try {
      // Check if email file exists
      if (!fs.existsSync(EMAIL_FILE_PATH)) {
        return { emails: [], error: 'Email file not found at ' + EMAIL_FILE_PATH };
      }

      // Read email file content
      const content = fs.readFileSync(EMAIL_FILE_PATH, 'utf8');
      const emails = [];

      // Parse emails from file (format: email:password:recovery per line)
      const lines = content.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const parts = line.trim().split(':');
        if (parts.length >= 2) {
          const email = parts[0];
          const password = parts[1];
          const recovery = parts[2] || ''; // Optional recovery email

          if (email && password) {
            emails.push({ email, password, recovery, used: false });
          }
        }
      }

      console.log(`Loaded ${emails.length} emails from email.txt`);
      return { emails, error: null };
    } catch (error) {
      console.error('Error loading emails:', error);
      return { emails: [], error: error.message };
    }
  });

  ipcMain.handle('add-email', async (event, emailData) => {
    try {
      // Create file if it doesn't exist
      if (!fs.existsSync(EMAIL_FILE_PATH)) {
        fs.writeFileSync(EMAIL_FILE_PATH, '', 'utf8');
      }

      // Append new email:password:recovery to file
      const recovery = emailData.recovery || '';
      const newLine = recovery
        ? `${emailData.email}:${emailData.password}:${recovery}\n`
        : `${emailData.email}:${emailData.password}\n`;
      fs.appendFileSync(EMAIL_FILE_PATH, newLine, 'utf8');

      console.log(`Added new email: ${emailData.email}${recovery ? ' with recovery' : ''}`);
      return { success: true, error: null };
    } catch (error) {
      console.error('Error adding email:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('add-emails-bulk', async (event, emailsArray) => {
    try {
      // Create file if it doesn't exist
      if (!fs.existsSync(EMAIL_FILE_PATH)) {
        fs.writeFileSync(EMAIL_FILE_PATH, '', 'utf8');
      }

      // Build all lines
      const lines = emailsArray.map(emailData => {
        const recovery = emailData.recovery || '';
        return recovery
          ? `${emailData.email}:${emailData.password}:${recovery}`
          : `${emailData.email}:${emailData.password}`;
      });

      // Append all lines at once
      const bulkContent = lines.join('\n') + '\n';
      fs.appendFileSync(EMAIL_FILE_PATH, bulkContent, 'utf8');

      console.log(`Added ${emailsArray.length} emails in bulk`);
      return { success: true, count: emailsArray.length, error: null };
    } catch (error) {
      console.error('Error adding emails in bulk:', error);
      return { success: false, count: 0, error: error.message };
    }
  });
}

module.exports = { register };
