import { getCookie, fetchWithCSRF } from './utils.js';

let settingsModal = null;
let currentSettings = {};
let editorInstance = null;

const DEFAULT_SETTINGS = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  cursorBlinking: 'blink',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  lineNumbers: 'on',
  folding: true,
  renderLineHighlight: 'all',
  lineHeight: 20,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'on',
  cursorStyle: 'line',
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  formatOnPaste: true,
  formatOnType: false,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  quickSuggestions: { other: true, comments: false, strings: false },
  snippetSuggestions: 'inline',
  foldingStrategy: 'auto',
  showFoldingControls: 'mouseover',
  matchBrackets: 'always',
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    useShadows: false,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10
  },
  find: {
    seedSearchStringFromSelection: 'always',
    autoFindInSelection: 'never'
  }
};

export function initSettings(editor) {
  editorInstance = editor;
  createSettingsModal();
  loadSettings();
}

async function loadSettings() {
  try {
    const response = await fetch('/api/settings/', {
      method: 'GET',
      credentials: 'include'
    });
    if (response.ok) {
      const settings = await response.json();
      currentSettings = Object.keys(settings).length > 0 ? settings : { ...DEFAULT_SETTINGS };
    } else {
      currentSettings = { ...DEFAULT_SETTINGS };
    }
    applySettings();
  } catch (err) {
    currentSettings = { ...DEFAULT_SETTINGS };
    applySettings();
  }
}

function createSettingsModal() {
  settingsModal = document.createElement('div');
  settingsModal.className = 'settings-modal';
  settingsModal.innerHTML = `
    <div class="settings-content">
      <div class="settings-header">
        <h3>Editor Settings</h3>
        <button class="settings-close" aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="settings-body">
        <div class="settings-section">
          <h4>Display</h4>
          <div class="settings-group">
            <label>
              <span>Font Size</span>
              <input type="number" name="fontSize" min="8" max="72" value="14">
            </label>
            <label>
              <span>Font Family</span>
              <input type="text" name="fontFamily" value='Menlo, Monaco, "Courier New", monospace'>
            </label>
            <label>
              <span>Line Height</span>
              <input type="number" name="lineHeight" min="0" max="100" value="20">
            </label>
            <label>
              <span>Tab Size</span>
              <input type="number" name="tabSize" min="1" max="8" value="2">
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>Editor Behavior</h4>
          <div class="settings-group">
            <label class="settings-checkbox">
              <input type="checkbox" name="insertSpaces" checked>
              <span>Insert Spaces</span>
            </label>
            <label>
              <span>Word Wrap</span>
              <select name="wordWrap">
                <option value="off">Off</option>
                <option value="on" selected>On</option>
                <option value="wordWrapColumn">Word Wrap Column</option>
                <option value="bounded">Bounded</option>
              </select>
            </label>
            <label class="settings-checkbox">
              <input type="checkbox" name="scrollBeyondLastLine">
              <span>Scroll Beyond Last Line</span>
            </label>
            <label class="settings-checkbox">
              <input type="checkbox" name="smoothScrolling" checked>
              <span>Smooth Scrolling</span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>Cursor</h4>
          <div class="settings-group">
            <label>
              <span>Cursor Style</span>
              <select name="cursorStyle">
                <option value="line" selected>Line</option>
                <option value="block">Block</option>
                <option value="underline">Underline</option>
                <option value="line-thin">Line Thin</option>
                <option value="block-outline">Block Outline</option>
                <option value="underline-thin">Underline Thin</option>
              </select>
            </label>
            <label>
              <span>Cursor Blinking</span>
              <select name="cursorBlinking">
                <option value="blink" selected>Blink</option>
                <option value="smooth">Smooth</option>
                <option value="phase">Phase</option>
                <option value="expand">Expand</option>
                <option value="solid">Solid</option>
              </select>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>Display Options</h4>
          <div class="settings-group">
            <label>
              <span>Line Numbers</span>
              <select name="lineNumbers">
                <option value="on" selected>On</option>
                <option value="off">Off</option>
                <option value="relative">Relative</option>
                <option value="interval">Interval</option>
              </select>
            </label>
            <label>
              <span>Render Whitespace</span>
              <select name="renderWhitespace">
                <option value="none">None</option>
                <option value="boundary">Boundary</option>
                <option value="selection" selected>Selection</option>
                <option value="all">All</option>
              </select>
            </label>
            <label>
              <span>Render Line Highlight</span>
              <select name="renderLineHighlight">
                <option value="none">None</option>
                <option value="gutter">Gutter</option>
                <option value="line">Line</option>
                <option value="all" selected>All</option>
              </select>
            </label>
            <label class="settings-checkbox">
              <input type="checkbox" name="minimap.enabled">
              <span>Show Minimap</span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>Code Editing</h4>
          <div class="settings-group">
            <label>
              <span>Auto Closing Brackets</span>
              <select name="autoClosingBrackets">
                <option value="always" selected>Always</option>
                <option value="languageDefined">Language Defined</option>
                <option value="beforeWhitespace">Before Whitespace</option>
                <option value="never">Never</option>
              </select>
            </label>
            <label>
              <span>Auto Closing Quotes</span>
              <select name="autoClosingQuotes">
                <option value="always" selected>Always</option>
                <option value="languageDefined">Language Defined</option>
                <option value="beforeWhitespace">Before Whitespace</option>
                <option value="never">Never</option>
              </select>
            </label>
            <label class="settings-checkbox">
              <input type="checkbox" name="formatOnPaste" checked>
              <span>Format On Paste</span>
            </label>
            <label class="settings-checkbox">
              <input type="checkbox" name="formatOnType">
              <span>Format On Type</span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>Suggestions</h4>
          <div class="settings-group">
            <label class="settings-checkbox">
              <input type="checkbox" name="suggestOnTriggerCharacters" checked>
              <span>Suggest On Trigger Characters</span>
            </label>
            <label>
              <span>Accept Suggestion On Enter</span>
              <select name="acceptSuggestionOnEnter">
                <option value="on" selected>On</option>
                <option value="smart">Smart</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label>
              <span>Snippet Suggestions</span>
              <select name="snippetSuggestions">
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="inline" selected>Inline</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>Folding</h4>
          <div class="settings-group">
            <label class="settings-checkbox">
              <input type="checkbox" name="folding" checked>
              <span>Enable Folding</span>
            </label>
            <label>
              <span>Folding Strategy</span>
              <select name="foldingStrategy">
                <option value="auto" selected>Auto</option>
                <option value="indentation">Indentation</option>
              </select>
            </label>
            <label>
              <span>Show Folding Controls</span>
              <select name="showFoldingControls">
                <option value="always">Always</option>
                <option value="mouseover" selected>Mouse Over</option>
              </select>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>Other</h4>
          <div class="settings-group">
            <label>
              <span>Match Brackets</span>
              <select name="matchBrackets">
                <option value="never">Never</option>
                <option value="near">Near</option>
                <option value="always" selected>Always</option>
              </select>
            </label>
          </div>
        </div>
      </div>
      <div class="settings-footer">
        <button class="btn-settings btn-reset">Reset to Default</button>
        <div class="settings-actions">
          <button class="btn-settings btn-cancel">Cancel</button>
          <button class="btn-settings btn-save">Save</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(settingsModal);

  setupSettingsEventListeners();
}

function setupSettingsEventListeners() {
  const closeBtn = settingsModal.querySelector('.settings-close');
  const cancelBtn = settingsModal.querySelector('.btn-cancel');
  const saveBtn = settingsModal.querySelector('.btn-save');
  const resetBtn = settingsModal.querySelector('.btn-reset');

  closeBtn.addEventListener('click', hideSettings);
  cancelBtn.addEventListener('click', hideSettings);
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) hideSettings();
  });
}

export function showSettings() {
  populateSettings();
  settingsModal.classList.add('active');
}

export function hideSettings() {
  settingsModal.classList.remove('active');
}

function populateSettings() {
  const inputs = settingsModal.querySelectorAll('input[type="text"], input[type="number"], select');
  inputs.forEach(input => {
    const name = input.name;
    const value = getNestedValue(currentSettings, name);
    if (value !== undefined) {
      input.value = value;
    }
  });

  const checkboxes = settingsModal.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const name = checkbox.name;
    const value = getNestedValue(currentSettings, name);
    if (value !== undefined) {
      checkbox.checked = value;
    }
  });
}

async function saveSettings() {
  const newSettings = {};
  
  const inputs = settingsModal.querySelectorAll('input[type="text"], input[type="number"], select');
  inputs.forEach(input => {
    const name = input.name;
    let value = input.value;
    if (input.type === 'number') {
      value = parseInt(value);
    }
    setNestedValue(newSettings, name, value);
  });

  const checkboxes = settingsModal.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const name = checkbox.name;
    setNestedValue(newSettings, name, checkbox.checked);
  });

  newSettings.quickSuggestions = { other: true, comments: false, strings: false };

  try {
    const response = await fetchWithCSRF('/api/settings/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ settings: newSettings })
    });

    if (response.ok) {
      currentSettings = newSettings;
      applySettings();
      hideSettings();
      showMessage('Settings saved successfully', 'success');
    } else {
      const error = await response.json();
      showMessage(error.error || 'Failed to save settings', 'error');
    }
  } catch (err) {
    showMessage('Failed to save settings', 'error');
  }
}

function resetSettings() {
  if (confirm('Reset all settings to default?')) {
    currentSettings = { ...DEFAULT_SETTINGS };
    populateSettings();
    applySettings();
  }
}

function applySettings() {
  if (editorInstance) {
    editorInstance.updateOptions(currentSettings);
  }
}

function getNestedValue(obj, path) {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

function showMessage(message, type = 'info') {
  if (window.showToast) {
    window.showToast(message, type);
  } else if (window.showMessage) {
    window.showMessage(message, type);
  }
}

export function getCurrentSettings() {
  return currentSettings;
}

