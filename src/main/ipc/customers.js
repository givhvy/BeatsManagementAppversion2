// Customer database (customers.json in userData, mirrored to data/ for git).
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');

function register() {
  ipcMain.handle('load-customers', async () => {
    try {
      const customersPath = path.join(app.getPath('userData'), 'customers.json');
      if (!fs.existsSync(customersPath)) {
        return { customers: [], emailHistory: [] };
      }
      // Strip BOM in case file was written by PowerShell
      let raw = fs.readFileSync(customersPath, 'utf8');
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
      const data = JSON.parse(raw);
      // Unwrap PowerShell "value" serialization artifact if present
      let customers = data.customers;
      if (customers && !Array.isArray(customers) && Array.isArray(customers.value)) {
        customers = customers.value;
      }
      let emailHistory = data.emailHistory || [];
      if (emailHistory && !Array.isArray(emailHistory) && Array.isArray(emailHistory.value)) {
        emailHistory = emailHistory.value;
      }
      return { customers: Array.isArray(customers) ? customers : [], emailHistory };
    } catch (error) {
      console.error('Error loading customers:', error);
      return { customers: [], emailHistory: [] };
    }
  });

  ipcMain.handle('save-customers', async (event, data) => {
    try {
      const customersPath = path.join(app.getPath('userData'), 'customers.json');
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(customersPath, json);
      // Mirror to data/ folder so git can track it
      const mirrorPath = path.join(APP_ROOT, 'data', 'customers.json');
      try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
      return { success: true };
    } catch (error) {
      console.error('Error saving customers:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
