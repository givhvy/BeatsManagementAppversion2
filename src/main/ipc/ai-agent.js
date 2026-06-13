// AI agent chat: Ollama function-calling loop driving the tools in services/agent-tools.
const { ipcMain } = require('electron');
const state = require('../app-state');
const { AI_AGENT_TOOLS, AI_DATA_MODIFYING, executeAgentTool } = require('../services/agent-tools');

function register() {
  ipcMain.handle('ai-command', async (event, { message, history }) => {
    try {
      const http = require('http');
      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant built into Beats Management Studio — a music producer app for managing beat packs, customers, and marketing campaigns. You control the app directly using the available tools. Be concise and action-oriented. After completing tasks, briefly summarize what you did.`
        },
        ...(history || []),
        { role: 'user', content: message }
      ];
      let dataModified = false;
      let backgroundModified = false;
      let customersModified = false;
      const log = [];

      for (let iter = 0; iter < 8; iter++) {
        const postData = JSON.stringify({
          model: 'qwen3.5:9b',
          messages,
          tools: AI_AGENT_TOOLS,
          stream: false,
          think: false,
          options: { temperature: 0.2, num_predict: 800 }
        });

        const parsed = await new Promise((resolve, reject) => {
          const opts = {
            hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
          };
          const req = http.request(opts, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
          });
          req.on('error', reject);
          req.setTimeout(90000, () => { req.destroy(); reject(new Error('Ollama timeout (90s)')); });
          req.write(postData); req.end();
        });

        if (parsed.error) throw new Error(parsed.error);
        const assistantMsg = parsed.message;
        messages.push(assistantMsg);

        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
          let content = (assistantMsg.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          if (dataModified && state.mainWindow) state.mainWindow.webContents.send('ai-data-updated');
          if (backgroundModified && state.mainWindow) state.mainWindow.webContents.send('ai-background-updated');
          if (customersModified && state.mainWindow) state.mainWindow.webContents.send('ai-customers-updated');
          return { success: true, response: content, log };
        }

        for (const tc of assistantMsg.tool_calls) {
          const name = tc.function.name;
          const args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : (tc.function.arguments || {});
          let result;
          try { result = await executeAgentTool(name, args); }
          catch (e) { result = 'Error: ' + e.message; }
          log.push({ tool: name, args, result });
          if (AI_DATA_MODIFYING.has(name)) dataModified = true;
          if (name === 'create_background_music_pack' || name === 'add_background_music_to_pack') backgroundModified = true;
          if (name === 'add_customer') customersModified = true;
          messages.push({ role: 'tool', content: String(result) });
        }
      }

      return { success: false, error: 'Agent exceeded maximum iterations.' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { register };
