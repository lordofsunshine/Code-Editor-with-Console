let previewVisible = false;
let currentBlobUrl = null;

function normalizeProjectPath(input) {
  if (typeof input !== 'string') {
    return null;
  }

  let normalized = input.replace(/\\+/g, '/').trim();
  normalized = normalized.replace(/\/+/g, '/');

  const segments = [];
  normalized.split('/').forEach(segment => {
    if (!segment || segment === '.') {
      return;
    }
    if (segment === '..') {
      segments.pop();
    } else {
      segments.push(segment);
    }
  });

  if (segments.length === 0) {
    return null;
  }

  return segments.join('/');
}

function getDirectoryFromPath(path) {
  const normalized = normalizeProjectPath(path);
  if (!normalized) {
    return '';
  }
  const parts = normalized.split('/');
  parts.pop();
  return parts.join('/');
}

function resolveRelativePath(fromPath, relativePath) {
  if (!relativePath) {
    return null;
  }

  const baseDir = getDirectoryFromPath(fromPath);
  const stack = baseDir ? baseDir.split('/') : [];
  relativePath.replace(/\\+/g, '/').split('/').forEach(segment => {
    if (!segment || segment === '.') {
      return;
    }
    if (segment === '..') {
      if (stack.length > 0) {
        stack.pop();
      }
    } else {
      stack.push(segment);
    }
  });

  return stack.join('/');
}

function getRelativeReference(fromPath, targetPath) {
  const fromDir = getDirectoryFromPath(fromPath);
  const fromSegments = fromDir ? fromDir.split('/') : [];
  const targetSegments = targetPath ? targetPath.split('/') : [];

  let i = 0;
  while (i < fromSegments.length && i < targetSegments.length && fromSegments[i] === targetSegments[i]) {
    i++;
  }

  const upSegments = new Array(fromSegments.length - i).fill('..');
  const downSegments = targetSegments.slice(i);
  const relativeSegments = [...upSegments, ...downSegments];

  if (relativeSegments.length === 0) {
    return '';
  }

  return relativeSegments.join('/');
}

function buildReferenceCandidates(fromPath, targetPath, fileName) {
  const candidates = new Set();
  const normalizedTarget = normalizeProjectPath(targetPath);

  if (normalizedTarget) {
    candidates.add(normalizedTarget);
    candidates.add(`./${normalizedTarget}`);
    candidates.add(`/${normalizedTarget}`);
  }

  if (fileName) {
    candidates.add(fileName);
    candidates.add(`./${fileName}`);
  }

  if (normalizedTarget) {
    const relative = getRelativeReference(fromPath, normalizedTarget);
    if (relative) {
      candidates.add(relative);
      if (!relative.startsWith('.') && !relative.startsWith('/')) {
        candidates.add(`./${relative}`);
      }
    }
  }

  return Array.from(candidates)
    .map(candidate => candidate.replace(/\/+/g, '/'))
    .filter(candidate => candidate.length > 0);
}

function findFileByReference(reference, basePath, filesMap) {
  if (!reference) {
    return null;
  }

  const trimmed = reference.trim();
  const cleaned = trimmed.replace(/\\+/g, '/');

  const directCandidates = [
    cleaned,
    cleaned.replace(/^\.\/+/, ''),
    cleaned.replace(/^\/+/, '')
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeProjectPath(candidate);
    if (normalized && filesMap.has(normalized)) {
      return filesMap.get(normalized);
    }
  }

  const resolved = resolveRelativePath(basePath, cleaned);
  if (resolved && filesMap.has(resolved)) {
    return filesMap.get(resolved);
  }

  const fallbackName = cleaned.split('/').pop();
  if (fallbackName) {
    for (const file of filesMap.values()) {
      if (file.name === fallbackName) {
        return file;
      }
    }
  }

  return null;
}

export function initPreview() {
  document.getElementById('refreshPreview').addEventListener('click', updatePreview);
  document.getElementById('closePreview').addEventListener('click', hidePreview);
  const select = document.getElementById('previewFileSelect');
  if (select) {
    select.addEventListener('change', updatePreview);
    if (window.initCustomSelects) {
      setTimeout(() => {
        window.initCustomSelects();
      }, 100);
    }
  }
}

export function checkPreviewAvailability(files) {
  const previewableFiles = files.filter(f => isPreviewable(f.name));
  
  if (previewableFiles.length > 0 && !previewVisible) {
    showPreviewOption();
  } else if (previewableFiles.length === 0 && previewVisible) {
    hidePreview();
  }
  
  updatePreviewFileSelect(previewableFiles);
}

function isPreviewable(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const previewableExts = [
    'html', 'htm', 'txt', 'md', 'svg',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'avif',
    'mp4', 'webm', 'mov', 'avi',
    'mp3', 'wav', 'ogg'
  ];
  return previewableExts.includes(ext);
}

function updatePreviewFileSelect(files) {
  const select = document.getElementById('previewFileSelect');
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = files.map(f => 
    `<option value="${f.id}" ${f.id == currentValue ? 'selected' : ''}>${f.name}</option>`
  ).join('');
  
  if (files.length > 0 && !select.value) {
    select.value = files[0].id;
  }
  
  if (window.createCustomSelect && !window.selectInstances?.has(select)) {
    window.createCustomSelect(select);
  } else if (window.updateCustomSelect) {
    window.updateCustomSelect(select);
  }
}

function showPreviewOption() {
  const statusbar = document.querySelector('.statusbar-right');
  if (!document.getElementById('togglePreview')) {
    const btn = document.createElement('button');
    btn.id = 'togglePreview';
    btn.className = 'theme-toggle';
    btn.title = 'Toggle Preview';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
    btn.addEventListener('click', togglePreview);
    statusbar.insertBefore(btn, statusbar.lastChild);
  }
}

export function togglePreview() {
  previewVisible = !previewVisible;
  const panel = document.getElementById('previewPanel');
  const editor = document.getElementById('monacoEditor');
  
  if (previewVisible) {
    panel.classList.add('active');
    editor.classList.add('split');
    updatePreview();
  } else {
    panel.classList.remove('active');
    editor.classList.remove('split');
  }
}

function hidePreview() {
  if (previewVisible) {
    togglePreview();
  }
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

export function updatePreview() {
  if (!previewVisible) return;
  
  const selectedFileId = document.getElementById('previewFileSelect').value;
  if (!selectedFileId) return;
  
  const projectFiles = window.editorState?.files || [];
  const file = projectFiles.find(f => f.id == selectedFileId);
  
  if (!file) return;
  
  const iframe = document.getElementById('previewFrame');
  const ext = file.name.split('.').pop().toLowerCase();
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'avif'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi'];
  const audioExts = ['mp3', 'wav', 'ogg'];
  
  if (ext === 'html' || ext === 'htm') {
    renderHTMLPreview(file, projectFiles, iframe);
  } else if (ext === 'txt') {
    renderTextPreview(file, iframe);
  } else if (ext === 'md') {
    renderMarkdownPreview(file, iframe);
  } else if (ext === 'svg') {
    renderSVGPreview(file, iframe);
  } else if (imageExts.includes(ext)) {
    renderImagePreview(file, iframe);
  } else if (videoExts.includes(ext)) {
    renderVideoPreview(file, iframe);
  } else if (audioExts.includes(ext)) {
    renderAudioPreview(file, iframe);
  }
}

function renderHTMLPreview(htmlFile, allFiles, iframe) {
  const normalizedFiles = allFiles.map(file => {
    const rawPath = file.path || file.name || '';
    const normalizedPath = normalizeProjectPath(rawPath) || rawPath;
    const safePath = normalizedPath || rawPath;
    const safeName = file.name || (safePath ? safePath.split('/').pop() : '');
    return {
      ...file,
      path: safePath,
      name: safeName
    };
  });

  const filesMap = new Map();
  normalizedFiles.forEach(file => {
    if (file.path) {
      filesMap.set(file.path, file);
    }
  });

  const htmlFilePath = normalizeProjectPath(htmlFile.path || htmlFile.name) || (htmlFile.path || htmlFile.name);
  const htmlFileEntry = filesMap.get(htmlFilePath) || { ...htmlFile, path: htmlFilePath, name: htmlFile.name };
  let html = htmlFileEntry.content || '';

  const mediaExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'apng', 'avif', 'mp4', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg'];
  const mediaFiles = normalizedFiles.filter(f => mediaExts.includes((f.name || '').split('.').pop().toLowerCase()));
  const cssFiles = normalizedFiles.filter(f => (f.name || '').toLowerCase().endsWith('.css'));
  const jsFiles = normalizedFiles.filter(f => (f.name || '').toLowerCase().endsWith('.js'));

  const dataUriCache = new Map();

  function getMediaDataUri(mediaFile) {
    if (dataUriCache.has(mediaFile.path)) {
      return dataUriCache.get(mediaFile.path);
    }

    let dataUri = mediaFile.content;
    if (!dataUri || !dataUri.startsWith('data:')) {
      if (!mediaFile.content || typeof mediaFile.content !== 'string') {
        dataUriCache.set(mediaFile.path, null);
        return null;
      }

      const ext = mediaFile.name.split('.').pop().toLowerCase();
      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'bmp': 'image/bmp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg'
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      try {
        const base64 = btoa(unescape(encodeURIComponent(mediaFile.content)));
        dataUri = `data:${mimeType};base64,${base64}`;
      } catch (e) {
        dataUri = null;
      }
    }

    dataUriCache.set(mediaFile.path, dataUri);
    return dataUri;
  }

  function processMediaInContent(content, mediaList, basePath, context = 'html') {
    if (!content) {
      return '';
    }

    let processed = content;
    const replaceAttributes = context === 'html';

    mediaList.forEach(mediaFile => {
      const dataUri = getMediaDataUri(mediaFile);
      if (!dataUri) {
        return;
      }

      const candidates = buildReferenceCandidates(basePath, mediaFile.path, mediaFile.name);

      if (replaceAttributes) {
        candidates.forEach(value => {
          const attrPatterns = [
            new RegExp(`(src=["'])${escapeRegex(value)}(["'])`, 'gi'),
            new RegExp(`(href=["'])${escapeRegex(value)}(["'])`, 'gi')
          ];
          attrPatterns.forEach(regex => {
            processed = processed.replace(regex, `$1${dataUri}$2`);
          });
        });
      }

      candidates.forEach(value => {
        const cssRegex = new RegExp(`(url\\(["']?)${escapeRegex(value)}(["']?\\))`, 'gi');
        processed = processed.replace(cssRegex, `url(${dataUri})`);
      });
    });

    return processed;
  }

  function processCSSImports(cssContent, currentFile, processedFiles = new Set()) {
    let processed = cssContent || '';
    const source = cssContent || '';
    const importRegex = /@import\s+(?:url\()?["']?([^"')]+)["']?\)?;?/gi;
    let match;
    const replacements = [];

    while ((match = importRegex.exec(source)) !== null) {
      const importPath = match[1].trim();
      const importedFile = findFileByReference(importPath, currentFile.path, filesMap);
      if (importedFile && importedFile.name.toLowerCase().endsWith('.css')) {
        const key = importedFile.path || importedFile.id;
        if (processedFiles.has(key)) {
          replacements.push({ original: match[0], replacement: '' });
          continue;
        }

        processedFiles.add(key);
        const importedContent = processCSSImports(importedFile.content || '', importedFile, processedFiles);
        const importedCSS = processMediaInContent(importedContent, mediaFiles, importedFile.path, 'css');
        replacements.push({ original: match[0], replacement: importedCSS });
      }
    }

    replacements.forEach(({ original, replacement }) => {
      processed = processed.replace(original, replacement);
    });

    return processed;
  }

  html = processMediaInContent(html, mediaFiles, htmlFileEntry.path, 'html');

  const cssOutput = new Map();
  cssFiles.forEach(cssFile => {
    const processedCSS = processCSSImports(cssFile.content || '', cssFile);
    const finalCSS = processMediaInContent(processedCSS, mediaFiles, cssFile.path, 'css');
    cssOutput.set(cssFile.path, finalCSS);

    const candidates = buildReferenceCandidates(htmlFileEntry.path, cssFile.path, cssFile.name);
    candidates.forEach(value => {
      const regex = new RegExp(`<link[^>]*href=["']${escapeRegex(value)}["'][^>]*>`, 'gi');
      html = html.replace(regex, `<style>${finalCSS}</style>`);
    });
  });

  const jsOutput = new Map();
  jsFiles.forEach(jsFile => {
    const scriptContent = jsFile.content || '';
    jsOutput.set(jsFile.path, scriptContent);

    const candidates = buildReferenceCandidates(htmlFileEntry.path, jsFile.path, jsFile.name);
    candidates.forEach(value => {
      const regex = new RegExp(`<script[^>]*src=["']${escapeRegex(value)}["'][^>]*></script>`, 'gi');
      html = html.replace(regex, `<script>${scriptContent}</script>`);
    });
  });

  let inlinedStyles = '';
  cssOutput.forEach(css => {
    inlinedStyles += `<style>${css}</style>\n`;
  });

  let inlinedScripts = '';
  jsOutput.forEach(script => {
    inlinedScripts += `<script>${script}</script>\n`;
  });

  if (!html.includes('<link') && inlinedStyles) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${inlinedStyles}</head>`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html><head><meta charset="UTF-8">${inlinedStyles}</head>`);
    } else {
      html = `<html><head><meta charset="UTF-8">${inlinedStyles}</head><body>${html}</body></html>`;
    }
  }

  if (!html.includes('<script') && inlinedScripts) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${inlinedScripts}</body>`);
    } else {
      html += inlinedScripts;
    }
  }

  html = processMediaInContent(html, mediaFiles, htmlFileEntry.path, 'html');

  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  try {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
  } catch (err) {
    console.error('Failed to create blob URL:', err);
    iframe.srcdoc = html;
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderTextPreview(file, iframe) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
          padding: 20px;
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.6;
          color: var(--text-primary, #000);
          background: var(--bg-primary, #fff);
        }
      </style>
    </head>
    <body>${escapeHtml(file.content)}</body>
    </html>
  `;
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  try {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
  } catch (err) {
    console.error('Failed to create blob URL:', err);
    iframe.srcdoc = html;
  }
}

function renderSVGPreview(file, iframe) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
      </style>
    </head>
    <body>${file.content}</body>
    </html>
  `;
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  try {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
  } catch (err) {
    console.error('Failed to create blob URL:', err);
    iframe.srcdoc = html;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdownPreview(file, iframe) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
          line-height: 1.6;
          color: var(--text-primary, #000);
          background: var(--bg-primary, #fff);
          max-width: 800px;
          margin: 0 auto;
          white-space: pre-wrap;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        code {
          background: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Fira Code', monospace;
        }
        pre {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
        }
        blockquote {
          border-left: 4px solid #ddd;
          margin: 0;
          padding-left: 20px;
          color: #666;
        }
        ul, ol {
          padding-left: 20px;
        }
        img {
          max-width: 100%;
          height: auto;
        }
      </style>
    </head>
    <body>${escapeHtml(file.content)}</body>
    </html>
  `;
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  try {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
  } catch (err) {
    console.error('Failed to create blob URL:', err);
    iframe.srcdoc = html;
  }
}

function renderImagePreview(file, iframe) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
        }
        .image-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        img {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
      </style>
    </head>
    <body>
      <div class="image-container">
        <img src="${file.content}" alt="${escapeHtml(file.name)}">
      </div>
    </body>
    </html>
  `;
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  try {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
  } catch (err) {
    console.error('Failed to create blob URL:', err);
    iframe.srcdoc = html;
  }
}

function renderVideoPreview(file, iframe) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
        }
        .video-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        video {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
      </style>
    </head>
    <body>
      <div class="video-container">
        <video src="${file.content}" controls autoplay muted></video>
      </div>
    </body>
    </html>
  `;
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  try {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
  } catch (err) {
    console.error('Failed to create blob URL:', err);
    iframe.srcdoc = html;
  }
}

function renderAudioPreview(file, iframe) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
        }
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
        }
        .audio-container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 500px;
          width: 100%;
        }
        .audio-icon {
          width: 80px;
          height: 80px;
          fill: #667eea;
          margin-bottom: 20px;
        }
        .audio-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 30px;
          word-break: break-word;
        }
        audio {
          width: 100%;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="audio-container">
        <svg viewBox="0 0 24 24" class="audio-icon">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <div class="audio-title">${escapeHtml(file.name)}</div>
        <audio src="${file.content}" controls autoplay></audio>
      </div>
    </body>
    </html>
  `;
  
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  try {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
  } catch (err) {
    console.error('Failed to create blob URL:', err);
    iframe.srcdoc = html;
  }
}

