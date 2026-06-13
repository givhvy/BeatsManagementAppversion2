// Ollama lifecycle + AI features backed by the local Ollama server
// (email generation, vision OCR for customer screenshots, model listing).
const { ipcMain } = require('electron');
const ollamaManager = require('../services/ollama-manager');

function register() {
  ipcMain.handle('start-ollama', async () => {
    return ollamaManager.start();
  });

  ipcMain.handle('stop-ollama', async () => {
    return ollamaManager.stop();
  });

  ipcMain.handle('check-ollama', async () => {
    try {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ running: true, models: (parsed.models || []).map(m => m.name) });
            } catch (e) {
              resolve({ running: true, models: [] });
            }
          });
        });
        req.on('error', () => resolve({ running: false, models: [] }));
        req.setTimeout(3000, () => { req.destroy(); resolve({ running: false, models: [] }); });
      });
    } catch (e) {
      return { running: false, models: [] };
    }
  });

  // Get available Ollama models
  ipcMain.handle('get-ollama-models', async () => {
    try {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ success: true, models: (parsed.models || []).map(m => m.name) });
            } catch (e) {
              resolve({ success: true, models: [] });
            }
          });
        });
        req.on('error', () => resolve({ success: false, models: [] }));
        req.setTimeout(3000, () => { req.destroy(); resolve({ success: false, models: [] }); });
      });
    } catch (e) {
      return { success: false, models: [] };
    }
  });

  ipcMain.handle('generate-ai-email', async (event, { customerName, beatNames, discount, prompt, model }) => {
    try {
      const http = require('http');
      const usedModel = model || 'qwen3:4b';
      const systemPrompt = `You are a professional music marketing copywriter for a beats producer. Write concise, engaging marketing emails under 250 words. Use a conversational, personal tone. Always include a greeting, the value proposition, and a clear call to action. Format the email body in HTML using only <p>, <b>, <br>, and <a> tags. Output the HTML email body only.`;
      const beatList = Array.isArray(beatNames) ? beatNames.join(', ') : (beatNames || 'exclusive beats');
      const userPrompt = `Write a marketing email:\n- Customer: ${customerName || 'there'}\n- Beat(s): ${beatList}\n- Offer: ${discount || 'none'}\n- Goal: ${prompt || 'Promote beats and drive sales'}\nOutput HTML body only.`;
      const postData = JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: false, think: false, options: { temperature: 0.7, num_predict: 800 } });
      return new Promise((resolve) => {
        const options = { hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) return resolve({ success: false, error: 'Ollama error: ' + parsed.error });
              if (!parsed.message || !parsed.message.content) return resolve({ success: false, error: 'Unexpected Ollama response format.' });
              let content = parsed.message.content;
              content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              resolve({ success: true, content });
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse Ollama response: ' + e.message });
            }
          });
        });
        req.on('error', (e) => {
          if (e.code === 'ECONNREFUSED') {
            resolve({ success: false, error: 'Ollama is not running. Start it with start-ollama.bat in your testing folder.' });
          } else {
            resolve({ success: false, error: e.message });
          }
        });
        req.setTimeout(60000, () => { req.destroy(); resolve({ success: false, error: 'Ollama timed out (60s).' }); });
        req.write(postData);
        req.end();
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Analyze customer image via Ollama vision model
  ipcMain.handle('analyze-customer-image', async (event, { imageBase64, mimeType, vision_model }) => {
    try {
      const http = require('http');
      const model = vision_model || 'qwen3.5:9b';

      const prompt = `/no_think You are a precise OCR assistant. Look at this image carefully.

This is most likely an Instagram screenshot. The person's display name appears at the TOP in larger/bold text, and their username (handle) appears directly below in smaller, lighter text.

CRITICAL OCR RULES:
- Social media names use intentionally creative spellings with repeated characters (e.g. "Luuuiyyyi", "xxtentacion", "iilovemakonnen").
- Read EVERY character exactly as it appears — never autocorrect or normalize.
- For names with repeated similar characters (multiple u, i, y, l, o etc): count each character one by one before writing. Get the exact count right.
- The letters u, i, y can look similar at small sizes — look carefully at each one.
- Do NOT add or remove characters from what you see.

Extract ONLY:
1. The display name at the top (copy exactly — count repeated chars carefully)
2. The Instagram handle below it (copy exactly)
3. Email address ONLY if explicitly typed out and visible
4. Any beat titles or music track names mentioned

Respond ONLY with valid JSON, no markdown, no explanation:
{"name":"","instagram":"","email":"","beats_bought":[],"notes":"","confidence":"high|medium|low"}`;

      // Use Ollama native /api/generate — images are passed as raw base64 array (no data URL prefix)
      const postData = JSON.stringify({
        model: model,
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        think: false,
        options: { temperature: 0.1, num_predict: 2000 }
      });

      return new Promise((resolve) => {
        const options = {
          hostname: '127.0.0.1',  // explicit IPv4 — avoids Windows localhost→::1 IPv6 issue
          port: 11434,
          path: '/api/generate',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              let content = (parsed.response || '').trim();
              // Strip thinking mode tags (qwen3.5 outputs <think>...</think> before JSON)
              content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              // Strip markdown code fences (```json ... ``` or ``` ... ```)
              content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
              // Extract JSON from response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (!jsonMatch) return resolve({ success: false, error: 'AI did not return JSON. Response: ' + content.substring(0, 300) });
              const extracted = JSON.parse(jsonMatch[0]);
              resolve({ success: true, data: extracted });
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse AI response: ' + e.message });
            }
          });
        });
        req.on('error', (e) => {
          if (e.code === 'ECONNREFUSED') {
            resolve({ success: false, error: 'Cannot connect to Ollama on 127.0.0.1:11434. Click Start in the nav bar to start it.' });
          } else {
            resolve({ success: false, error: e.message });
          }
        });
        req.setTimeout(120000, () => { req.destroy(); resolve({ success: false, error: 'Vision model timed out (120s). Try again — first run loads the model.' }); });
        req.write(postData);
        req.end();
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { register };
