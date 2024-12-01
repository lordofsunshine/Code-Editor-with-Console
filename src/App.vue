<template>
  <div :class="['flex flex-col body-bg h-screen', themeClass]">
    <header class="flex items-center justify-between h-16 px-4 border-b border-muted">
      <div class="flex items-center navv-flex gap-4">
        <a href="#" class="flex items-center px-3 gap-2 logo-bg font-semibold">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Code Editor</span>
        </a>
        <div class="flex items-center gap-4">
          <a title="GitHub Repository" href="https://github.com/lordofsunshine/Code-Editor-with-Console"
            class="bg-transparent bg-hover p-2 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-github size-icon">
              <path
                d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4">
              </path>
              <path d="M9 18c-4.51 2-5-2-7-2"></path>
            </svg>
            <span class="sr-only">GitHub</span>
          </a>
          <button title="Download the Project" @click="downloadFiles" class="bg-transparent bg-hover p-2 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-download size-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            <span class="sr-only">Download</span>
          </button>
          <div class="relative">
            <button title="Save" @click="saveCode" class="bg-transparent bg-hover p-2 rounded-md">
              <svg class="size-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path
                  d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z">
                </path>
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path>
                <path d="M7 3v4a1 1 0 0 0 1 1h7"></path>
              </svg>
              <span class="sr-only">Save</span>
            </button>
            <transition name="fade">
              <div v-if="showSaveTooltip"
                class="absolute tool-background tooltip-bottom bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded">
                Changes saved
              </div>
            </transition>
          </div>
          <div class="relative">
            <button title="Toggle theme" @click="toggleThemeDropdown" class="bg-transparent bg-hover p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-sun size-icon">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
              <span class="sr-only">Toggle theme</span>
            </button>
            <transition name="dropdown">
              <div v-if="showThemeDropdown"
                class="absolute right-0 w-40 bg-dropdown shadow-lg mt-2 rounded-md overflow-hidden z-9999999">
                <div class="px-2 py-1 border-b dropdown-text border-muted">Theme</div>
                <div v-for="t in ['light', 'dark', 'system']" :key="t">
                  <button @click="setTheme(t)" :class="[
                    'w-full text-left px-2 py-1 cursor-pointer bg-hover flex items-center justify-between',
                    { 'bg-selected text-primary font-medium': theme === t }
                  ]">
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
    </header>

    <div class="flex flex-1 overflow-hidden">
      <div class="flex flex-col w-64 border-r border-muted files-block">
        <div class="flex items-center justify-between h-12 px-4 border-b border-muted">
          <span class="text-xs uppercase tracking-wider file-title font-medium">Files</span>
          <div class="relative">
            <button @click="toggleUploadDropdown" class="bg-transparent bg-navv bg-hover p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20">
                <path fill="currentColor"
                  d="M4 12a2 2 0 1 1 0-4a2 2 0 0 1 0 4m6 0a2 2 0 1 1 0-4a2 2 0 0 1 0 4m6 0a2 2 0 1 1 0-4a2 2 0 0 1 0 4" />
              </svg>
              <span class="sr-only">File Navbar</span>
            </button>
            <transition name="dropdown">
              <div v-if="showUploadDropdown"
                class="absolute upload-dropdown right-0 w-40 bg-dropdown shadow-lg mt-2 rounded-md overflow-hidden z-10">
                <button @click="triggerFileUpload"
                  class="upload-btn w-full text-left px-2 py-1 cursor-pointer hover:bg-hover">Upload files</button>
              </div>
            </transition>
          </div>
          <input type="file" ref="fileInput" @change="handleFileUpload" multiple style="display: none;"
            accept=".html,.css,.js">
        </div>
        <div class="flex-1 overflow-auto dark-color">
          <div class="width py-2">
            <div v-for="file in files" :key="file.name" @click="setActiveFile(file.type)" :class="['flex items-center file-flex text-sm file-bg font-medium cursor-pointer p-block rounded',
              { 'bg-selected': activeFile === file.type }]">
              <span v-html="fileIcons[file.type]"></span>
              <span>{{ file.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="border-b border-muted">
          <div class="flex">
            <button v-for="view in ['editor', 'preview']" :key="view" @click="setActiveView(view)" :class="[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeView === view
                ? 'border-white header-color text-white'
                : 'border-transparent header-color-end text-gray-400 hover:text-gray-300'
            ]">
              {{ view.charAt(0).toUpperCase() + view.slice(1) }}
            </button>
          </div>
        </div>

        <div class="flex-1 relative">
          <div v-show="activeView === 'editor'" class="absolute inset-0 code-bg">
            <div ref="editorContainer" class="w-full h-full"></div>
          </div>
          <div v-show="activeView === 'preview'" class="absolute inset-0">
            <iframe ref="previewFrame" class="w-full h-full bg-white" src="about:blank" title="Preview"></iframe>
          </div>
        </div>
      </div>
    </div>

    <footer class="border-t border-muted">
      <div class="flex items-center justify-between px-4 h-12">
        <div class="flex items-center gap-4">
          <button @click="toggleConsole" class="flex items-center bg-transparent p-2 console-icon">
            Console
            <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]"
              xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24">
              <rect width="24" height="24" fill="none" />
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="m7 10l5 5l5-5" />
            </svg>
            <span class="sr-only">Toggle console</span>
          </button>
        </div>
      </div>
    </footer>

    <transition name="slide-fade">
      <div v-if="showConsole" class="fixed bottom-0 left-0 right-0 bg-console border-t border-muted">
        <div class="flex items-center justify-between p-2 border-b border-muted">
          <button @click="toggleConsole" class="flex items-center bg-transparent p-2 console-icon">
            Console
            <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]"
              xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24">
              <rect width="24" height="24" fill="none" />
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="m7 10l5 5l5-5" />
            </svg>
            <span class="sr-only">Toggle console</span>
          </button>
          <button @click="clearConsole" class="text-sm text-blue-500 hover:text-blue-600">Clear console</button>
        </div>
        <div class="h-48 overflow-auto p-2 font-mono text-sm custom-scrollbar">
          <div v-for="(log, index) in consoleLogs" :key="index"
            :class="['mb-1', { 'text-red-500': log.type === 'error' }]">
            {{ log.message }}
          </div>
        </div>
        <div class="flex items-center p-2 border-t border-muted">
          <span class="mr-2 text-gray-500">></span>
          <input v-model="consoleInput" @keyup.enter="executeConsoleCommand" class="flex-1 bg-transparent outline-none"
            placeholder="Enter command...">
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-github';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default {
  name: 'App',
  setup() {
    const editorContainer = ref(null);
    const previewFrame = ref(null);
    const activeFile = ref('html');
    const activeView = ref('editor');
    const theme = ref(localStorage.getItem('theme') || 'dark');
    const showThemeDropdown = ref(false);
    const showUploadDropdown = ref(false);
    const showConsole = ref(false);
    const consoleLogs = ref([]);
    const consoleInput = ref('');
    const showSaveTooltip = ref(false);
    const fileInput = ref(null);
    let editor = null;

    const files = [
      { name: 'index.html', type: 'html' },
      { name: 'style.css', type: 'css' },
      { name: 'script.js', type: 'js' }
    ];

    const fileIcons = {
      html: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
      `,
      css: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
      `,
      js: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
      `
    };

    const fileContents = {
      html: ref(`<!DOCTYPE html>
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
</html>`),
      css: ref(`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Pixelify+Sans:wght@400..700&display=swap');

body {
  font-family: "Bebas Neue", sans-serif;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
  min-height: 100vh;
  color: #fff;
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
  font-weight: 500;
  margin-bottom: 0.5rem;
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
}`),
      js: ref(`document.addEventListener('DOMContentLoaded', () => {
  const watermark = document.querySelector('.watermark');
  if (watermark) {
    watermark.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Thanks for using the Code Editor!');
      window.open(e.target.href, '_blank');
    });
  }
});`)
    };

    const themeClass = computed(() => `theme-${theme.value}`);

    const getAceTheme = (themeValue) => {
      if (themeValue === 'system') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'ace/theme/twilight'
          : 'ace/theme/github';
      }
      return themeValue === 'dark' ? 'ace/theme/twilight' : 'ace/theme/github';
    };

    const applyTheme = (newTheme) => {
      let appliedTheme = newTheme;
      if (newTheme === 'system') {
        appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.className = `theme-${appliedTheme}`;
      const aceTheme = getAceTheme(appliedTheme);
      if (editor) {
        editor.setTheme(aceTheme);
      }
    };

    const setTheme = (newTheme) => {
      theme.value = newTheme;
      showThemeDropdown.value = false;
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    };

    const updateEditorOptions = (fileType) => {
      if (editor) {
        editor.session.setMode(`ace/mode/${fileType}`);
        editor.setOption('wrap', fileType === 'css');
      }
    };

    const initEditor = () => {
      if (!editorContainer.value) return;

      ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/');

      editor = ace.edit(editorContainer.value, {
        mode: `ace/mode/${activeFile.value}`,
        theme: getAceTheme(theme.value),
        fontSize: 14,
        showPrintMargin: false,
        highlightActiveLine: false,
        showGutter: true,
        wrap: true,
        useWorker: false,
        scrollPastEnd: 0.5,
      });

      editor.setValue(fileContents[activeFile.value].value, -1);
      editor.on('change', () => {
        fileContents[activeFile.value].value = editor.getValue();
        updatePreviewFrame();
      });
    };

    const updatePreviewFrame = () => {
      if (!previewFrame.value) return;

      const frameDoc = previewFrame.value.contentDocument;
      if (!frameDoc) return;

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>${fileContents.css.value}</style>
          </head>
          <body>
            ${fileContents.html.value}
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
              ${fileContents.js.value}
            <\/script>
          </body>
        </html>
      `);
      frameDoc.close();
    };

    const setActiveFile = (type) => {
      activeFile.value = type;
      if (editor) {
        editor.session.setMode(`ace/mode/${type}`);
        editor.setValue(fileContents[type].value, -1);
        updateEditorOptions(type);
      }
    };

    const setActiveView = (view) => {
      activeView.value = view;
      nextTick(() => {
        if (view === 'editor' && !editor) {
          initEditor();
        } else if (view === 'preview') {
          updatePreviewFrame();
        }
      });
    };

    const toggleConsole = () => {
      showConsole.value = !showConsole.value;
    };

    const clearConsole = () => {
      consoleLogs.value = [];
    };

    const executeConsoleCommand = () => {
      if (!previewFrame.value || !previewFrame.value.contentWindow) return;

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
      zip.file('index.html', fileContents.html.value);
      zip.file('style.css', fileContents.css.value);
      zip.file('script.js', fileContents.js.value);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'project.zip');
    };

    const toggleThemeDropdown = () => {
      showThemeDropdown.value = !showThemeDropdown.value;
    };

    const saveCode = () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      document.cookie = `htmlCode=${encodeURIComponent(fileContents.html.value)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict; Secure`;
      document.cookie = `cssCode=${encodeURIComponent(fileContents.css.value)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict; Secure`;
      document.cookie = `jsCode=${encodeURIComponent(fileContents.js.value)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict; Secure`;

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
            fileContents.html.value = content;
            setActiveFile('html');
          } else if (file.name.endsWith('.css')) {
            fileContents.css.value = content;
            setActiveFile('css');
          } else if (file.name.endsWith('.js')) {
            fileContents.js.value = content;
            setActiveFile('js');
          }
          updatePreviewFrame();
        };
        reader.readAsText(file);
      }
      showUploadDropdown.value = false;
    };

    const loadSavedCode = () => {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
      };

      const htmlCode = getCookie('htmlCode');
      const cssCode = getCookie('cssCode');
      const jsCode = getCookie('jsCode');

      if (htmlCode) fileContents.html.value = htmlCode;
      if (cssCode) fileContents.css.value = cssCode;
      if (jsCode) fileContents.js.value = jsCode;

      if (editor) {
        editor.setValue(fileContents[activeFile.value].value, -1);
      }
      updatePreviewFrame();
    };

    onMounted(() => {
      window.addEventListener('message', (event) => {
        if (event.data && (event.data.type === 'log' || event.data.type === 'error')) {
          consoleLogs.value.push(event.data);
        }
      });

      nextTick(() => {
        initEditor();
        updatePreviewFrame();
        loadSavedCode();
      });

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener(() => {
        if (theme.value === 'system') {
          applyTheme('system');
        }
      });

      window.addEventListener('resize', () => {
        if (editor) {
          editor.resize();
        }
      });

      setTheme(theme.value);
    });

    onUnmounted(() => {
      if (editor) {
        editor.destroy();
      }
    });

    watch(activeFile, (newFile) => {
      const content = fileContents[newFile].value;
      if (editor) {
        editor.setValue(content, -1);
        updateEditorOptions(newFile);
      }
    });

    watch(theme, (newTheme) => {
      setTheme(newTheme);
    });

    return {
      editorContainer,
      previewFrame,
      activeFile,
      activeView,
      theme,
      showThemeDropdown,
      showUploadDropdown,
      showConsole,
      consoleLogs,
      consoleInput,
      showSaveTooltip,
      fileInput,
      files,
      fileIcons,
      themeClass,
      setActiveFile,
      setActiveView,
      toggleConsole,
      clearConsole,
      executeConsoleCommand,
      downloadFiles,
      toggleThemeDropdown,
      setTheme,
      saveCode,
      toggleUploadDropdown,
      triggerFileUpload,
      handleFileUpload,
    };
  }
};
</script>