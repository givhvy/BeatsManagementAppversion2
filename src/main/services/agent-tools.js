// Tool definitions + executor for the in-app AI agent (Ollama function-calling).
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { APP_ROOT } = require('../paths');
const state = require('../app-state');

const AI_AGENT_TOOLS = [
  { type: 'function', function: { name: 'get_stats', description: 'Get overall app stats: total packs, beats across all packs, and customers.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_packs', description: 'List all beat packs with their names and how many beats each contains.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_beats_in_pack', description: 'List all beats (audio files) inside a specific pack.', parameters: { type: 'object', required: ['pack_name'], properties: { pack_name: { type: 'string', description: 'Pack name or partial name to look up' } } } } },
  { type: 'function', function: { name: 'create_pack', description: 'Create a new empty beat pack with the given name.', parameters: { type: 'object', required: ['name'], properties: { name: { type: 'string', description: 'Name for the new pack' } } } } },
  { type: 'function', function: { name: 'rename_pack', description: 'Rename an existing beat pack.', parameters: { type: 'object', required: ['current_name', 'new_name'], properties: { current_name: { type: 'string', description: 'Current pack name (partial match ok)' }, new_name: { type: 'string', description: 'New name for the pack' } } } } },
  { type: 'function', function: { name: 'add_beats_to_pack', description: 'Scan a folder on disk for audio files (.wav, .mp3, .flac, etc.) and add them all to an existing pack.', parameters: { type: 'object', required: ['pack_name', 'folder_path'], properties: { pack_name: { type: 'string', description: 'Name of the pack to add beats into (partial match ok)' }, folder_path: { type: 'string', description: 'Full file system path to the folder containing the audio files' } } } } },
  { type: 'function', function: { name: 'list_background_music_packs', description: 'List all Background Music packs with track counts.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'create_background_music_pack', description: 'Create a new empty Background Music pack.', parameters: { type: 'object', required: ['name'], properties: { name: { type: 'string', description: 'Name for the background music pack' } } } } },
  { type: 'function', function: { name: 'add_background_music_to_pack', description: 'Scan a folder for audio files and add them to a Background Music pack.', parameters: { type: 'object', required: ['pack_name', 'folder_path'], properties: { pack_name: { type: 'string', description: 'Background Music pack name (partial match ok)' }, folder_path: { type: 'string', description: 'Full path to folder containing background music files' } } } } },
  { type: 'function', function: { name: 'get_folders', description: 'Get the list of beat source folders configured in the app.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_customers', description: 'List all customers in the database. Optionally filter by type.', parameters: { type: 'object', properties: { type: { type: 'string', description: 'Filter by: lead | customer | vip (optional)' } } } } },
  { type: 'function', function: { name: 'add_customer', description: 'Add a new customer to the customer database.', parameters: { type: 'object', required: ['email'], properties: { email: { type: 'string', description: 'Customer email address' }, instagram: { type: 'string', description: 'Instagram handle, include the @' }, type: { type: 'string', description: 'lead | customer | vip (default: lead)' }, notes: { type: 'string', description: 'Optional notes' } } } } },
  { type: 'function', function: { name: 'navigate_tab', description: 'Switch the visible tab in the Beats Management app UI.', parameters: { type: 'object', required: ['tab'], properties: { tab: { type: 'string', description: 'Tab to navigate to: beats | autovid | videos | consistency | distro | youtube | progress | customers | beatstars | money | titles | background | midi' } } } } }
];

const AI_DATA_MODIFYING = new Set(['create_pack', 'rename_pack', 'add_beats_to_pack', 'create_background_music_pack', 'add_background_music_to_pack', 'add_customer']);

async function executeAgentTool(toolName, toolArgs) {
  const beatsDataPath = path.join(app.getPath('userData'), 'beats-data.json');
  const customersDataPath = path.join(app.getPath('userData'), 'customers.json');
  const backgroundDataPath = path.join(app.getPath('userData'), 'background-music-data.json');
  const readBeats = () => fs.existsSync(beatsDataPath) ? JSON.parse(fs.readFileSync(beatsDataPath, 'utf8')) : { packs: [], folders: [] };
  const writeBeats = (data) => {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(beatsDataPath, json);
    // Mirror to data/ folder for git tracking
    try { fs.writeFileSync(path.join(APP_ROOT, 'data', 'beats-data.json'), json); } catch (e) { /* non-critical */ }
  };
  const readCustomersFile = () => {
    if (!fs.existsSync(customersDataPath)) return { customers: [], emailHistory: [] };
    const raw = JSON.parse(fs.readFileSync(customersDataPath, 'utf8'));
    // Handle both formats: plain array (legacy) and correct { customers, emailHistory } object
    if (Array.isArray(raw)) return { customers: raw, emailHistory: [] };
    return { customers: raw.customers || [], emailHistory: raw.emailHistory || [] };
  };
  const readCustomers = () => readCustomersFile().customers;
  const readBackground = () => fs.existsSync(backgroundDataPath) ? JSON.parse(fs.readFileSync(backgroundDataPath, 'utf8')) : { music: [], packs: [] };
  const writeBackground = (data) => {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(backgroundDataPath, json);
  };
  const writeCustomers = (arr, emailHistory) => {
    const existing = readCustomersFile();
    const data = { customers: arr, emailHistory: emailHistory !== undefined ? emailHistory : existing.emailHistory };
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(customersDataPath, json);
    // Mirror to data/ folder for git tracking
    try { fs.writeFileSync(path.join(APP_ROOT, 'data', 'customers.json'), json); } catch (e) { /* non-critical */ }
  };

  switch (toolName) {
    case 'get_stats': {
      const data = readBeats();
      const customers = readCustomers();
      const packs = data.packs || [];
      const totalBeats = packs.reduce((sum, p) => sum + (p.beats || []).length, 0);
      return JSON.stringify({ packs: packs.length, beats_in_packs: totalBeats, customers: customers.length });
    }

    case 'list_packs': {
      const data = readBeats();
      return JSON.stringify((data.packs || []).map(p => ({ id: p.id, name: p.name, beats: (p.beats || []).length })));
    }

    case 'list_beats_in_pack': {
      const data = readBeats();
      const pack = (data.packs || []).find(p => p.name.toLowerCase().includes(toolArgs.pack_name.toLowerCase()));
      if (!pack) return `No pack found matching "${toolArgs.pack_name}"`;
      return JSON.stringify({ pack: pack.name, beats: (pack.beats || []).map(b => b.name) });
    }

    case 'create_pack': {
      const data = readBeats();
      if (!data.packs) data.packs = [];
      const exists = data.packs.find(p => p.name.toLowerCase() === toolArgs.name.toLowerCase());
      if (exists) return `Pack "${toolArgs.name}" already exists.`;
      const newPack = { id: Date.now().toString(), name: toolArgs.name, beats: [], thumbnail: null };
      data.packs.push(newPack);
      writeBeats(data);
      return `Created pack "${toolArgs.name}"`;
    }

    case 'rename_pack': {
      const data = readBeats();
      const pack = (data.packs || []).find(p => p.name.toLowerCase().includes(toolArgs.current_name.toLowerCase()));
      if (!pack) return `No pack found matching "${toolArgs.current_name}"`;
      const old = pack.name;
      pack.name = toolArgs.new_name;
      writeBeats(data);
      return `Renamed "${old}" → "${toolArgs.new_name}"`;
    }

    case 'add_beats_to_pack': {
      const data = readBeats();
      const pack = (data.packs || []).find(p => p.name.toLowerCase().includes(toolArgs.pack_name.toLowerCase()));
      if (!pack) return `No pack found matching "${toolArgs.pack_name}"`;
      if (!fs.existsSync(toolArgs.folder_path)) return `Folder not found: ${toolArgs.folder_path}`;
      const audioExts = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma']);
      const files = fs.readdirSync(toolArgs.folder_path).filter(f => audioExts.has(path.extname(f).toLowerCase()));
      if (!files.length) return `No audio files found in "${toolArgs.folder_path}"`;
      const existing = new Set((pack.beats || []).map(b => b.path));
      const toAdd = files
        .map(f => ({ name: f, path: path.join(toolArgs.folder_path, f), lastUsed: false }))
        .filter(b => !existing.has(b.path));
      if (!toAdd.length) return `All ${files.length} audio files already in "${pack.name}"`;
      pack.beats = [...(pack.beats || []), ...toAdd];
      writeBeats(data);
      return `Added ${toAdd.length} beats to "${pack.name}" (${files.length - toAdd.length} already existed)`;
    }

    case 'list_background_music_packs': {
      const data = readBackground();
      return JSON.stringify((data.packs || []).map(p => ({ id: p.id, name: p.name, tracks: (p.music || []).length, hidden: !!p.hidden })));
    }

    case 'create_background_music_pack': {
      const data = readBackground();
      if (!data.packs) data.packs = [];
      const exists = data.packs.find(p => p.name.toLowerCase() === toolArgs.name.toLowerCase());
      if (exists) return `Background Music pack "${toolArgs.name}" already exists.`;
      data.packs.push({
        id: `bgpack_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: toolArgs.name,
        music: [],
        thumbnail: null,
        hidden: false,
        createdAt: new Date().toISOString()
      });
      writeBackground(data);
      return `Created Background Music pack "${toolArgs.name}"`;
    }

    case 'add_background_music_to_pack': {
      const data = readBackground();
      const pack = (data.packs || []).find(p => p.name.toLowerCase().includes(toolArgs.pack_name.toLowerCase()));
      if (!pack) return `No Background Music pack found matching "${toolArgs.pack_name}"`;
      if (!fs.existsSync(toolArgs.folder_path)) return `Folder not found: ${toolArgs.folder_path}`;
      const audioExts = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma']);
      const files = fs.readdirSync(toolArgs.folder_path).filter(f => audioExts.has(path.extname(f).toLowerCase()));
      if (!files.length) return `No audio files found in "${toolArgs.folder_path}"`;
      if (!data.music) data.music = [];
      if (!pack.music) pack.music = [];
      const existingPackPaths = new Set(pack.music.map(m => m.filePath));
      const libraryByPath = new Map(data.music.map(m => [m.filePath, m]));
      const toAdd = [];
      for (const file of files) {
        const filePath = path.join(toolArgs.folder_path, file);
        if (existingPackPaths.has(filePath)) continue;
        let music = libraryByPath.get(filePath);
        if (!music) {
          music = { id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, name: file, filePath, addedAt: new Date().toISOString() };
          data.music.push(music);
          libraryByPath.set(filePath, music);
        }
        toAdd.push({ id: music.id, name: music.name, filePath: music.filePath, duration: music.duration });
      }
      if (!toAdd.length) return `All ${files.length} audio files already exist in "${pack.name}"`;
      pack.music = [...pack.music, ...toAdd];
      writeBackground(data);
      return `Added ${toAdd.length} background music tracks to "${pack.name}"`;
    }

    case 'get_folders': {
      const data = readBeats();
      return JSON.stringify(data.folders || []);
    }

    case 'list_customers': {
      let c = readCustomers();
      if (toolArgs.type) c = c.filter(x => x.type === toolArgs.type);
      return JSON.stringify(c.map(x => ({ name: x.instagram || x.email, email: x.email, type: x.type, notes: x.notes })));
    }

    case 'add_customer': {
      const c = readCustomers();
      if (c.find(x => x.email && x.email === toolArgs.email)) return `Customer ${toolArgs.email} already exists.`;
      const newC = {
        id: Date.now().toString(),
        name: toolArgs.instagram ? toolArgs.instagram.replace('@', '') : toolArgs.email.split('@')[0],
        email: toolArgs.email,
        instagram: toolArgs.instagram || '',
        phone: '',
        type: toolArgs.type || 'lead',
        tags: [],
        notes: toolArgs.notes || '',
        totalSpent: 0,
        beatsInterested: [],
        dateAdded: new Date().toISOString(),
        lastContact: null,
        source: 'ai-agent'
      };
      c.push(newC);
      writeCustomers(c);
      return `Added customer: ${newC.instagram || newC.email} (type: ${newC.type})`;
    }

    case 'navigate_tab': {
      const tab = String(toolArgs.tab || '').toLowerCase();
      const aliases = { video: 'videos', create: 'autovid', uploader: 'youtube', customer: 'customers' };
      const section = aliases[tab] || tab;
      const allowed = new Set(['beats', 'autovid', 'videos', 'consistency', 'distro', 'youtube', 'progress', 'customers', 'beatstars', 'money', 'titles', 'background', 'midi']);
      if (!allowed.has(section)) return `Unknown tab: ${toolArgs.tab}`;
      if (state.mainWindow) {
        state.mainWindow.webContents.executeJavaScript(
          `const tab = document.querySelector('.main-nav-tab[data-section="${section}"]'); if (tab) tab.click();`
        ).catch(() => {});
      }
      return `Switched to ${section} tab`;
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

module.exports = { AI_AGENT_TOOLS, AI_DATA_MODIFYING, executeAgentTool };
