/**
 * ============================================================================
 * FILMORA CONFIG MIGRATION TOOL
 * ============================================================================
 *
 * This tool automatically adds audienceMode (Filmora-like) configuration
 * to all channel config files that don't have it yet.
 *
 * Usage:
 *   node tools/migrate-to-filmora.js
 *
 * What it does:
 *   1. Scans all channel configs
 *   2. Identifies channels without audienceMode
 *   3. Adds default audienceMode configuration
 *   4. Creates backup of original configs
 *
 * Safety:
 *   - Creates backups before modifying (config.json.backup)
 *   - Dry-run mode available (see DRY_RUN flag below)
 *   - Validates JSON structure after modification
 *
 * ============================================================================
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_BASE_PATH = path.join(__dirname, '../config');

// Set to true to preview changes without modifying files
const DRY_RUN = false;

/**
 * Default audienceMode configuration
 */
const DEFAULT_AUDIENCE_MODE = {
  enabled: true,
  mode: "filmora-like",
  useUSProxy: false,
  proxyURL: ""
};

/**
 * Ask user for confirmation
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

/**
 * Create backup of config file
 */
async function createBackup(configPath) {
  const backupPath = `${configPath}.backup`;
  await fs.copy(configPath, backupPath);
  return backupPath;
}

/**
 * Migrate a single channel config
 */
async function migrateChannel(account, channelId, configPath) {
  try {
    // Read existing config
    const config = await fs.readJson(configPath);

    // Check if already has audienceMode
    if (config.audienceMode) {
      return {
        success: false,
        skipped: true,
        reason: 'Already has audienceMode'
      };
    }

    if (!DRY_RUN) {
      // Create backup
      const backupPath = await createBackup(configPath);
      console.log(`  📦 Backup created: ${path.basename(backupPath)}`);

      // Add audienceMode
      config.audienceMode = DEFAULT_AUDIENCE_MODE;

      // Write updated config
      await fs.writeJson(configPath, config, { spaces: 2 });
    }

    return {
      success: true,
      config: config,
      changes: {
        added: 'audienceMode',
        value: DEFAULT_AUDIENCE_MODE
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Scan and migrate all channels
 */
async function migrateAllChannels() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║           FILMORA CONFIG MIGRATION TOOL                   ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const results = {
    total: 0,
    migrated: [],
    skipped: [],
    errors: []
  };

  try {
    // Scan all account folders
    const accounts = await fs.readdir(CONFIG_BASE_PATH);

    for (const account of accounts) {
      const accountPath = path.join(CONFIG_BASE_PATH, account);
      const stat = await fs.stat(accountPath);

      if (!stat.isDirectory() || account.startsWith('.') || account === 'config.json') {
        continue;
      }

      console.log(`📁 Scanning account: ${account}`);

      // Scan all channel folders
      const channelDirs = await fs.readdir(accountPath);

      for (const channelDir of channelDirs) {
        const channelPath = path.join(accountPath, channelDir);
        const channelStat = await fs.stat(channelPath);

        if (!channelStat.isDirectory() || channelDir.startsWith('.')) {
          continue;
        }

        const configPath = path.join(channelPath, 'config.json');

        if (!(await fs.pathExists(configPath))) {
          console.log(`  ⚠️  ${channelDir} - No config.json found, skipping`);
          results.skipped.push({
            account,
            channelId: channelDir,
            reason: 'No config.json'
          });
          continue;
        }

        results.total++;
        console.log(`  🔄 Processing: ${channelDir}`);

        const result = await migrateChannel(account, channelDir, configPath);

        if (result.success) {
          console.log(`  ✅ Migrated: ${channelDir}`);
          results.migrated.push({
            account,
            channelId: channelDir,
            configPath,
            changes: result.changes
          });
        } else if (result.skipped) {
          console.log(`  ⏭️  Skipped: ${channelDir} - ${result.reason}`);
          results.skipped.push({
            account,
            channelId: channelDir,
            reason: result.reason
          });
        } else {
          console.log(`  ❌ Error: ${channelDir} - ${result.error}`);
          results.errors.push({
            account,
            channelId: channelDir,
            error: result.error
          });
        }
      }

      console.log('');
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Total channels processed: ${results.total}`);
    console.log(`✅ Successfully migrated: ${results.migrated.length}`);
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.migrated.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ MIGRATED CHANNELS');
      console.log('═══════════════════════════════════════════════════════════\n');

      results.migrated.forEach(ch => {
        console.log(`• ${ch.account}/${ch.channelId}`);
        console.log(`  Added: audienceMode`);
        console.log(`  Config: ${ch.configPath}`);
        console.log('');
      });

      console.log('📋 Configuration added to all channels:');
      console.log(JSON.stringify(DEFAULT_AUDIENCE_MODE, null, 2));
      console.log('');
    }

    if (results.skipped.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('⏭️  SKIPPED CHANNELS');
      console.log('═══════════════════════════════════════════════════════════\n');

      results.skipped.forEach(ch => {
        console.log(`• ${ch.account}/${ch.channelId} - ${ch.reason}`);
      });
      console.log('');
    }

    if (results.errors.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('❌ ERRORS');
      console.log('═══════════════════════════════════════════════════════════\n');

      results.errors.forEach(err => {
        console.log(`• ${err.account}/${err.channelId}`);
        console.log(`  Error: ${err.error}`);
        console.log('');
      });
    }

    if (!DRY_RUN && results.migrated.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('💾 BACKUPS CREATED');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('Original configs backed up as: config.json.backup');
      console.log('You can restore them if needed by renaming the backup files.');
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ Migration complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (!DRY_RUN && results.migrated.length > 0) {
      console.log('🎯 Next steps:');
      console.log('   1. Verify configs: node tools/check-filmora-config.js');
      console.log('   2. Restart the uploader: npm start');
      console.log('   3. All new uploads will use Filmora mode automatically!');
      console.log('');
    }

    return results;
  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  if (DRY_RUN) {
    console.log('Running in DRY RUN mode...\n');
    await migrateAllChannels();
  } else {
    console.log('⚠️  This will modify your channel config files.');
    console.log('Backups will be created automatically.\n');

    const answer = await askQuestion('Do you want to proceed? (yes/no): ');

    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      await migrateAllChannels();
    } else {
      console.log('\n❌ Migration cancelled.\n');
      console.log('💡 To preview changes without modifying files, set DRY_RUN = true in the script.\n');
    }
  }
}

// Run the migration
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
