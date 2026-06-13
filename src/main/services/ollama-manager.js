// Lifecycle management for the local Ollama server (ollama.exe serve on 127.0.0.1:11434).
const fs = require('fs');
const { OLLAMA_EXE, OLLAMA_MODELS_PATH } = require('../paths');

let ollamaProcess = null;

function spawnOllama() {
  const { spawn } = require('child_process');
  ollamaProcess = spawn(OLLAMA_EXE, ['serve'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, OLLAMA_MODELS: OLLAMA_MODELS_PATH, OLLAMA_VULKAN: '1', OLLAMA_HOST: '127.0.0.1:11434' }
  });
  return ollamaProcess;
}

// Fire-and-forget start on app launch (only spawns if not already answering)
function startOnStartup() {
  if (!fs.existsSync(OLLAMA_EXE)) return;
  const http = require('http');
  const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
    res.resume(); // already running
  });
  req.on('error', () => {
    spawnOllama().unref();
    console.log('[Ollama] Started serve process');
  });
  req.setTimeout(2000, () => req.destroy());
}

// Wait for Ollama to be ready (polls up to maxTries times)
function waitForOllama(maxTries = 60, intervalMs = 1500) {
  return new Promise((resolve) => {
    const http = require('http');
    let tries = 0;
    const check = () => {
      tries++;
      const req = http.get('http://127.0.0.1:11434/api/tags', (res) => { res.resume(); resolve(true); });
      req.on('error', () => { if (tries < maxTries) setTimeout(check, intervalMs); else resolve(false); });
      req.setTimeout(2000, () => { req.destroy(); if (tries < maxTries) setTimeout(check, intervalMs); else resolve(false); });
    };
    check();
  });
}

// Explicit start requested from the renderer; resolves when Ollama answers (or times out)
async function start() {
  if (!fs.existsSync(OLLAMA_EXE)) return { success: false, error: 'ollama.exe not found at ' + OLLAMA_EXE };
  const http = require('http');
  const alreadyRunning = await new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:11434/api/tags', (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
  if (alreadyRunning) return { success: true, alreadyRunning: true };

  let spawnError = null;
  const proc = spawnOllama();
  proc.on('error', (err) => { spawnError = err.message; });
  proc.unref();
  // Give it a moment to fail fast if exe is bad, then start polling
  await new Promise(r => setTimeout(r, 1500));
  if (spawnError) return { success: false, error: 'Failed to spawn Ollama: ' + spawnError };
  // Poll up to 90 seconds (AMD GPU Vulkan init can take a while)
  const ready = await waitForOllama(60, 1500);
  return { success: ready, error: ready ? null : 'Ollama is taking too long to start. Try clicking Start again, or launch ollama.exe manually.' };
}

async function stop() {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    exec('taskkill /IM ollama.exe /F', (err) => {
      ollamaProcess = null;
      resolve({ success: !err });
    });
  });
}

module.exports = { startOnStartup, start, stop, waitForOllama };
