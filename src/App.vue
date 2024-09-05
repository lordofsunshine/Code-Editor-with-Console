<template>
  <div :class="['flex flex-col body-bg h-screen', themeClass]">
    <header class="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-16 px-4 py-2 sm:py-0 border-b border-muted">
      <div class="flex items-center gap-4 mb-2 sm:mb-0">
        <a href="#" class="flex items-center gap-2 text-lg font-semibold">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>Code Editor</span>
        </a>
        <div class="flex items-center gap-4">
          <div class="relative">
            <button @click="saveCode" class="bg-transparent hover:bg-hover p-2 rounded-md">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path><path d="M7 3v4a1 1 0 0 0 1 1h7"></path></svg>
              <span class="sr-only">Save</span>
            </button>
            <transition name="fade">
              <div v-if="showSaveTooltip" class="absolute tooltip-bottom bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded">
                Changes saved
              </div>
            </transition>
          </div>
          <button @click="downloadFiles" class="bg-transparent hover:bg-hover p-2 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5l5 5l5-5m-5 5V3"/></svg>
            <span class="sr-only">Download</span>
          </button>
          <div class="relative">
            <button @click="toggleThemeDropdown" class="bg-transparent hover:bg-hover p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 16 16">
                <rect width="16" height="16" fill="none" />
                <path fill="currentColor" d="M8 12a4 4 0 1 1 0-8a4 4 0 0 1 0 8m0-1.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326a.75.75 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0M8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0M3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8m13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8m-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13m3.536-1.464a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061M2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.75.75 0 0 1-.018 1.042a.75.75 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Z" />
              </svg>
              <span class="sr-only">Toggle theme</span>
            </button>
            <transition name="dropdown">
              <div v-if="showThemeDropdown" class="absolute right-0 w-40 bg-dropdown shadow-lg mt-2 rounded-md overflow-hidden z-10">
                <div class="px-2 py-1 border-b dropdown-text border-muted">Theme</div>
                <div v-for="t in ['light', 'dark', 'system']" :key="t">
                  <button 
                    @click="setTheme(t)"
                    :class="[
                      'w-full text-left px-2 py-1 cursor-pointer hover:bg-hover flex items-center justify-between',
                      { 'bg-selected text-primary font-medium': theme === t }
                    ]"
                  >
                    {{ t.charAt(0).toUpperCase() + t.slice(1) }}
                    <svg v-if="theme === t" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20">
                      <rect width="20" height="20" fill="none" />
                      <g fill="currentColor">
                        <path d="m14.937 5.743l-5 9c-.324.583-1.198.097-.874-.486l5-9c.324-.583 1.198-.097.874.486" />
                        <path d="m4.812 10.11l5 4c.52.416-.104 1.197-.624.78l-5-4c-.52-.416.104-1.197.624-.78" />
                      </g>
                    </svg>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <a class="nav-link" href="#">Do you need help?</a>
        </div>
      </div>
    </header>
    <div class="flex flex-1 overflow-hidden">
      <div class="flex flex-col w-full sm:w-64 border-r border-muted">
        <div class="flex items-center justify-between h-12 px-4 border-b border-muted">
          <span class="text-sm font-medium">Files</span>
          <div class="relative">
            <button @click="toggleUploadDropdown" class="bg-transparent hover:bg-hover p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <rect width="24" height="24" fill="none" />
                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17h18M3 12h18M3 7h18" />
              </svg>
              <span class="sr-only">Upload file</span>
            </button>
            <transition name="dropdown">
              <div v-if="showUploadDropdown" class="absolute upload-dropdown right-0 w-40 bg-dropdown shadow-lg mt-2 rounded-md overflow-hidden z-10">
                <button @click="triggerFileUpload" class="upload-btn w-full text-left px-2 py-1 cursor-pointer hover:bg-hover">Upload files</button>
              </div>
            </transition>
          </div>
          <input type="file" ref="fileInput" @change="handleFileUpload" multiple style="display: none;" accept=".html,.css,.js">
        </div>
        <div class="flex-1 overflow-auto dark-color">
          <div class="px-4 py-2">
            <div v-for="file in files" :key="file.name"
                 @click="setActiveFile(file.type)"
                 :class="['flex items-center justify-between text-sm font-medium cursor-pointer p-2 rounded', 
                          { 'bg-selected': activeFile === file.type }]">
              <span>{{ file.name }}</span>
              <span v-html="fileIcons[file.type]"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 flex flex-col overflow-hidden relative md:flex-row">
          <div class="flex-1 p-4 code-bg">
            <div class="w-full h-full" ref="codeEditor"></div>
          </div>
          <div class="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-muted">
            <div class="flex items-center justify-between h-12 px-4 border-b border-muted">
              <span class="text-sm font-medium">Preview</span>
              <button @click="toggleFullscreen" class="bg-transparent hover:bg-hover p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24">
                  <rect width="24" height="24" fill="none" />
                  <g fill="none" fill-rule="evenodd">
                    <path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                    <path fill="currentColor" d="M18.5 5.5H16a1.5 1.5 0 0 1 0-3h3A2.5 2.5 0 0 1 21.5 5v3a1.5 1.5 0 0 1-3 0zM8 5.5H5.5V8a1.5 1.5 0 1 1-3 0V5A2.5 2.5 0 0 1 5 2.5h3a1.5 1.5 0 1 1 0 3m0 13H5.5V16a1.5 1.5 0 0 0-3 0v3A2.5 2.5 0 0 0 5 21.5h3a1.5 1.5 0 0 0 0-3m8 0h2.5V16a1.5 1.5 0 0 1 3 0v3a2.5 2.5 0 0 1-2.5 2.5h-3a1.5 1.5 0 0 1 0-3" />
                  </g>
                </svg>
                <span class="sr-only">Fullscreen Mode</span>
              </button>
            </div>
            <iframe ref="previewFrame" class="w-full h-full bg-white" src="about:blank" title="Preview"></iframe>
          </div>
        </div>
        <footer class="h-12 border-t border-muted flex items-center justify-between px-4">
          <div class="flex items-center gap-4">
            <button @click="toggleConsole" class="flex items-center bg-transparent p-2 console-icon">
              Console
              <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]" xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24">
                <rect width="24" height="24" fill="none" />
                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m7 10l5 5l5-5" />
              </svg>
              <span class="sr-only">Toggle console</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
    <transition name="slide-fade">
      <div v-if="showConsole" class="fixed bottom-0 left-0 right-0 bg-console border-t border-muted">
        <div class="flex items-center justify-between p-2 border-b border-muted">
          <button @click="toggleConsole" class="flex items-center bg-transparent p-2 console-icon">
            Console
            <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]" xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24">
              <rect width="24" height="24" fill="none" />
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m7 10l5 5l5-5" />
            </svg>
            <span class="sr-only">Toggle console</span>
          </button>
          <button @click="clearConsole" class="text-sm text-blue-500 hover:text-blue-600">Clear console</button>
        </div>
        <div class="h-48 overflow-auto p-2 font-mono text-sm">
          <div v-for="(log, index) in consoleLogs" :key="index" :class="['mb-1', { 'text-red-500': log.type === 'error' }]">
            {{ log.message }}
          </div>
        </div>
        <div class="flex items-center p-2 border-t border-muted">
          <span class="mr-2 text-gray-500">></span>
          <input v-model="consoleInput" @keyup.enter="executeConsoleCommand" class="flex-1 bg-transparent outline-none" placeholder="Enter command...">
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
  import { ref, computed, onMounted, watch } from 'vue';
  import * as monaco from 'monaco-editor';
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
  import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
  import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
  import JSZip from 'jszip';
  import { saveAs } from 'file-saver';

  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'json') return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    }
  };

  const initialHtmlCode = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <link rel="icon" href="/favicon.ico" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Code Editor</title>
    </head>
    <body>
      <div class="container">
        <h1 class="title">Code Editor</h1>
        <a href="https://github.com/lordofsunshine/Code-Editor-with-Console" class="watermark">by lordofsunshine</a>
      </div>
    </body>
  </html>`;

  const initialCssCode = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Pixelify+Sans:wght@400..700&display=swap');

  body {
    font-family: "Bebas Neue", sans-serif;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .title {
    color: #5e5e5e;
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .watermark {
    font-family: "Pixelify Sans", sans-serif;
    font-size: 1.5rem;
    background: #1a1a1ade;
    color: #fff;
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    transition: background-color 0.3s ease;
  }

  .watermark:hover {
    background-color: #1b1b1b;
  }

  @media (max-width: 768px) {
    .title {
      font-size: 3rem;
    }

    .watermark {
      font-size: 1.2rem;
    }
  }`;

  const initialJsCode = `console.log("Welcome to the Code Editor!");

  document.addEventListener('DOMContentLoaded', () => {
    const watermark = document.querySelector('.watermark');
    if (watermark) {
      watermark.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Thanks for using the Code Editor!');
        window.open(e.target.href, '_blank');
      });
    }
  });`;

  export default {
    setup() {
      const htmlCode = ref(localStorage.getItem('htmlCode') || initialHtmlCode);
      const cssCode = ref(localStorage.getItem('cssCode') || initialCssCode);
      const jsCode = ref(localStorage.getItem('jsCode') || initialJsCode);
      const activeFile = ref('html');
      const theme = ref(localStorage.getItem('theme') || 'system');
      const showThemeDropdown = ref(false);
      const showUploadDropdown = ref(false);
      const showConsole = ref(false);
      const consoleLogs = ref([]);
      const consoleInput = ref('');
      const previewFrame = ref(null);
      const showSaveTooltip = ref(false);
      const codeEditor = ref(null);
      const fileInput = ref(null);
      let editor = null;

      const files = [
        { name: 'index.html', type: 'html' },
        { name: 'style.css', type: 'css' },
        { name: 'script.js', type: 'js' }
      ];

      const fileIcons = {
        html: `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="none" />
    <g fill="none">
      <rect width="256" height="256" fill="#e14e1d" rx="60" />
      <path fill="#fff" d="m48 38l8.61 96.593h110.71l-3.715 41.43l-35.646 9.638l-35.579-9.624l-2.379-26.602H57.94l4.585 51.281l65.427 18.172l65.51-18.172l8.783-98.061H85.824l-2.923-32.71h122.238L208 38z" />
      <path fill="#ebebeb" d="M128 38H48l8.61 96.593H128v-31.938H85.824l-2.923-32.71H128zm0 147.647l-.041.014l-35.579-9.624l-2.379-26.602H57.94l4.585 51.281l65.427 18.172l.049-.014z" />
    </g>
  </svg>
        `,
        css: `
         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="none" />
    <g fill="none">
      <rect width="256" height="256" fill="#0277bd" rx="60" />
      <path fill="#ebebeb" d="m53.753 102.651l2.862 31.942h71.481v-31.942zM128.095 38H48l2.904 31.942h77.191zm0 180.841v-33.233l-.14.037l-35.574-9.605l-2.274-25.476H58.042l4.475 50.154l65.431 18.164z" />
      <path fill="#fff" d="m167.318 134.593l-3.708 41.426l-35.625 9.616v33.231l65.483-18.148l.48-5.397l7.506-84.092l.779-8.578L208 38h-80.015v31.942h45.009l-2.906 32.709h-42.103v31.942z" />
    </g>
  </svg>
        `,
        js: `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="none" />
    <g fill="none">
      <rect width="256" height="256" fill="#f0db4f" rx="60" />
      <path fill="#323330" d="m67.312 213.932l19.59-11.856c3.78 6.701 7.218 12.371 15.465 12.371c7.905 0 12.889-3.092 12.889-15.12v-81.798h24.058v82.138c0 24.917-14.606 36.259-35.916 36.259c-19.245 0-30.416-9.967-36.087-21.996m85.07-2.576l19.588-11.341c5.157 8.421 11.859 14.607 23.715 14.607c9.969 0 16.325-4.984 16.325-11.858c0-8.248-6.53-11.17-17.528-15.98l-6.013-2.579c-17.357-7.388-28.871-16.668-28.871-36.258c0-18.044 13.748-31.792 35.229-31.792c15.294 0 26.292 5.328 34.196 19.247l-18.731 12.029c-4.125-7.389-8.591-10.31-15.465-10.31c-7.046 0-11.514 4.468-11.514 10.31c0 7.217 4.468 10.139 14.778 14.608l6.014 2.577c20.449 8.765 31.963 17.699 31.963 37.804c0 21.654-17.012 33.51-39.867 33.51c-22.339 0-36.774-10.654-43.819-24.574" />
    </g>
  </svg>
        `
      };

      const themeClass = computed(() => `theme-${theme.value}`);

      onMounted(() => {
        editor = monaco.editor.create(codeEditor.value, {
          value: getContentByFileType(activeFile.value),
          language: activeFile.value,
          theme: getMonacoTheme(theme.value),
          automaticLayout: true,
          minimap: { enabled: false },
          lineNumbers: 'off',
          folding: false,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'none',
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          overviewRulerLanes: 0,
          fontFamily: '"Source Code Pro", monospace',
          fontSize: 14,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          glyphMargin: false,
        });

        watch(activeFile, (newFile) => {
          const content = getContentByFileType(newFile);
          editor.setValue(content);
          monaco.editor.setModelLanguage(editor.getModel(), newFile);
        });

        watch(theme, (newTheme) => {
          const monacoTheme = getMonacoTheme(newTheme);
          monaco.editor.setTheme(monacoTheme);
          localStorage.setItem('theme', newTheme);
        });

        editor.onDidChangeModelContent(() => {
          const content = editor.getValue();
          updateContentByFileType(activeFile.value, content);
          updatePreviewFrame();
        });

        updatePreviewFrame();
      });

      const getContentByFileType = (fileType) => {
        switch (fileType) {
          case 'html': return htmlCode.value;
          case 'css': return cssCode.value;
          case 'js': return jsCode.value;
          default: return '';
        }
      };

      const updateContentByFileType = (fileType, content) => {
        switch (fileType) {
          case 'html': htmlCode.value = content; break;
          case 'css': cssCode.value = content; break;
          case 'js': jsCode.value = content; break;
        }
      };

      const updatePreviewFrame = () => {
        const frameDoc = previewFrame.value.contentDocument;
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${cssCode.value}</style>
          </head>
          <body>
            ${htmlCode.value}
            <script>
              (function(){
                var oldLog = console.log;
                console.log = function(...args) {
                  window.parent.postMessage({type: 'log', message: args.join(' ')}, '*');
                  oldLog.apply(console, args);
                };
                window.onerror = function(message, source, lineno, colno, error) {
                  window.parent.postMessage({type: 'error', message: message}, '*');
                  return false;
                };
              })();
              ${jsCode.value}
            <\/script>
          </body>
          </html>
        `);
        frameDoc.close();
      };

      const executeConsoleCommand = () => {
        if (!consoleInput.value.trim()) {
          consoleLogs.value.push({ type: 'error', message: 'Please enter a command.' });
          return;
        }
        try {
          const result = previewFrame.value.contentWindow.eval(consoleInput.value);
          consoleLogs.value.push({ type: 'log', message: String(result) });
        } catch (error) {
          consoleLogs.value.push({ type: 'error', message: error.message });
        }
        consoleInput.value = '';
      };

      const downloadFiles = async () => {
        const zip = new JSZip();
        zip.file('index.html', htmlCode.value);
        zip.file('style.css', cssCode.value);
        zip.file('script.js', jsCode.value);

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'project.zip');
      };

      const toggleThemeDropdown = () => {
        showThemeDropdown.value = !showThemeDropdown.value;
      };

      const getMonacoTheme = (themeValue) =>
        themeValue === 'system'
          ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'vs-dark'
            : 'vs-light'
          : themeValue === 'dark'
          ? 'vs-dark'
          : 'vs-light';

      const setTheme = (newTheme) => {
        theme.value = newTheme;
        showThemeDropdown.value = false;
        const monacoTheme = getMonacoTheme(newTheme);
        monaco.editor.setTheme(monacoTheme);
        localStorage.setItem('theme', newTheme);
      };

      const saveCode = () => {
        localStorage.setItem('htmlCode', htmlCode.value);
        localStorage.setItem('cssCode', cssCode.value);
        localStorage.setItem('jsCode', jsCode.value);
        showSaveTooltip.value = true;
        setTimeout(() => {
          showSaveTooltip.value = false;
        }, 2000);
      };

      const toggleUploadDropdown = () => {
        showUploadDropdown.value = !showUploadDropdown.value;
      };

      const triggerFileUpload = () => {
        fileInput.value.click();
      };

      const handleFileUpload = (event) => {
        const files = event.target.files;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            if (file.name.endsWith('.html')) {
              htmlCode.value = content;
              setActiveFile('html');
            } else if (file.name.endsWith('.css')) {
              cssCode.value = content;
              setActiveFile('css');
            } else if (file.name.endsWith('.js')) {
              jsCode.value = content;
              setActiveFile('js');
            }
            updatePreviewFrame();
          };
          reader.readAsText(file);
        }
        showUploadDropdown.value = false;
      };

      const setActiveFile = (fileType) => {
        activeFile.value = fileType;
      };

      const toggleConsole = () => {
        showConsole.value = !showConsole.value;
      };

      const clearConsole = () => {
        consoleLogs.value = [];
      };

      const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
          previewFrame.value.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      };

      window.addEventListener('message', (event) => {
        if (event.data && (event.data.type === 'log' || event.data.type === 'error')) {
          consoleLogs.value.push(event.data);
        }
      });

      return {
        htmlCode,
        cssCode,
        jsCode,
        activeFile,
        theme,
        showThemeDropdown,
        showUploadDropdown,
        showConsole,
        consoleLogs,
        consoleInput,
        previewFrame,
        showSaveTooltip,
        codeEditor,
        fileInput,
        files,
        fileIcons,
        themeClass,
        getContentByFileType,
        updateContentByFileType,
        updatePreviewFrame,
        executeConsoleCommand,
        downloadFiles,
        toggleThemeDropdown,
        setTheme,
        saveCode,
        toggleUploadDropdown,
        triggerFileUpload,
        handleFileUpload,
        setActiveFile,
        toggleConsole,
        clearConsole,
        toggleFullscreen
      };
    }
  };
</script>