let hotkeyHandlers = {};

export function initHotkeys() {
  document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(e) {
  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;

  const combo = `${ctrl ? 'ctrl+' : ''}${shift ? 'shift+' : ''}${alt ? 'alt+' : ''}${key}`;

  if (hotkeyHandlers[combo]) {
    e.preventDefault();
    hotkeyHandlers[combo](e);
    return false;
  }
}

export function registerHotkey(combo, handler) {
  hotkeyHandlers[combo.toLowerCase()] = handler;
}

export function unregisterHotkey(combo) {
  delete hotkeyHandlers[combo.toLowerCase()];
}

export function unregisterAllHotkeys() {
  hotkeyHandlers = {};
}

export function getRegisteredHotkeys() {
  return Object.keys(hotkeyHandlers);
}

