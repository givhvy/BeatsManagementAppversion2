// Marketing plans storage (marketing-plans.json in userData, mirrored to data/ for git).
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');

function register() {
  ipcMain.handle('load-marketing-plans', async () => {
    try {
      const plansPath = path.join(app.getPath('userData'), 'marketing-plans.json');
      if (!fs.existsSync(plansPath)) {
        return { plans: [] };
      }
      let raw = fs.readFileSync(plansPath, 'utf8');
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
      const data = JSON.parse(raw);
      let plans = data.plans;
      if (plans && !Array.isArray(plans) && Array.isArray(plans.value)) {
        plans = plans.value;
      }
      return { plans: Array.isArray(plans) ? plans : [] };
    } catch (error) {
      console.error('Error loading marketing plans:', error);
      return { plans: [] };
    }
  });

  ipcMain.handle('save-marketing-plans', async (event, data) => {
    try {
      const plansPath = path.join(app.getPath('userData'), 'marketing-plans.json');
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(plansPath, json);
      // Mirror to data/ folder so git can track it
      const mirrorPath = path.join(APP_ROOT, 'data', 'marketing-plans.json');
      try { fs.writeFileSync(mirrorPath, json); } catch (e) { /* non-critical */ }
      return { success: true };
    } catch (error) {
      console.error('Error saving marketing plans:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
