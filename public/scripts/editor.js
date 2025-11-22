import { initPreview, checkPreviewAvailability, updatePreview, togglePreview } from './preview.js';
import { checkWarnings } from './warnings.js';
import { initCollaboration, joinProject, leaveProject, emitFileChange, emitFileCreated, emitFileDeleted, showInviteButton, setCurrentProjectId, showToast } from './collaboration.js';
import { initStarsObserver, fetchWithCSRF } from './utils.js';
import { initIntegration, setCurrentProject, setCurrentFile, setUserRole, getUserRole } from './integration.js';
import { initFileTree } from './file-tree.js';
import { initWhatsNew } from './components/whatsnew.js';
import { initUserMenu } from './components/user-menu.js';

let editor;
let currentProject = null;
let currentFile = null;
let openTabs = [];
let saveTimeout = null;
let isUpdatingFromRemote = false;
let fileTreeController = null;

function normalizePathInput(value) {
  if (typeof value !== 'string') {
    return null;
  }

  let normalized = value.replace(/\\+/g, '/').trim();
  normalized = normalized.replace(/\/+/g, '/');

  const segments = normalized
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0);

  if (segments.length === 0) {
    return null;
  }

  if (segments.some(segment => segment === '.' || segment === '..')) {
    return null;
  }

  return segments.join('/');
}

function getFileNameFromPath(path) {
  if (!path) {
    return null;
  }
  const parts = path.split('/');
  return parts[parts.length - 1] || null;
}

function normalizeFetchedFile(file) {
  if (!file) {
    return file;
  }

  const normalizedPath = normalizePathInput(file.path || file.name);
  const safePath = normalizedPath || file.name;
  const safeName = getFileNameFromPath(safePath) || file.name;

  return {
    ...file,
    path: safePath,
    name: safeName
  };
}

const state = {
  projects: [],
  files: [],
  theme: localStorage.getItem('theme') || 'dark',
  csrfToken: null,
  userId: null,
  username: null
};

window.editorState = state;

require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

window.MonacoEnvironment = {
  getWorkerUrl: function(workerId, label) {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = {
        baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/'
      };
      importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/base/worker/workerMain.js');
    `)}`;
  }
};

require(['vs/editor/editor.main'], function() {
  initEditor();
  init();
});

function initEditor() {
  editor = monaco.editor.create(document.getElementById('monacoEditor'), {
    value: '',
    language: 'javascript',
    theme: state.theme === 'dark' ? 'vs-dark' : 'vs',
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: true,
    renderWhitespace: 'selection',
    cursorBlinking: 'blink',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    padding: { top: 16 },
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    renderLineHighlight: 'all',
    scrollbar: {
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
  });

  let lastContentLength = 0;

  editor.onDidChangeModelContent(() => {
    if (currentFile && !isUpdatingFromRemote && editor) {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveFile();
        updatePreview();
        
        if (currentProject && editor) {
          const content = editor.getValue();
          const position = editor.getPosition();
          const isTyping = content.length > lastContentLength && content.length - lastContentLength <= 3;
          lastContentLength = content.length;
          emitFileChange(currentProject.id, currentFile.id, content, position, isTyping);
        }
      }, 1000);
    }
  });

  editor.onDidChangeCursorPosition((e) => {
    const cursorPositionEl = document.getElementById('cursorPosition');
    if (cursorPositionEl && e && e.position) {
      cursorPositionEl.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    }
  });
}

function updateFileInfoVisibility() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  const fileInfo = document.getElementById('fileInfo');
  
  if (welcomeScreen && fileInfo) {
    if (welcomeScreen.classList.contains('hidden')) {
      fileInfo.style.display = fileInfo.textContent ? '' : 'none';
    } else {
      fileInfo.style.display = 'none';
    }
  }
}

async function init() {
  fileTreeController = initFileTree({
    container: document.getElementById('filesTree'),
    onFileOpen: (fileId) => openFile(fileId),
    onDeleteFile: (fileId) => handleDeleteFileRequest(fileId),
    onDeleteFolder: (path, fileIds) => handleDeleteFolderRequest(path, fileIds),
    isReadOnly: () => !currentProject || getUserRole() === 'viewer'
  });
  window.updateFileTree = () => renderFiles();

  applyTheme();
  await loadUser();
  await loadProjects();
  initPreview();
  initWhatsNew();
  initUserMenu();
  setupCollaborationHandlers();
  initCollaboration();
  setupEventListeners();
  handleRouting();
  checkWarnings();
  
  if (window.initCustomSelects) {
    window.initCustomSelects();
  }
  
  const welcomeScreen = document.getElementById('welcomeScreen');
  if (welcomeScreen) {
    const observer = new MutationObserver(() => {
      updateFileInfoVisibility();
    });
    observer.observe(welcomeScreen, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    const fileInfoObserver = new MutationObserver(() => {
      updateFileInfoVisibility();
    });
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
      fileInfoObserver.observe(fileInfo, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
    
    updateFileInfoVisibility();
  }
  
  setTimeout(() => {
    initStarsObserver();
  }, 800);
  
  if (editor) {
    initIntegration(editor);
  }
  
  const editorEl = document.getElementById('monacoEditor');
  const previewPanel = document.getElementById('previewPanel');
  if (editorEl && (!previewPanel || !previewPanel.classList.contains('active'))) {
    editorEl.style.width = '100%';
    editorEl.classList.remove('split');
  }
  
  window.openFile = openFile;
}

async function loadUser() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const data = await response.json();
      const username = data.username;
      state.csrfToken = data.csrfToken;
      state.userId = data.userId;
      state.username = username;
      document.getElementById('username').textContent = username;
      
      const avatarEl = document.getElementById('userAvatar');
      if (data.avatar) {
        avatarEl.innerHTML = `<img src="${data.avatar}" alt="${username}">`;
      } else {
        const initials = username.substring(0, 2);
        avatarEl.textContent = initials;
      }
      
      updateWelcomeMessage(username);
    } else {
      window.location.href = '/auth';
    }
  } catch (err) {
    window.location.href = '/auth';
  }
}

function updateWelcomeMessage(username) {
  const titleEl = document.getElementById('welcomeTitle');
  
  titleEl.textContent = 'Welcome to code-editor';
  
  setTimeout(() => {
    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    
    if (hour >= 5 && hour < 12) {
      greeting = 'Good Morning';
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Good Afternoon';
    }
    
    const fullText = `${greeting}, ${username}!`;
    titleEl.textContent = '';
    titleEl.style.opacity = '0';
    
    setTimeout(() => {
      titleEl.style.opacity = '1';
      let index = 0;
      
      const typeWriter = () => {
        if (index < fullText.length) {
          titleEl.textContent += fullText.charAt(index);
          index++;
          setTimeout(typeWriter, 50);
        }
      };
      
      typeWriter();
    }, 100);
  }, 800);
}

async function loadProjects() {
  try {
    const response = await fetch('/api/projects');
    if (response.ok) {
      state.projects = await response.json();
      renderProjects();
    }
  } catch (err) {
    console.error('Failed to load projects');
  }
}

function renderProjects() {
  const container = document.getElementById('projectsList');
  
  if (state.projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" class="empty-icon">
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"/>
        </svg>
        <span>No projects yet</span>
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.projects.map(project => `
    <div class="project-item ${currentProject?.id === project.id ? 'active' : ''}" data-id="${project.id}">
      <span class="project-name">
        ${escapeHtml(project.name)}
        ${project.isShared ? '<span class="project-badge shared">Shared</span>' : ''}
      </span>
      <div class="project-actions">
        <button class="project-download" data-id="${project.id}" title="Download Project">
          <svg viewBox="0 0 24 24"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/></svg>
        </button>
        ${project.isOwner ? `<button class="project-delete" data-id="${project.id}" title="Delete Project">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>` : ''}
      </div>
    </div>
  `).join('');
  
  if (!container.hasAttribute('data-project-handler')) {
    container.setAttribute('data-project-handler', 'true');
    container.addEventListener('click', (e) => {
      const projectItem = e.target.closest('.project-item');
      if (projectItem) {
        const downloadBtn = e.target.closest('.project-download');
        const deleteBtn = e.target.closest('.project-delete');
        
        if (downloadBtn) {
          e.preventDefault();
          e.stopPropagation();
          const projectId = parseInt(downloadBtn.dataset.id);
          if (projectId && !isNaN(projectId)) {
            downloadProject(projectId);
          }
          return;
        }
        
        if (deleteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const projectId = parseInt(deleteBtn.dataset.id);
          if (projectId && !isNaN(projectId) && confirm('Delete this project?')) {
            deleteProject(projectId);
          }
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        const projectId = parseInt(projectItem.dataset.id);
        if (projectId && !isNaN(projectId)) {
          selectProject(projectId);
        }
      }
    });
  }
}

async function selectProject(projectId) {
  if (currentProject && currentProject.id === projectId) {
    return;
  }
  
  if (currentProject) {
    leaveProject(currentProject.id);
  }

  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  
  currentProject = project;
  window.editorState.currentProject = { id: projectId };
  renderProjects();
  await loadFiles(projectId);
  document.getElementById('newFile').disabled = false;
  document.getElementById('uploadFile').disabled = false;
  
  setCurrentProjectId(projectId);
  setCurrentProject(projectId);
  showInviteButton(project.isOwner);
  joinProject(projectId);
  
  const editorEl = document.getElementById('monacoEditor');
  const previewPanel = document.getElementById('previewPanel');
  if (editorEl && (!previewPanel || !previewPanel.classList.contains('active'))) {
    editorEl.style.width = '100%';
    editorEl.classList.remove('split');
  }
  
  if (state.userId) {
    setUserRole(projectId, state.userId);
  }
  
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) {
    const mobileSidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileSidebar) {
      mobileSidebar.classList.remove('active');
      mobileSidebar.classList.remove('collapsed');
    }
    if (mobileOverlay) {
      mobileOverlay.classList.remove('active');
    }
  }
  
  updateURL();
}

async function loadFiles(projectId) {
  try {
    const response = await fetch(`/api/files/${projectId}`);
    if (response.ok) {
      const files = await response.json();
      
      const filesWithContent = await Promise.all(
        files.map(async (file) => {
          const normalizedFile = normalizeFetchedFile(file);
          
          try {
            const contentResponse = await fetch(`/api/files/${projectId}/${file.id}/content`);
            if (contentResponse.ok) {
              const { content } = await contentResponse.json();
              return { ...normalizedFile, content };
            }
          } catch (err) {
            console.error(`Failed to load content for file ${file.id}`);
          }
          
          return { ...normalizedFile, content: '' };
        })
      );
      
      state.files = filesWithContent
        .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));

      window.editorState.files = state.files;

      if (currentFile) {
        const updatedCurrent = state.files.find(f => f.id === currentFile.id);
        if (updatedCurrent) {
          currentFile = updatedCurrent;
        } else {
          currentFile = null;
        }
      }

      openTabs = openTabs
        .map(tab => state.files.find(f => f.id === tab.id))
        .filter(Boolean);

      renderFiles();
      renderTabs();
      checkPreviewAvailability(state.files);
    }
  } catch (err) {
    console.error('Failed to load files');
  }
}

function renderFiles() {
  if (!fileTreeController) {
    return;
  }

  fileTreeController.update(state.files, currentFile?.id || null);
}

async function handleDeleteFileRequest(fileId) {
  if (!currentProject) return;
  const file = state.files.find(f => f.id === fileId);
  if (!file) return;

  const confirmed = confirm(`Delete file "${file.path}"?`);
  if (!confirmed) return;

  const success = await performDeleteFile(fileId);
  if (success) {
    await loadFiles(currentProject.id);
    showToast(`File "${file.path}" deleted`, 'success');
  }
}

async function handleDeleteFolderRequest(path, fileIds = []) {
  if (!currentProject) return;
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return;
  }

  const folderLabel = path;
  const idsToDelete = Array.from(new Set(fileIds));

  if (idsToDelete.length === 0) {
    return;
  }

  const fileWord = idsToDelete.length === 1 ? 'file' : 'files';
  const confirmed = confirm(`Delete folder "${folderLabel}" and ${idsToDelete.length} ${fileWord}?`);
  if (!confirmed) return;

  const deleted = [];

  for (const fileId of idsToDelete) {
    const success = await performDeleteFile(fileId, true);
    if (success) {
      deleted.push(fileId);
    }
  }

  if (deleted.length === 0) {
    showToast(`Failed to delete folder "${folderLabel}"`, 'error');
    return;
  }

  await loadFiles(currentProject.id);

  if (deleted.length === idsToDelete.length) {
    showToast(`Folder "${folderLabel}" deleted (${deleted.length} ${fileWord})`, 'success');
  } else {
    showToast(`Folder "${folderLabel}" partially deleted (${deleted.length} of ${idsToDelete.length} ${fileWord})`, 'info');
  }
}

function openFile(fileId) {
  const file = state.files.find(f => f.id === fileId);
  if (!file) return;
  
  if (!editor) {
    console.warn('Editor not initialized yet, waiting...');
    setTimeout(() => openFile(fileId), 100);
    return;
  }
  
  currentFile = file;
  setCurrentFile(fileId);
  
  if (!openTabs.find(t => t.id === fileId)) {
    openTabs.push(file);
    renderTabs();
  }
  
  const editorEl = document.getElementById('monacoEditor');
  const previewPanel = document.getElementById('previewPanel');
  if (editorEl && (!previewPanel || !previewPanel.classList.contains('active'))) {
    editorEl.style.width = '100%';
    editorEl.classList.remove('split');
  }
  
  const ext = file.name.split('.').pop().toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi'];
  const audioExts = ['mp3', 'wav', 'ogg'];
  
  if (imageExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext)) {
    showMediaViewer(file, ext, imageExts, videoExts, audioExts);
  } else {
    hideMediaViewer();
    
    if (!editor) {
      console.error('Editor not initialized');
      return;
    }
    
    editor.setValue(file.content || '');
    const language = detectLanguage(file.name);
    monaco.editor.setModelLanguage(editor.getModel(), language);
    
    const editorEl = document.getElementById('monacoEditor');
    editorEl.classList.add('active');
    
    const previewPanel = document.getElementById('previewPanel');
    if (!previewPanel || !previewPanel.classList.contains('active')) {
      editorEl.style.width = '100%';
      editorEl.classList.remove('split');
    }
  }
  
  document.getElementById('welcomeScreen').classList.add('hidden');
  const fileInfoEl = document.getElementById('fileInfo');
  if (fileInfoEl) {
    fileInfoEl.textContent = file.path;
    fileInfoEl.title = file.path;
  }
  updateFileInfoVisibility();
  const language = detectLanguage(file.name);
  document.getElementById('fileLanguage').textContent = languageNames[language] || language;
  
  renderFiles();
  renderTabs();
  updateURL();
}

function showMediaViewer(file, ext, imageExts, videoExts, audioExts) {
  document.getElementById('monacoEditor').classList.remove('active');
  
  let mediaViewer = document.getElementById('mediaViewer');
  if (!mediaViewer) {
    mediaViewer = document.createElement('div');
    mediaViewer.id = 'mediaViewer';
    mediaViewer.className = 'media-viewer';
    document.querySelector('.editor-container').appendChild(mediaViewer);
  }
  
  mediaViewer.classList.add('active');
  
  const showError = () => {
    mediaViewer.innerHTML = `
      <div class="media-error">
        <svg viewBox="0 0 24 24" class="media-error-icon">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <div class="media-error-title">File corrupted or invalid</div>
        <div class="media-error-message">The file "${escapeHtml(file.name)}" cannot be displayed. It may be corrupted or in an unsupported format.</div>
      </div>
    `;
  };
  
  if (imageExts.includes(ext)) {
    const img = document.createElement('img');
    img.src = file.content;
    img.alt = file.name;
    img.className = 'media-content';
    img.onerror = showError;
    mediaViewer.innerHTML = '';
    mediaViewer.appendChild(img);
  } else if (videoExts.includes(ext)) {
    const video = document.createElement('video');
    video.src = file.content;
    video.controls = true;
    video.className = 'media-content';
    video.onerror = showError;
    mediaViewer.innerHTML = '';
    mediaViewer.appendChild(video);
  } else if (audioExts.includes(ext)) {
    const audioContainer = document.createElement('div');
    audioContainer.className = 'audio-player';
    audioContainer.innerHTML = `
      <div class="audio-info">
        <svg viewBox="0 0 24 24" class="audio-icon">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <span>${escapeHtml(file.name)}</span>
      </div>
      <audio src="${file.content}" controls class="audio-control"></audio>
    `;
    const audio = audioContainer.querySelector('audio');
    audio.onerror = showError;
    mediaViewer.innerHTML = '';
    mediaViewer.appendChild(audioContainer);
  }
}

function hideMediaViewer() {
  const mediaViewer = document.getElementById('mediaViewer');
  if (mediaViewer) {
    mediaViewer.classList.remove('active');
  }
}

function renderTabs() {
  const container = document.getElementById('tabsBar');
  
  container.innerHTML = openTabs.map(tab => `
    <button class="tab-item ${currentFile?.id === tab.id ? 'active' : ''}" data-id="${tab.id}" title="${escapeHtml(tab.path)}">
      ${escapeHtml(tab.name)}
      <span class="tab-close" data-id="${tab.id}">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </span>
    </button>
  `).join('');
  
  container.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close')) {
        openFile(parseInt(item.dataset.id));
      }
    });
  });
  
  container.querySelectorAll('.tab-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(parseInt(btn.dataset.id));
    });
  });
}

function closeTab(fileId) {
  const index = openTabs.findIndex(t => t.id === fileId);
  if (index === -1) return;
  
  openTabs.splice(index, 1);
  
  if (currentFile?.id === fileId) {
    if (openTabs.length > 0) {
      openFile(openTabs[Math.max(0, index - 1)].id);
    } else {
      currentFile = null;
      document.getElementById('monacoEditor').classList.remove('active');
      document.getElementById('welcomeScreen').classList.remove('hidden');
      const fileInfoEl = document.getElementById('fileInfo');
      if (fileInfoEl) {
        fileInfoEl.textContent = '';
        fileInfoEl.removeAttribute('title');
      }
      updateFileInfoVisibility();
      updateURL();
    }
  }
  
  renderTabs();
}

async function saveFile() {
  if (!currentFile || !currentProject || !editor) return;
  
  const content = editor.getValue();
  
  try {
    await fetchWithCSRF(`/api/files/${currentProject.id}/${currentFile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    currentFile.content = content;
  } catch (err) {
    console.error('Failed to save file');
  }
}

async function downloadProject(projectId) {
  try {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    const filesResponse = await fetch(`/api/files/${projectId}`);
    if (!filesResponse.ok) {
      alert('Failed to load project files');
      return;
    }

    const files = await filesResponse.json();
    if (files.length === 0) {
      alert('Project has no files to download');
      return;
    }

    const JSZip = window.JSZip;
    if (!JSZip) {
      alert('Download functionality is not available');
      return;
    }

    const zip = new JSZip();
    const projectFolder = zip.folder(project.name);

    for (const file of files) {
      const safePath = normalizePathInput(file.path || file.name) || file.name;
      
      let content = '';
      try {
        const contentResponse = await fetch(`/api/files/${projectId}/${file.id}/content`);
        if (contentResponse.ok) {
          const data = await contentResponse.json();
          content = data.content || '';
        }
      } catch (err) {
        console.error(`Failed to load content for file ${file.name}:`, err);
      }

      if (file.is_media === 1 || file.is_media === true) {
        if (content && content.startsWith('data:')) {
          const base64Data = content.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          projectFolder.file(safePath, bytes, { binary: true });
        } else {
          projectFolder.file(safePath, content, { binary: true });
        }
      } else {
        projectFolder.file(safePath, content);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download project', err);
    alert('Failed to download project');
  }
}

async function deleteProject(projectId) {
  try {
    const response = await fetchWithCSRF(`/api/projects/${projectId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      if (currentProject?.id === projectId) {
        leaveProject(currentProject.id);
        
        currentProject = null;
        state.files = [];
        openTabs = [];
        currentFile = null;
        
        window.editorState.files = [];
        window.editorState.projects = state.projects.filter(p => p.id !== projectId);
        
        if (editor) {
          editor.setValue('');
        }
        
        hideMediaViewer();
        
        renderFiles();
        renderTabs();
        
        document.getElementById('monacoEditor').classList.remove('active');
        document.getElementById('welcomeScreen').classList.remove('hidden');
        document.getElementById('newFile').disabled = true;
        document.getElementById('uploadFile').disabled = true;
        const fileInfoEl = document.getElementById('fileInfo');
        if (fileInfoEl) {
          fileInfoEl.textContent = '';
          fileInfoEl.removeAttribute('title');
        }
        document.getElementById('fileLanguage').textContent = 'Plain Text';
        
        updateFileInfoVisibility();
        updateURL();
      }
      await loadProjects();
    }
  } catch (err) {
    console.error('Failed to delete project');
  }
}

async function performDeleteFile(fileId, suppressErrorToast = false) {
  if (!currentProject) return false;
  
  try {
    const response = await fetchWithCSRF(`/api/files/${currentProject.id}/${fileId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      closeTab(fileId);
      emitFileDeleted(currentProject.id, fileId);
      return true;
    }
    
    if (!suppressErrorToast) {
      showToast('Failed to delete file', 'error');
    }
  } catch (err) {
    console.error('Failed to delete file');
    if (!suppressErrorToast) {
      showToast('Failed to delete file', 'error');
    }
  }
  
  return false;
}

function updateURL() {
  let url = '/editor';
  
  if (currentProject) {
    const project = state.projects.find(p => p.id === currentProject.id);
    
    if (project && (project.owner_username || project.isOwner)) {
      const username = project.owner_username || state.username;
      if (username && project.name) {
        url = `/@${username}/${encodeURIComponent(project.name)}`;
        
        if (currentFile && currentFile.path) {
          url += `/${encodeURIComponent(currentFile.path)}`;
        }
      } else {
        url += `?projectId=${currentProject.id}`;
        if (currentFile) {
          url += `&filePath=${encodeURIComponent(currentFile.path)}`;
        }
      }
    } else {
      url += `?projectId=${currentProject.id}`;
      if (currentFile) {
        url += `&filePath=${encodeURIComponent(currentFile.path)}`;
      }
    }
  }
  
  window.history.replaceState({}, '', url);
}

async function handleRouting() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId') || params.get('project');
  const fileId = params.get('file');
  const filePath = params.get('filePath');
  
  if (projectId) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const project = state.projects.find(p => p.id === parseInt(projectId));
    if (project) {
      await selectProject(parseInt(projectId));
      
      if (fileId) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const file = state.files.find(f => f.id === parseInt(fileId));
        if (file) {
          openFile(parseInt(fileId));
        }
      } else if (filePath) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const normalizedPath = filePath.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
        const file = state.files.find(f => f.path === normalizedPath || f.path === filePath);
        if (file) {
          openFile(file.id);
        }
      }
    }
  }
}

function setupEventListeners() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileSidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (mobileSidebar && mobileOverlay) {
        const isActive = mobileSidebar.classList.contains('active');
        
        if (isActive) {
          mobileSidebar.classList.remove('active');
          mobileOverlay.classList.remove('active');
        } else {
          mobileSidebar.classList.add('active');
          mobileOverlay.classList.add('active');
        }
      }
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => {
      if (mobileSidebar) {
        mobileSidebar.classList.remove('active');
        mobileSidebar.classList.remove('collapsed');
      }
      mobileOverlay.classList.remove('active');
    });
  }

  document.querySelector('.sidebar-branding').addEventListener('click', () => {
    window.location.href = '/editor';
  });

  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        sidebar.classList.remove('active');
        document.getElementById('mobileOverlay').classList.remove('active');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }


  document.getElementById('uploadFile').addEventListener('click', () => {
    document.getElementById('fileUploadInput').click();
  });

  document.getElementById('fileUploadInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !currentProject) return;

    const maxSize = 50 * 1024 * 1024;
    const rejectedFiles = [];
    const validFiles = [];

    files.forEach(file => {
      if (file.size > maxSize) {
        rejectedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (rejectedFiles.length > 0) {
      alert(`Files exceeding 50MB limit:\n${rejectedFiles.join('\n')}`);
    }

    for (const file of validFiles) {
      const ext = file.name.split('.').pop().toLowerCase();
      const mediaExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'mp4', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg'];
      
      if (mediaExts.includes(ext)) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target.result;
          const language = detectLanguage(file.name);

          try {
            const response = await fetchWithCSRF(`/api/files/${currentProject.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: file.name,
                path: file.name,
                content,
                language,
                isMedia: true
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              alert(error.error || 'Failed to upload file');
            } else {
              await loadFiles(currentProject.id);
            }
          } catch (err) {
            console.error('Failed to upload file:', file.name);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target.result;
          const language = detectLanguage(file.name);

          try {
            const response = await fetchWithCSRF(`/api/files/${currentProject.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: file.name,
                path: file.name,
                content,
                language,
                isMedia: false
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              alert(error.error || 'Failed to upload file');
            } else {
              await loadFiles(currentProject.id);
            }
          } catch (err) {
            console.error('Failed to upload file:', file.name);
          }
        };
        reader.readAsText(file);
      }
    }

    setTimeout(() => loadFiles(currentProject.id), 500);
    e.target.value = '';
  });
  
  document.getElementById('newProject').addEventListener('click', () => {
    document.getElementById('projectModal').classList.add('active');
    document.getElementById('projectName').focus();
  });
  
  document.getElementById('cancelProject').addEventListener('click', () => {
    const modal = document.getElementById('projectModal');
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing');
      document.getElementById('projectName').value = '';
    }, 300);
  });
  
  document.getElementById('createProject').addEventListener('click', async () => {
    const name = document.getElementById('projectName').value.trim();
    if (!name) return;
    
    try {
      const response = await fetchWithCSRF('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (response.ok) {
        document.getElementById('projectModal').classList.remove('active');
        document.getElementById('projectName').value = '';
        await loadProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Failed to create project');
    }
  });
  
  document.getElementById('newFile').addEventListener('click', () => {
    if (!currentProject) return;
    document.getElementById('fileModal').classList.add('active');
    document.getElementById('fileName').focus();
  });
  
  document.getElementById('cancelFile').addEventListener('click', () => {
    const modal = document.getElementById('fileModal');
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing');
      document.getElementById('fileName').value = '';
    }, 300);
  });
  
  document.getElementById('createFile').addEventListener('click', async () => {
    if (!currentProject) return;
    
    const inputValue = document.getElementById('fileName').value.trim();
    const normalizedPath = normalizePathInput(inputValue);
    if (!normalizedPath) {
      showToast('Invalid file path', 'error');
      return;
    }
    
    const fileName = getFileNameFromPath(normalizedPath);
    const language = detectLanguage(fileName);
    
    try {
      const response = await fetchWithCSRF(`/api/files/${currentProject.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: fileName, 
          path: normalizedPath,
          content: '',
          language 
        })
      });
      
      if (response.ok) {
        const file = await response.json();
        document.getElementById('fileModal').classList.remove('active');
        document.getElementById('fileName').value = '';
        await loadFiles(currentProject.id);
        
        emitFileCreated(currentProject.id, file);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create file');
      }
    } catch (err) {
      console.error('Failed to create file');
    }
  });
  
  document.getElementById('logout').addEventListener('click', async () => {
    try {
      await fetchWithCSRF('/api/auth/logout', { method: 'POST' });
      window.location.href = '/auth';
    } catch (err) {
      window.location.href = '/auth';
    }
  });
  
  document.getElementById('themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    applyTheme();
  });
  
  document.getElementById('projectName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('createProject').click();
    }
  });
  
  document.getElementById('fileName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('createFile').click();
    }
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentFile) {
        saveFile();
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      if (currentProject) {
        document.getElementById('newFile').click();
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (editor && currentFile) {
        editor.trigger('', 'actions.find');
      }
    }
  });
}

function applyTheme() {
  if (state.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (editor) {
      monaco.editor.setTheme('vs');
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (editor) {
      monaco.editor.setTheme('vs-dark');
    }
  }
}

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    jsonc: 'json',
    xml: 'xml',
    svg: 'xml',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    pyw: 'python',
    rb: 'ruby',
    php: 'php',
    java: 'java',
    kt: 'kotlin',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    bat: 'bat',
    cmd: 'bat',
    ps1: 'powershell',
    psm1: 'powershell',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    conf: 'ini',
    cfg: 'ini',
    txt: 'plaintext',
    log: 'plaintext',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    vue: 'html',
    svelte: 'html',
    dart: 'dart',
    swift: 'swift',
    r: 'r',
    lua: 'lua',
    perl: 'perl',
    pl: 'perl'
  };
  
  return languageMap[ext] || 'plaintext';
}

const languageNames = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  json: 'JSON',
  xml: 'XML',
  markdown: 'Markdown',
  python: 'Python',
  ruby: 'Ruby',
  php: 'PHP',
  java: 'Java',
  kotlin: 'Kotlin',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  sql: 'SQL',
  shell: 'Shell',
  bat: 'Batch',
  powershell: 'PowerShell',
  yaml: 'YAML',
  toml: 'TOML',
  ini: 'INI',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  dart: 'Dart',
  swift: 'Swift',
  r: 'R',
  lua: 'Lua',
  perl: 'Perl',
  plaintext: 'Plain Text'
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupCollaborationHandlers() {
  let typingAnimation = null;

  window.onFileUpdatedByOther = (fileId, content, username, isTyping) => {
    if (!editor) return;
    
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;
    
    const oldContent = file.content;
    file.content = content;
    
    if (currentFile && currentFile.id === fileId) {
      isUpdatingFromRemote = true;
      
      if (isTyping && content.length > oldContent.length) {
        if (typingAnimation) clearTimeout(typingAnimation);
        
        const diff = content.length - oldContent.length;
        const added = content.slice(oldContent.length);
        let currentContent = oldContent;
        let charIndex = 0;
        
        const typeChar = () => {
          if (!editor || charIndex >= added.length) {
            isUpdatingFromRemote = false;
            return;
          }
          currentContent += added[charIndex];
          const position = editor.getPosition();
          editor.setValue(currentContent);
          editor.setPosition(position);
          charIndex++;
          typingAnimation = setTimeout(typeChar, 30);
        };
        
        typeChar();
      } else {
        if (editor) {
          const position = editor.getPosition();
          editor.setValue(content);
          editor.setPosition(position);
        }
        setTimeout(() => {
          isUpdatingFromRemote = false;
        }, 100);
      }
    }
  };

  window.onFileAddedByOther = async (file, username) => {
    await loadFiles(currentProject.id);
  };

  window.onFileRemovedByOther = async (fileId, username) => {
    if (currentFile && currentFile.id === fileId) {
      closeTab(fileId);
    }
    await loadFiles(currentProject.id);
  };

  window.onCollaboratorsUpdate = (collaborators) => {
  };

  window.reloadProjects = async () => {
    await loadProjects();
  };

  window.clearEditor = () => {
    currentProject = null;
    currentFile = null;
    openTabs = [];
    state.files = [];
    renderProjects();
    renderFiles();
    renderTabs();
    document.getElementById('monacoEditor').classList.remove('active');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    const fileInfoEl = document.getElementById('fileInfo');
    if (fileInfoEl) {
      fileInfoEl.textContent = '';
      fileInfoEl.removeAttribute('title');
    }
    updateFileInfoVisibility();
    document.getElementById('newFile').disabled = true;
    document.getElementById('uploadFile').disabled = true;
    hideMediaViewer();
    const params = new URLSearchParams(window.location.search);
    params.delete('project');
    params.delete('file');
    window.history.replaceState({}, '', '/editor');
  };
}
