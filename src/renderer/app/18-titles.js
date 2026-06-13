// ============================
// TITLES AND TAGS SECTION
// ============================

let ttInitialized = false;
let ttState = {
  templates: [],
  branding: {
    profile: null,
    banner: null
  },
  noPreview: localStorage.getItem('tt-branding-no-preview') === 'true'
};

function initTitlesSection() {
  if (ttInitialized) return;
  ttInitialized = true;
  ttLoadData();
  ttBindModalEvents();
}

async function ttLoadData() {
  try {
    let data = null;
    if (isElectron) {
      data = await ipcRenderer.invoke('load-data');
    } else {
      data = JSON.parse(localStorage.getItem('beats-data') || '{}');
    }

    ttState.templates = Array.isArray(data?.titleTemplates) ? data.titleTemplates : [];
    ttState.branding = data?.titleBranding || { profile: null, banner: null };
    ttUpdateNoPreviewButton();
    ttRenderBranding();
    ttRenderTemplates();
  } catch (error) {
    console.error('[Titles] Failed to load data:', error);
    ttUpdateNoPreviewButton();
    ttRenderBranding();
    ttRenderTemplates();
  }
}

async function ttSaveData() {
  const payload = {
    titleTemplates: ttState.templates,
    titleBranding: ttState.branding
  };

  try {
    if (isElectron) {
      const ok = await ipcRenderer.invoke('save-data', payload);
      if (!ok) throw new Error('save-data returned false');
    } else {
      const existing = JSON.parse(localStorage.getItem('beats-data') || '{}');
      localStorage.setItem('beats-data', JSON.stringify({ ...existing, ...payload }));
    }
  } catch (error) {
    console.error('[Titles] Failed to save data:', error);
    showNotification?.(`Could not save Titles data: ${error.message}`, 'error');
  }
}

function ttBindModalEvents() {
  const titleInput = document.getElementById('tt-modal-title-input');
  const descInput = document.getElementById('tt-modal-desc-input');

  if (titleInput) titleInput.addEventListener('input', ttUpdateCharCounts);
  if (descInput) descInput.addEventListener('input', ttUpdateCharCounts);

  document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('tt-modal-overlay');
    if (event.key === 'Escape' && modal?.style.display === 'flex') {
      ttCloseModal();
    }
  });
}

function ttDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function ttDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

async function ttDropImage(event, type) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');

  const file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) {
    showNotification?.('Drop an image file here', 'error');
    return;
  }

  await ttSetBrandingImage(type, file.path || '', file.name);
}

async function ttClickBrowse(type) {
  if (!isElectron) {
    document.getElementById(`tt-${type}-file`)?.click();
    return;
  }

  const filePath = await ipcRenderer.invoke('select-image');
  if (!filePath) return;

  const fileName = filePath.split(/[\\/]/).pop();
  await ttSetBrandingImage(type, filePath, fileName);
}

async function ttFileChosen(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;

  const path = file.path || URL.createObjectURL(file);
  await ttSetBrandingImage(type, path, file.name);
  event.target.value = '';
}

async function ttSetBrandingImage(type, imagePath, name) {
  if (!['profile', 'banner'].includes(type) || !imagePath) return;

  ttState.branding[type] = {
    path: imagePath,
    name: name || imagePath.split(/[\\/]/).pop(),
    updatedAt: Date.now()
  };

  ttRenderBranding();
  await ttSaveData();
  showNotification?.(`${type === 'profile' ? 'Profile' : 'Banner'} image saved`, 'success');
}

function ttRenderBranding() {
  ['profile', 'banner'].forEach(type => {
    const image = ttState.branding?.[type];
    const imgEl = document.getElementById(`tt-${type}-img`);
    const placeholder = document.getElementById(`tt-${type}-placeholder`);
    const noPreviewEl = document.getElementById(`tt-${type}-no-preview`);
    const footer = document.getElementById(`tt-${type}-footer`);
    const pathEl = document.getElementById(`tt-${type}-path`);

    if (image?.path) {
      const src = image.path.startsWith('blob:') || image.path.startsWith('data:') || image.path.startsWith('file:')
        ? image.path
        : `file://${image.path}`;
      if (imgEl) {
        imgEl.src = src;
        imgEl.style.display = ttState.noPreview ? 'none' : 'block';
      }
      if (noPreviewEl) noPreviewEl.style.display = ttState.noPreview ? 'flex' : 'none';
      if (placeholder) placeholder.style.display = 'none';
      if (footer) footer.style.display = 'flex';
      if (pathEl) {
        pathEl.textContent = image.name || image.path;
        pathEl.title = image.path;
      }
    } else {
      if (imgEl) {
        imgEl.src = '';
        imgEl.style.display = 'none';
      }
      if (noPreviewEl) noPreviewEl.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
      if (footer) footer.style.display = 'none';
      if (pathEl) {
        pathEl.textContent = '';
        pathEl.title = '';
      }
    }
  });
}

function ttToggleNoPreview() {
  ttState.noPreview = !ttState.noPreview;
  localStorage.setItem('tt-branding-no-preview', String(ttState.noPreview));
  ttUpdateNoPreviewButton();
  ttRenderBranding();
}

function ttUpdateNoPreviewButton() {
  const button = document.getElementById('tt-no-preview-btn');
  if (!button) return;
  button.classList.toggle('active', ttState.noPreview);
  button.setAttribute('aria-pressed', String(ttState.noPreview));
}

async function ttClearImage(type) {
  if (!['profile', 'banner'].includes(type)) return;
  ttState.branding[type] = null;
  ttRenderBranding();
  await ttSaveData();
}

function ttDragOutImage(event, type) {
  const image = ttState.branding?.[type];
  if (!image?.path) {
    event.preventDefault();
    return;
  }

  if (isElectron) {
    event.preventDefault();
    ipcRenderer.send('drag-files-start', [image.path]);
  } else {
    event.dataTransfer.setData('text/uri-list', image.path);
  }
}

function ttOpenModal(templateId = null) {
  const overlay = document.getElementById('tt-modal-overlay');
  const heading = document.getElementById('tt-modal-heading');
  const idInput = document.getElementById('tt-modal-edit-id');
  const titleInput = document.getElementById('tt-modal-title-input');
  const descInput = document.getElementById('tt-modal-desc-input');
  const tagsInput = document.getElementById('tt-modal-tags-input');
  const labelInput = document.getElementById('tt-modal-label-input');

  const template = templateId ? ttState.templates.find(item => item.id === templateId) : null;

  if (heading) heading.textContent = template ? 'Edit Template' : 'New Template';
  if (idInput) idInput.value = template?.id || '';
  if (titleInput) titleInput.value = template?.title || '';
  if (descInput) descInput.value = template?.description || '';
  if (tagsInput) tagsInput.value = (template?.tags || []).join(', ');
  if (labelInput) labelInput.value = template?.label || '';

  ttUpdateCharCounts();
  if (overlay) overlay.style.display = 'flex';
  setTimeout(() => titleInput?.focus(), 0);
}

function ttCloseModal() {
  const overlay = document.getElementById('tt-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function ttModalOverlayClick(event) {
  if (event.target?.id === 'tt-modal-overlay') ttCloseModal();
}

async function ttSaveTemplate() {
  const id = document.getElementById('tt-modal-edit-id')?.value || '';
  const title = document.getElementById('tt-modal-title-input')?.value.trim() || '';
  const description = document.getElementById('tt-modal-desc-input')?.value.trim() || '';
  const tags = (document.getElementById('tt-modal-tags-input')?.value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  const label = document.getElementById('tt-modal-label-input')?.value.trim() || 'Default';

  if (!title && !description && tags.length === 0) {
    showNotification?.('Add a title, description, or tags before saving', 'error');
    return;
  }

  if (id) {
    const index = ttState.templates.findIndex(item => item.id === id);
    if (index !== -1) {
      ttState.templates[index] = {
        ...ttState.templates[index],
        title,
        description,
        tags,
        label,
        updatedAt: Date.now()
      };
    }
  } else {
    ttState.templates.unshift({
      id: `title_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      tags,
      label,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  await ttSaveData();
  ttRenderTemplates();
  ttCloseModal();
  showNotification?.('Template saved', 'success');
}

async function ttDeleteTemplate(templateId) {
  const template = ttState.templates.find(item => item.id === templateId);
  if (!template) return;
  // confirm() blocked by Electron — delete executes directly (caller already intends to delete)

  ttState.templates = ttState.templates.filter(item => item.id !== templateId);
  await ttSaveData();
  ttRenderTemplates();
}

function ttRenderTemplates() {
  const grid = document.getElementById('tt-templates-grid');
  const empty = document.getElementById('tt-empty-state');
  if (!grid) return;

  const query = (document.getElementById('tt-search')?.value || '').trim().toLowerCase();
  const templates = query
    ? ttState.templates.filter(template => {
        const haystack = [
          template.title,
          template.description,
          template.label,
          ...(template.tags || [])
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      })
    : ttState.templates;

  grid.innerHTML = '';

  if (templates.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';

  templates.forEach(template => {
    const card = document.createElement('div');
    card.className = 'tt-card';
    const tags = (template.tags || []).slice(0, 10);

    card.innerHTML = `
      <div class="tt-card-header">
        <span class="tt-card-label-badge">${ttEscapeHtml(template.label || 'Default')}</span>
        <div class="tt-card-title">${ttEscapeHtml(template.title || 'Untitled template')}</div>
      </div>
      ${template.description ? `<div class="tt-card-desc">${ttEscapeHtml(template.description)}</div>` : ''}
      ${tags.length ? `<div class="tt-card-tags">${tags.map(tag => `<span class="tt-tag-chip">${ttEscapeHtml(tag)}</span>`).join('')}</div>` : ''}
      <div class="tt-card-actions">
        <button class="tt-card-btn tt-card-btn-amber" type="button" data-action="copy-title">Copy Title</button>
        <button class="tt-card-btn" type="button" data-action="copy-desc">Copy Desc</button>
        <button class="tt-card-btn" type="button" data-action="edit">Edit</button>
        <button class="tt-card-btn tt-card-btn-danger" type="button" data-action="delete">Delete</button>
      </div>
    `;

    card.querySelector('[data-action="copy-title"]')?.addEventListener('click', () => ttCopyText(template.title || '', card));
    card.querySelector('[data-action="copy-desc"]')?.addEventListener('click', () => ttCopyText(template.description || '', card));
    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => ttOpenModal(template.id));
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => ttDeleteTemplate(template.id));
    grid.appendChild(card);
  });
}

async function ttCopyText(text, card) {
  if (!text) return;
  await navigator.clipboard.writeText(text);
  card?.classList.add('tt-copy-flash');
  setTimeout(() => card?.classList.remove('tt-copy-flash'), 500);
  showNotification?.('Copied', 'success');
}

function ttUpdateCharCounts() {
  const titleInput = document.getElementById('tt-modal-title-input');
  const descInput = document.getElementById('tt-modal-desc-input');
  const titleCount = document.getElementById('tt-title-count');
  const descCount = document.getElementById('tt-desc-count');
  if (titleCount) titleCount.textContent = `${titleInput?.value.length || 0} / 100`;
  if (descCount) descCount.textContent = `${descInput?.value.length || 0} / 5000`;
}

function ttEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.initTitlesSection = initTitlesSection;
window.ttRenderTemplates = ttRenderTemplates;
window.ttDragOver = ttDragOver;
window.ttDragLeave = ttDragLeave;
window.ttDropImage = ttDropImage;
window.ttClickBrowse = ttClickBrowse;
window.ttFileChosen = ttFileChosen;
window.ttDragOutImage = ttDragOutImage;
window.ttClearImage = ttClearImage;
window.ttOpenModal = ttOpenModal;
window.ttCloseModal = ttCloseModal;
window.ttModalOverlayClick = ttModalOverlayClick;
window.ttSaveTemplate = ttSaveTemplate;
window.ttToggleNoPreview = ttToggleNoPreview;

setTimeout(() => {
  const section = document.getElementById('titles-section');
  if (section?.classList.contains('active')) initTitlesSection();
}, 0);
