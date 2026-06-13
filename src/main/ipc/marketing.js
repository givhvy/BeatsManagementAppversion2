// Email marketing: Resend config/sending + campaign and per-beat marketing data.
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT, MARKETING_BASE } = require('../paths');

function getResendConfig() {
  const configPath = path.join(MARKETING_BASE, 'resend-config.json');
  if (fs.existsSync(configPath)) {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
  }
  return { apiKey: '', fromEmail: 'onboarding@resend.dev', fromName: 'Beats Marketing' };
}

function register() {
  ipcMain.handle('load-resend-config', async () => {
    return getResendConfig();
  });

  ipcMain.handle('save-resend-config', async (event, config) => {
    try {
      if (!fs.existsSync(MARKETING_BASE)) fs.mkdirSync(MARKETING_BASE, { recursive: true });
      const configPath = path.join(MARKETING_BASE, 'resend-config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-resend-config-path', async () => {
    return path.join(MARKETING_BASE, 'resend-config.json');
  });

  ipcMain.handle('send-marketing-email', async (event, { to, subject, html }) => {
    try {
      const config = getResendConfig();
      if (!config.apiKey) {
        return { success: false, error: 'No Resend API key configured. Open Marketing Settings to add your key.' };
      }
      const { Resend } = require('resend');
      const resend = new Resend(config.apiKey);
      const { data, error } = await resend.emails.send({
        from: `${config.fromName || 'Beats Marketing'} <${config.fromEmail || 'onboarding@resend.dev'}>`,
        to: [to],
        subject,
        html
      });
      if (error) return { success: false, error: error.message };
      return { success: true, emailId: data.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-email-status', async (event, emailId) => {
    try {
      const config = getResendConfig();
      if (!config.apiKey) return { success: false, error: 'No API key' };
      const { Resend } = require('resend');
      const resend = new Resend(config.apiKey);
      const email = await resend.emails.get(emailId);
      return { success: true, email };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('load-campaigns', async () => {
    try {
      const p = path.join(app.getPath('userData'), 'campaigns.json');
      if (!fs.existsSync(p)) return { campaigns: [] };
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      return { campaigns: [] };
    }
  });

  ipcMain.handle('save-campaigns', async (event, data) => {
    try {
      const p = path.join(app.getPath('userData'), 'campaigns.json');
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(p, json);
      // Mirror to data/ folder so git can track it
      try { fs.writeFileSync(path.join(APP_ROOT, 'data', 'campaigns.json'), json); } catch (e) { /* non-critical */ }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('load-beat-marketing', async () => {
    try {
      const p = path.join(app.getPath('userData'), 'beat-marketing.json');
      if (!fs.existsSync(p)) return {};
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      return {};
    }
  });

  ipcMain.handle('save-beat-marketing', async (event, data) => {
    try {
      const p = path.join(app.getPath('userData'), 'beat-marketing.json');
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(p, json);
      // Mirror to data/ folder so git can track it
      try { fs.writeFileSync(path.join(APP_ROOT, 'data', 'beat-marketing.json'), json); } catch (e) { /* non-critical */ }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('load-marketing-tasks', async () => {
    try {
      const p = path.join(app.getPath('userData'), 'marketing-tasks.json');
      if (!fs.existsSync(p)) return { tasks: [] };
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      return { tasks: [] };
    }
  });

  ipcMain.handle('save-marketing-tasks', async (event, data) => {
    try {
      const p = path.join(app.getPath('userData'), 'marketing-tasks.json');
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(p, json);
      // Mirror to data/ folder so git can track it
      try { fs.writeFileSync(path.join(APP_ROOT, 'data', 'marketing-tasks.json'), json); } catch (e) { /* non-critical */ }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { register };
