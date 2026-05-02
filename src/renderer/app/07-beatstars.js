// ============================
// BEATSTARS SECTION
// ============================

const beatstarsState = {
  rootPath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\songs',
  outputRootPath: 'F:\\PlaygroundTest\\autodownload\\suno-ai-downloader\\BeatsUpload',
  selectedFolder: null, // { name, path, audioCount }
  folders: [],
  files: [],
  isProcessing: false,
  doneFolders: [] // Array of folder paths that have been processed
};

// Load done folders from localStorage
function loadDoneFolders() {
  try {
    const saved = localStorage.getItem('beatstars-done-folders');
    if (saved) {
      beatstarsState.doneFolders = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading done folders:', e);
    beatstarsState.doneFolders = [];
  }
}

// Save done folders to localStorage
function saveDoneFolders() {
  try {
    localStorage.setItem('beatstars-done-folders', JSON.stringify(beatstarsState.doneFolders));
  } catch (e) {
    console.error('Error saving done folders:', e);
  }
}

// Mark a folder as done
function markFolderAsDone(folderPath) {
  if (!beatstarsState.doneFolders.includes(folderPath)) {
    beatstarsState.doneFolders.push(folderPath);
    saveDoneFolders();
  }
}

// Check if a folder is marked as done
function isFolderDone(folderPath) {
  return beatstarsState.doneFolders.includes(folderPath);
}

// Clear done status for a folder
function clearFolderDone(folderPath) {
  beatstarsState.doneFolders = beatstarsState.doneFolders.filter(p => p !== folderPath);
  saveDoneFolders();
}

// DOM Elements
const beatstarsRootPath = document.getElementById('beatstars-root-path');
const beatstarsSelectRootBtn = document.getElementById('beatstars-select-root-btn');
const beatstarsRefreshFoldersBtn = document.getElementById('beatstars-refresh-folders-btn');
const beatstarsFolderBrowser = document.getElementById('beatstars-folder-browser');
const beatstarsSelectedInfo = document.getElementById('beatstars-selected-info');
const beatstarsSelectedName = document.getElementById('beatstars-selected-name');
const beatstarsSelectedCount = document.getElementById('beatstars-selected-count');
const beatstarsOutputPath = document.getElementById('beatstars-output-path');
const beatstarsOutputFolderBtn = document.getElementById('beatstars-output-folder-btn');
const outputSubfolderName = document.getElementById('output-subfolder-name');
const beatstarsProcessSelectedBtn = document.getElementById('beatstars-process-selected-btn');
const beatstarsProcessAllBtn = document.getElementById('beatstars-process-all-btn');
const beatstarsProgress = document.getElementById('beatstars-progress');
const beatstarsProgressFill = document.getElementById('beatstars-progress-fill');
const beatstarsProgressText = document.getElementById('beatstars-progress-text');
const beatstarsProgressCount = document.getElementById('beatstars-progress-count');
const beatstarsCurrentFile = document.getElementById('beatstars-current-file');
const beatstarsLogContent = document.getElementById('beatstars-log-content');
const beatstarsPreview = document.getElementById('beatstars-preview');

// Settings elements
const beatstarsRemoveSilence = document.getElementById('beatstars-remove-silence');
const beatstarsConvertWav = document.getElementById('beatstars-convert-wav');
const beatstarsRename = document.getElementById('beatstars-rename');
const beatstarsSilenceDb = document.getElementById('beatstars-silence-db');
const beatstarsSilenceDuration = document.getElementById('beatstars-silence-duration');

// Initialize Beatstars section
function initBeatstarsSection() {
  if (!beatstarsRootPath) return;

  // Load saved done folders
  loadDoneFolders();

  beatstarsRootPath.textContent = beatstarsState.rootPath;
  beatstarsOutputPath.textContent = beatstarsState.outputRootPath;

  // Event listeners
  beatstarsSelectRootBtn?.addEventListener('click', selectBeatstarsRootFolder);
  beatstarsRefreshFoldersBtn?.addEventListener('click', scanBeatstarsFolders);
  beatstarsOutputFolderBtn?.addEventListener('click', selectBeatstarsOutputFolder);
  beatstarsProcessSelectedBtn?.addEventListener('click', processSelectedFolder);
  beatstarsProcessAllBtn?.addEventListener('click', processSelectedFolder);

  // Process all folders button listener
  const processAllFoldersBtn = document.getElementById('beatstars-process-all-folders-btn');
  processAllFoldersBtn?.addEventListener('click', processAllFolders);

  // Scan folders on load
  scanBeatstarsFolders();
}

// Select root folder
async function selectBeatstarsRootFolder() {
  if (!ipcRenderer) return;

  const folderPath = await ipcRenderer.invoke('select-folder');
  if (folderPath) {
    beatstarsState.rootPath = folderPath;
    beatstarsRootPath.textContent = folderPath;
    beatstarsState.selectedFolder = null;
    updateSelectedFolderUI();
    await scanBeatstarsFolders();
  }
}

// Select output root folder
async function selectBeatstarsOutputFolder() {
  if (!ipcRenderer) return;

  const folderPath = await ipcRenderer.invoke('select-folder');
  if (folderPath) {
    beatstarsState.outputRootPath = folderPath;
    beatstarsOutputPath.textContent = folderPath;
    updateSelectedFolderUI();
  }
}

// Scan subfolders
async function scanBeatstarsFolders() {
  if (!ipcRenderer || !beatstarsState.rootPath) return;

  beatstarsFolderBrowser.innerHTML = '<div class="empty-state">Scanning folders...</div>';

  const result = await ipcRenderer.invoke('beatstars-scan-subfolders', beatstarsState.rootPath);

  if (!result.success) {
    beatstarsFolderBrowser.innerHTML = `<div class="empty-state" style="color: #ef4444;">Error: ${result.error}</div>`;
    return;
  }

  beatstarsState.folders = result.folders;
  renderBeatstarsFolders();
}

// Render folder list
function renderBeatstarsFolders() {
  if (beatstarsState.folders.length === 0) {
    beatstarsFolderBrowser.innerHTML = '<div class="empty-state">No folders with audio files found</div>';
    updateProcessAllFoldersButton();
    return;
  }

  beatstarsFolderBrowser.innerHTML = beatstarsState.folders.map((folder, index) => {
    const isSelected = beatstarsState.selectedFolder?.path === folder.path;
    const isDone = isFolderDone(folder.path);

    return `
      <div class="beatstars-folder-item ${isSelected ? 'selected' : ''} ${isDone ? 'done' : ''}" data-index="${index}" data-path="${folder.path}">
        <span class="folder-icon">${isDone
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        }</span>
        <div class="folder-info">
          <div class="folder-name">${folder.name}${isDone ? ' <span class="done-badge">DONE</span>' : ''}</div>
          <div class="folder-count">${folder.audioCount} audio files</div>
        </div>
        <span class="folder-badge ${isDone ? 'done' : ''}">${folder.audioCount}</span>
        ${isDone ? '<button class="clear-done-btn" data-path="' + folder.path.replace(/\\/g, '\\\\') + '" title="Clear DONE status"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg></button>' : ''}
      </div>
    `;
  }).join('');

  // Add click handlers for folder selection
  document.querySelectorAll('.beatstars-folder-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      // Ignore if clicking on clear done button
      if (e.target.classList.contains('clear-done-btn')) return;

      const index = parseInt(item.dataset.index);
      const folder = beatstarsState.folders[index];

      // Toggle selection
      if (beatstarsState.selectedFolder?.path === folder.path) {
        beatstarsState.selectedFolder = null;
      } else {
        beatstarsState.selectedFolder = folder;
        // Load files from this folder
        await loadFolderFiles(folder.path);
      }

      // Update UI
      document.querySelectorAll('.beatstars-folder-item').forEach(el => {
        el.classList.remove('selected');
      });
      if (beatstarsState.selectedFolder) {
        item.classList.add('selected');
      }

      updateSelectedFolderUI();
      updateProcessButtons();
    });
  });

  // Add click handlers for clear done buttons
  document.querySelectorAll('.clear-done-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const folderPath = btn.dataset.path;
      clearFolderDone(folderPath);
      renderBeatstarsFolders();
      addBeatstarsLog(`Cleared DONE status for folder`, 'info');
    });
  });

  // Add right-click context menu handlers
  document.querySelectorAll('.beatstars-folder-item').forEach(item => {
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const index = parseInt(item.dataset.index);
      const folder = beatstarsState.folders[index];
      showFolderContextMenu(e, folder);
    });
  });

  updateProcessButtons();
  updateProcessAllFoldersButton();
}

// Show context menu for folder
function showFolderContextMenu(event, folder) {
  // Remove existing context menu if any
  const existingMenu = document.getElementById('beatstars-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const isDone = isFolderDone(folder.path);

  // Create context menu
  const menu = document.createElement('div');
  menu.id = 'beatstars-context-menu';
  menu.className = 'beatstars-context-menu';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="select">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Select Folder
    </div>
    <div class="context-menu-divider"></div>
    ${isDone ? `
      <div class="context-menu-item" data-action="clear-done">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>Clear DONE Status
      </div>
    ` : `
      <div class="context-menu-item" data-action="mark-done">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Mark as DONE
      </div>
    `}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="open-folder">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Open in Explorer
    </div>
  `;

  // Position the menu
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;

  document.body.appendChild(menu);

  // Adjust position if menu goes off screen
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - menuRect.height - 10}px`;
  }

  // Handle menu item clicks
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;

      switch (action) {
        case 'select':
          beatstarsState.selectedFolder = folder;
          await loadFolderFiles(folder.path);
          renderBeatstarsFolders();
          updateSelectedFolderUI();
          updateProcessButtons();
          break;

        case 'mark-done':
          markFolderAsDone(folder.path);
          renderBeatstarsFolders();
          addBeatstarsLog(`Marked "${folder.name}" as DONE`, 'success');
          break;

        case 'clear-done':
          clearFolderDone(folder.path);
          renderBeatstarsFolders();
          addBeatstarsLog(`Cleared DONE status for "${folder.name}"`, 'info');
          break;

        case 'open-folder':
          if (ipcRenderer) {
            ipcRenderer.invoke('open-folder', folder.path);
          }
          break;
      }

      menu.remove();
    });
  });

  // Close menu when clicking outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };

  // Delay adding click listener to prevent immediate close
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 10);
}

// Load files from selected folder
async function loadFolderFiles(folderPath) {
  if (!ipcRenderer) return;

  const result = await ipcRenderer.invoke('beatstars-scan-folder', folderPath);

  if (result.success) {
    beatstarsState.files = result.files;
  } else {
    beatstarsState.files = [];
  }
}

// Update selected folder UI
function updateSelectedFolderUI() {
  if (beatstarsState.selectedFolder) {
    beatstarsSelectedInfo.style.display = 'block';
    beatstarsSelectedName.textContent = beatstarsState.selectedFolder.name;
    beatstarsSelectedCount.textContent = beatstarsState.selectedFolder.audioCount;
    outputSubfolderName.textContent = `${beatstarsState.outputRootPath}\\${beatstarsState.selectedFolder.name}`;
  } else {
    beatstarsSelectedInfo.style.display = 'none';
    outputSubfolderName.textContent = 'Select a folder above';
  }
}

// Update process buttons state
function updateProcessButtons() {
  const hasSelection = beatstarsState.selectedFolder !== null;

  if (beatstarsProcessSelectedBtn) {
    beatstarsProcessSelectedBtn.disabled = !hasSelection || beatstarsState.isProcessing;
    beatstarsProcessSelectedBtn.innerHTML = hasSelection
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="5 3 19 12 5 21 5 3"/></svg>Process "${beatstarsState.selectedFolder.name}"`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="5 3 19 12 5 21 5 3"/></svg>Process Selected`;
  }

  if (beatstarsProcessAllBtn) {
    beatstarsProcessAllBtn.disabled = !hasSelection || beatstarsState.isProcessing;
    beatstarsProcessAllBtn.innerHTML = hasSelection
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Process All (${beatstarsState.selectedFolder.audioCount} files)`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Process All Files`;
  }
}

// Update Process All Folders button state
function updateProcessAllFoldersButton() {
  const processAllFoldersBtn = document.getElementById('beatstars-process-all-folders-btn');
  if (!processAllFoldersBtn) return;

  const pendingFolders = beatstarsState.folders.filter(f => !isFolderDone(f.path));
  const doneCount = beatstarsState.folders.length - pendingFolders.length;

  processAllFoldersBtn.disabled = pendingFolders.length === 0 || beatstarsState.isProcessing;
  processAllFoldersBtn.innerHTML = pendingFolders.length > 0
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Process All Folders (${pendingFolders.length} pending, ${doneCount} done)`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>All Folders Done (${doneCount})`;
}

// Add log entry
function addBeatstarsLog(message, type = 'info') {
  const emptyState = beatstarsLogContent.querySelector('.empty-state');
  if (emptyState) {
    beatstarsLogContent.innerHTML = '';
  }

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  beatstarsLogContent.appendChild(entry);
  beatstarsLogContent.scrollTop = beatstarsLogContent.scrollHeight;
}

// Process selected folder
async function processSelectedFolder() {
  if (!beatstarsState.selectedFolder || beatstarsState.isProcessing) return;

  const files = beatstarsState.files;
  if (files.length === 0) {
    addBeatstarsLog('No files to process', 'error');
    return;
  }

  beatstarsState.isProcessing = true;
  updateProcessButtons();

  // Clear log
  beatstarsLogContent.innerHTML = '';

  // Calculate output folder path (root + subfolder name)
  const outputFolder = `${beatstarsState.outputRootPath}\\${beatstarsState.selectedFolder.name}`;

  // Ensure output folder exists
  addBeatstarsLog(`Creating output folder: ${outputFolder}`, 'info');
  await ipcRenderer.invoke('beatstars-ensure-folder', outputFolder);

  // Show progress
  beatstarsProgress.style.display = 'block';
  beatstarsProgressFill.style.width = '0%';
  beatstarsProgressText.textContent = 'Processing...';
  beatstarsProgressCount.textContent = `0/${files.length}`;

  addBeatstarsLog(`Processing ${files.length} file(s) from "${beatstarsState.selectedFolder.name}"...`, 'info');

  const settings = {
    removeSilence: beatstarsRemoveSilence?.checked ?? true,
    convertToWav: beatstarsConvertWav?.checked ?? true,
    rename: beatstarsRename?.checked ?? true,
    silenceDb: parseInt(beatstarsSilenceDb?.value || '-50'),
    silenceDuration: parseFloat(beatstarsSilenceDuration?.value || '0.1')
  };

  addBeatstarsLog(`Settings: Remove silence=${settings.removeSilence}, Convert WAV=${settings.convertToWav}, Rename=${settings.rename}`, 'info');
  addBeatstarsLog(`Output: ${outputFolder}`, 'info');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = Math.round(((i + 1) / files.length) * 100);

    beatstarsProgressFill.style.width = `${progress}%`;
    beatstarsProgressCount.textContent = `${i + 1}/${files.length}`;
    beatstarsCurrentFile.textContent = file.name;

    try {
      const result = await ipcRenderer.invoke('beatstars-process-file', {
        inputPath: file.path,
        outputFolder: outputFolder,
        removeSilence: settings.removeSilence,
        convertToWav: settings.convertToWav,
        rename: settings.rename,
        silenceDb: settings.silenceDb,
        silenceDuration: settings.silenceDuration
      });

      if (result.success) {
        successCount++;
        if (result.action === 'skipped') {
          addBeatstarsLog(`${file.name} - Skipped (no processing needed)`, 'warning');
        } else {
          addBeatstarsLog(`${result.originalName}  ${result.newName}`, 'success');
        }
      } else {
        errorCount++;
        addBeatstarsLog(`${file.name}: ${result.error}`, 'error');
      }
    } catch (error) {
      errorCount++;
      addBeatstarsLog(`${file.name}: ${error.message}`, 'error');
    }
  }

  // Complete
  beatstarsProgressText.textContent = 'Complete!';
  beatstarsCurrentFile.textContent = '';

  addBeatstarsLog(`Processing complete: ${successCount} success, ${errorCount} errors`,
    errorCount > 0 ? 'warning' : 'success');

  // Mark folder as done if all files processed successfully
  if (errorCount === 0 && successCount > 0) {
    markFolderAsDone(beatstarsState.selectedFolder.path);
    addBeatstarsLog(`Folder "${beatstarsState.selectedFolder.name}" marked as DONE`, 'success');
    renderBeatstarsFolders(); // Re-render to show DONE status
  }

  beatstarsState.isProcessing = false;
  updateProcessButtons();

  // Play notification sound
  if (errorCount === 0) {
    notificationSound.playComplete();
  } else {
    notificationSound.playSuccess();
  }
}

// Process all folders (skip DONE folders)
async function processAllFolders() {
  if (beatstarsState.isProcessing) return;

  const pendingFolders = beatstarsState.folders.filter(f => !isFolderDone(f.path));

  if (pendingFolders.length === 0) {
    addBeatstarsLog('No pending folders to process. All folders are marked as DONE.', 'info');
    return;
  }

  beatstarsState.isProcessing = true;
  updateProcessButtons();
  updateProcessAllFoldersButton();

  // Clear log
  beatstarsLogContent.innerHTML = '';

  addBeatstarsLog(`Starting batch processing of ${pendingFolders.length} folder(s)...`, 'info');

  const settings = {
    removeSilence: beatstarsRemoveSilence?.checked ?? true,
    convertToWav: beatstarsConvertWav?.checked ?? true,
    rename: beatstarsRename?.checked ?? true,
    silenceDb: parseInt(beatstarsSilenceDb?.value || '-50'),
    silenceDuration: parseFloat(beatstarsSilenceDuration?.value || '0.1')
  };

  addBeatstarsLog(`Settings: Remove silence=${settings.removeSilence}, Convert WAV=${settings.convertToWav}, Rename=${settings.rename}`, 'info');

  let totalFoldersProcessed = 0;
  let totalFilesProcessed = 0;
  let totalErrors = 0;

  for (const folder of pendingFolders) {
    addBeatstarsLog(`Processing folder: ${folder.name}`, 'info');

    // Load files for this folder
    const result = await ipcRenderer.invoke('beatstars-scan-folder', folder.path);
    if (!result.success || result.files.length === 0) {
      addBeatstarsLog(`No files found in ${folder.name}, skipping...`, 'warning');
      continue;
    }

    const files = result.files;
    const outputFolder = `${beatstarsState.outputRootPath}\\${folder.name}`;

    // Ensure output folder exists
    await ipcRenderer.invoke('beatstars-ensure-folder', outputFolder);

    // Show progress
    beatstarsProgress.style.display = 'block';
    beatstarsProgressText.textContent = `Processing "${folder.name}"...`;

    let folderSuccessCount = 0;
    let folderErrorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / files.length) * 100);

      beatstarsProgressFill.style.width = `${progress}%`;
      beatstarsProgressCount.textContent = `${i + 1}/${files.length}`;
      beatstarsCurrentFile.textContent = file.name;

      try {
        const processResult = await ipcRenderer.invoke('beatstars-process-file', {
          inputPath: file.path,
          outputFolder: outputFolder,
          removeSilence: settings.removeSilence,
          convertToWav: settings.convertToWav,
          rename: settings.rename,
          silenceDb: settings.silenceDb,
          silenceDuration: settings.silenceDuration
        });

        if (processResult.success) {
          folderSuccessCount++;
          if (processResult.action === 'skipped') {
            addBeatstarsLog(`${file.name} - Skipped`, 'warning');
          } else {
            addBeatstarsLog(`${processResult.originalName}  ${processResult.newName}`, 'success');
          }
        } else {
          folderErrorCount++;
          addBeatstarsLog(`${file.name}: ${processResult.error}`, 'error');
        }
      } catch (error) {
        folderErrorCount++;
        addBeatstarsLog(`${file.name}: ${error.message}`, 'error');
      }
    }

    totalFilesProcessed += folderSuccessCount;
    totalErrors += folderErrorCount;

    // Mark folder as done if no errors
    if (folderErrorCount === 0 && folderSuccessCount > 0) {
      markFolderAsDone(folder.path);
      addBeatstarsLog(`Folder "${folder.name}" marked as DONE`, 'success');
      totalFoldersProcessed++;
    } else if (folderErrorCount > 0) {
      addBeatstarsLog(`Folder "${folder.name}" had ${folderErrorCount} error(s), not marked as done`, 'warning');
    }

    // Re-render folders to show updated DONE status
    renderBeatstarsFolders();
  }

  // Complete
  beatstarsProgressText.textContent = 'All Folders Complete!';
  beatstarsCurrentFile.textContent = '';
  beatstarsProgressFill.style.width = '100%';

  addBeatstarsLog(`Batch processing complete!`, 'success');
  addBeatstarsLog(`   Folders processed: ${totalFoldersProcessed}`, 'info');
  addBeatstarsLog(`   Files processed: ${totalFilesProcessed}`, 'info');
  addBeatstarsLog(`   Errors: ${totalErrors}`, totalErrors > 0 ? 'warning' : 'info');

  beatstarsState.isProcessing = false;
  updateProcessButtons();
  updateProcessAllFoldersButton();

  // Play notification sound
  if (totalErrors === 0) {
    notificationSound.playComplete();
  } else {
    notificationSound.playSuccess();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBeatstarsSection);
} else {
  initBeatstarsSection();
}
