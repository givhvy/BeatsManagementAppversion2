/**
 * ============================================================================
 * FILMORA CONFIG CHECKER
 * ============================================================================
 *
 * This tool scans all channel config files and checks if they have
 * the audienceMode (Filmora-like) configuration enabled.
 *
 * Usage:
 *   node tools/check-filmora-config.js
 *
 * Output:
 *   - List of channels WITH Filmora mode enabled
 *   - List of channels WITHOUT Filmora mode (needs migration)
 *   - Summary statistics
 *
 * ============================================================================
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_BASE_PATH = path.join(__dirname, '../config');

/**
 * Scan all channel configs and check for audienceMode
 */
async function checkAllConfigs() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║           FILMORA CONFIG CHECKER                          ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const results = {
    total: 0,
    withFilmora: [],
    withoutFilmora: [],
    errors: []
  };

  try {
    // Scan all account folders
    const accounts = await fs.readdir(CONFIG_BASE_PATH);

    for (const account of accounts) {
      const accountPath = path.join(CONFIG_BASE_PATH, account);
      const stat = await fs.stat(accountPath);

      // Skip non-directories and hidden folders
      if (!stat.isDirectory() || account.startsWith('.') || account === 'config.json') {
        continue;
      }

      console.log(`📁 Scanning account: ${account}`);

      // Scan all channel folders in this account
      const channelDirs = await fs.readdir(accountPath);

      for (const channelDir of channelDirs) {
        const channelPath = path.join(accountPath, channelDir);
        const channelStat = await fs.stat(channelPath);

        if (!channelStat.isDirectory() || channelDir.startsWith('.')) {
          continue;
        }

        const configPath = path.join(channelPath, 'config.json');

        // Check if config.json exists
        if (!(await fs.pathExists(configPath))) {
          console.log(`  ⚠️  ${account}/${channelDir} - No config.json found`);
          results.errors.push({
            account,
            channelId: channelDir,
            error: 'No config.json found'
          });
          continue;
        }

        try {
          // Read config
          const config = await fs.readJson(configPath);
          results.total++;

          const channelInfo = {
            account,
            channelId: channelDir,
            displayName: config.displayName || `${account}/${channelDir}`,
            configPath: configPath
          };

          // Check if audienceMode exists
          if (config.audienceMode) {
            const enabled = config.audienceMode.enabled === true;
            const mode = config.audienceMode.mode || 'unknown';
            const useProxy = config.audienceMode.useUSProxy || false;

            channelInfo.audienceMode = config.audienceMode;
            channelInfo.status = enabled ? '✅ ENABLED' : '⚠️  DISABLED';

            results.withFilmora.push(channelInfo);

            console.log(`  ${channelInfo.status} ${channelDir} - ${config.displayName}`);
            console.log(`     Mode: ${mode}, Proxy: ${useProxy ? 'YES' : 'NO'}`);
          } else {
            channelInfo.status = '❌ NOT CONFIGURED';
            results.withoutFilmora.push(channelInfo);

            console.log(`  ❌ ${channelDir} - ${config.displayName} - Missing audienceMode`);
          }
        } catch (error) {
          console.log(`  ⚠️  ${account}/${channelDir} - Error reading config: ${error.message}`);
          results.errors.push({
            account,
            channelId: channelDir,
            error: error.message
          });
        }
      }

      console.log('');
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Total channels scanned: ${results.total}`);
    console.log(`✅ With Filmora mode: ${results.withFilmora.length}`);
    console.log(`❌ Without Filmora mode: ${results.withoutFilmora.length}`);
    console.log(`⚠️  Errors: ${results.errors.length}`);

    if (results.withoutFilmora.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('❌ CHANNELS NEEDING MIGRATION');
      console.log('═══════════════════════════════════════════════════════════\n');

      results.withoutFilmora.forEach(ch => {
        console.log(`• ${ch.account}/${ch.channelId}`);
        console.log(`  Name: ${ch.displayName}`);
        console.log(`  Path: ${ch.configPath}`);
        console.log('');
      });

      console.log('💡 Run the migration tool to add Filmora mode to these channels:');
      console.log('   node tools/migrate-to-filmora.js\n');
    }

    if (results.withFilmora.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ CHANNELS WITH FILMORA MODE');
      console.log('═══════════════════════════════════════════════════════════\n');

      results.withFilmora.forEach(ch => {
        console.log(`• ${ch.account}/${ch.channelId} - ${ch.displayName}`);
        console.log(`  Status: ${ch.status}`);
        console.log(`  Mode: ${ch.audienceMode.mode}`);
        console.log(`  Proxy: ${ch.audienceMode.useUSProxy ? '✅ Enabled' : '❌ Disabled'}`);
        if (ch.audienceMode.proxyURL) {
          console.log(`  Proxy URL: ${ch.audienceMode.proxyURL}`);
        }
        console.log('');
      });
    }

    if (results.errors.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('⚠️  ERRORS');
      console.log('═══════════════════════════════════════════════════════════\n');

      results.errors.forEach(err => {
        console.log(`• ${err.account}/${err.channelId}`);
        console.log(`  Error: ${err.error}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ Check complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

    return results;
  } catch (error) {
    console.error('\n❌ Error scanning configs:', error.message);
    throw error;
  }
}

// Run the checker
checkAllConfigs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
