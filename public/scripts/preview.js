let previewVisible = false;

export function initPreview() {
  document.getElementById('refreshPreview').addEventListener('click', updatePreview);
  document.getElementById('closePreview').addEventListener('click', hidePreview);
  document.getElementById('previewFileSelect').addEventListener('change', updatePreview);
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
  select.innerHTML = files.map(f => 
    `<option value="${f.id}">${f.name}</option>`
  ).join('');
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
  let html = htmlFile.content;
  
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'apng', 'avif'];
  const imageFiles = allFiles.filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return imageExtensions.includes(ext);
  });
  
  imageFiles.forEach(imgFile => {
    const imgPath = imgFile.path.startsWith('/') ? imgFile.path : `/${imgFile.path}`;
    const imgName = imgFile.name;
    
    if (imgFile.content && imgFile.content.startsWith('data:image/')) {
      const regex1 = new RegExp(`src=["']${escapeRegex(imgPath)}["']`, 'g');
      const regex2 = new RegExp(`src=["']${escapeRegex(imgName)}["']`, 'g');
      const regex3 = new RegExp(`src=["']/${escapeRegex(imgName)}["']`, 'g');
      
      html = html.replace(regex1, `src="${imgFile.content}"`);
      html = html.replace(regex2, `src="${imgFile.content}"`);
      html = html.replace(regex3, `src="${imgFile.content}"`);
    }
  });
  
  const cssFiles = allFiles.filter(f => f.name.endsWith('.css'));
  const jsFiles = allFiles.filter(f => f.name.endsWith('.js'));
  
  let styles = '';
  cssFiles.forEach(cssFile => {
    styles += `<style>${cssFile.content}</style>`;
  });
  
  let scripts = '';
  jsFiles.forEach(jsFile => {
    scripts += `<script>${jsFile.content}</script>`;
  });
  
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${styles}</head>`);
  } else if (html.includes('<html>')) {
    html = html.replace('<html>', `<html><head><meta charset="UTF-8">${styles}</head>`);
  } else {
    html = `<html><head><meta charset="UTF-8">${styles}</head><body>${html}</body></html>`;
  }
  
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${scripts}</body>`);
  } else {
    html += scripts;
  }
  
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;
  
  const oldSrc = iframe.src;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  
  iframe.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, { once: true });
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
  
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;
  
  const oldSrc = iframe.src;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  
  iframe.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, { once: true });
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
  
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;
  
  const oldSrc = iframe.src;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  
  iframe.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, { once: true });
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
  
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;
  
  const oldSrc = iframe.src;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  
  iframe.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, { once: true });
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
  
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;
  
  const oldSrc = iframe.src;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  
  iframe.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, { once: true });
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
  
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;
  
  const oldSrc = iframe.src;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  
  iframe.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, { once: true });
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
  
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;
  
  const oldSrc = iframe.src;
  if (oldSrc && oldSrc.startsWith('blob:')) {
    URL.revokeObjectURL(oldSrc);
  }
  
  iframe.addEventListener('load', () => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, { once: true });
}

