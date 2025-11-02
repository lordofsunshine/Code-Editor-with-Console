import { initHotkeys, registerHotkey } from './hotkeys.js';
import { initSearch, setSearchProjectId } from './search.js';
import { initSettings, showSettings } from './settings.js';
import { showToast } from './collaboration.js';
import { fetchWithCSRF } from './utils.js';

let currentProjectId = null;
let currentFileId = null;
let editorInstance = null;
let userRole = null;

export function initIntegration(editor) {
  editorInstance = editor;
  initHotkeys();
  initSearch();
  initSettings(editor);
  setupHotkeys();
  setupSettingsButton();
  
  window.showToast = showToast;
  window.showMessage = showToast;
  window.openFileById = openFileById;
}

function setupHotkeys() {
  registerHotkey('ctrl+s', (e) => {
    e.preventDefault();
    if (currentFileId && userRole !== 'viewer') {
      saveCurrentFile();
    } else if (userRole === 'viewer') {
      showToast('Viewers cannot save files', 'error');
    }
  });

  registerHotkey('ctrl+n', (e) => {
    e.preventDefault();
    if (currentProjectId && userRole !== 'viewer') {
      const newFileBtn = document.getElementById('newFile');
      if (!newFileBtn.disabled) {
        newFileBtn.click();
      }
    } else if (userRole === 'viewer') {
      showToast('Viewers cannot create files', 'error');
    } else {
      showToast('Please select a project first', 'error');
    }
  });

  registerHotkey('meta+s', (e) => {
    e.preventDefault();
    if (currentFileId && userRole !== 'viewer') {
      saveCurrentFile();
    } else if (userRole === 'viewer') {
      showToast('Viewers cannot save files', 'error');
    }
  });

  registerHotkey('meta+n', (e) => {
    e.preventDefault();
    if (currentProjectId && userRole !== 'viewer') {
      const newFileBtn = document.getElementById('newFile');
      if (!newFileBtn.disabled) {
        newFileBtn.click();
      }
    } else if (userRole === 'viewer') {
      showToast('Viewers cannot create files', 'error');
    } else {
      showToast('Please select a project first', 'error');
    }
  });
}

function setupSettingsButton() {
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      showSettings();
    });
  }
}

async function saveCurrentFile() {
  if (!currentFileId || !currentProjectId) return;
  
  const content = editorInstance.getValue();
  
  try {
    const response = await fetchWithCSRF(`/api/files/${currentProjectId}/${currentFileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (response.ok) {
      showToast('File saved successfully', 'success');
      if (window.emitFileChangeSilent) {
        window.emitFileChangeSilent(currentFileId, content);
      }
    } else {
      const error = await response.json();
      showToast(error.error || 'Failed to save file', 'error');
    }
  } catch (err) {
    showToast('Failed to save file', 'error');
  }
}

function openFileById(fileId) {
  if (window.openFile) {
    window.openFile(fileId);
  }
}

export function setCurrentProject(projectId) {
  currentProjectId = projectId;
  setSearchProjectId(projectId);
}

export function setCurrentFile(fileId) {
  currentFileId = fileId;
}

export async function setUserRole(projectId, userId) {
  try {
    const response = await fetch(`/api/projects/${projectId}/role/${userId}`);
    if (response.ok) {
      const data = await response.json();
      userRole = data.role;
      updateUIBasedOnRole();
    }
  } catch (err) {
    console.error('Failed to get user role');
  }
}

function updateUIBasedOnRole() {
  const isReadOnly = userRole === 'viewer';
  
  if (editorInstance) {
    editorInstance.updateOptions({
      readOnly: isReadOnly
    });
  }
  
  const newFileBtn = document.getElementById('newFile');
  const uploadFileBtn = document.getElementById('uploadFile');
  
  if (isReadOnly) {
    if (newFileBtn) newFileBtn.title = 'Viewers cannot create files';
    if (uploadFileBtn) uploadFileBtn.title = 'Viewers cannot upload files';
  } else {
    if (newFileBtn) newFileBtn.title = 'New File';
    if (uploadFileBtn) uploadFileBtn.title = 'Upload File';
  }
}

export function getUserRole() {
  return userRole;
}

