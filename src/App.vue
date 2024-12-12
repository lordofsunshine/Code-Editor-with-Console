<template>
  <Analytics />
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
          <a title="GitHub Repository" target="_blank" href="https://github.com/lordofsunshine/Code-Editor-with-Console"
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
          <button title="Download the Project" @click="openDownloadPopup" class="bg-transparent bg-hover p-2 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-download size-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            <span class="sr-only">Download the Project</span>
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
            <button title="Files SideBar" @click="toggleUploadDropdown"
              class="bg-transparent bg-navv bg-hover p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-settings w-4 h-4">
                <path
                  d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z">
                </path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span class="sr-only">Files SideBar</span>
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
          <div class="flex items-center justify-between">
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
        </div>

        <div class="flex-1 relative">
          <div v-show="activeView === 'editor'" class="absolute inset-0 code-bg">
            <div ref="editorContainer" class="w-full h-full"></div>
          </div>
          <div v-show="activeView === 'preview'" class="absolute inset-0">
            <div class="absolute top-4 right-4 preview-btn">
              <button v-if="activeView === 'preview'" @click="openPreviewInNewTab"
                class="p-2 bg-transparent rounded-md transition-colors duration-200" title="Open in New Tab">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
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
            <svg :class="['ml-1 transformtransition-transform', { 'rotate-180': showConsole }]"
              xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24">
              <rect width="24" height="24" fill="none" />
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="m7 10l5 5l5-5" />
            </svg>
            <span class="sr-only">Toggle console</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button @click="formatText" class="bg-transparent bg-hover p-1 rounded-md" title="Format Text">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-align-left">
              <line x1="21" x2="3" y1="6" y2="6"></line>
              <line x1="15" x2="3" y1="12" y2="12"></line>
              <line x1="17" x2="3" y1="18" y2="18"></line>
            </svg>
          </button>
          <button @click="undo" :disabled="!canUndo"
            :class="['bg-transparent bg-hover p-1 rounded-md transition-opacity duration-300', { 'opacity-50 cursor-not-allowed': !canUndo }]"
            title="Undo">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-undo-2">
              <path d="M9 14 4 9l5-5"></path>
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
            </svg>
          </button>
          <button @click="redo" :disabled="!canRedo"
            :class="['bg-transparent bg-hover p-1 rounded-md transition-opacity duration-300', { 'opacity-50 cursor-not-allowed': !canRedo }]"
            title="Redo">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-redo-2">
              <path d="m15 14 5-5-5-5"></path>
              <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"></path>
            </svg>
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
          <input v-model="consoleInput" @keyup.enter="executeConsoleCommand"
            class="flex-1 bg-transparent outline-none input-console" placeholder="Enter command...">
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showDownloadPopup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white download-popup p-6 w-96">
          <h2 class="text-xl font-bold mb-4">Download Project</h2>
          <input v-model="projectName" class="w-full px-3 py-2 border download-input mb-4"
            placeholder="Enter project name...">
          <div class="flex justify-end">
            <button @click="cancelDownload" style="transition: 0.2s all"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 mr-2">Cancel</button>
            <button @click="downloadProject" class="px-4 py-2 download-btn text-white rounded"><svg
                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                  <path stroke-dasharray="2 4" stroke-dashoffset="6" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9">
                    <animate attributeName="stroke-dashoffset" dur="0.63s" repeatCount="indefinite" values="6;0" />
                  </path>
                  <path stroke-dasharray="32" stroke-dashoffset="32"
                    d="M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9">
                    <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.105s" dur="0.42s" values="32;0" />
                  </path>
                  <path stroke-dasharray="10" stroke-dashoffset="10" d="M12 8v7.5">
                    <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.525s" dur="0.21s" values="10;0" />
                  </path>
                  <path stroke-dasharray="6" stroke-dashoffset="6" d="M12 15.5l3.5 -3.5M12 15.5l-3.5 -3.5">
                    <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.735s" dur="0.21s" values="6;0" />
                  </path>
                </g>
              </svg> Download</button>
          </div>
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
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-beautify';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Cookies from 'js-cookie';
import { inject } from "@vercel/analytics";

export default {
  name: 'App',
  setup() {
    const editorContainer = ref(null);
    const previewFrame = ref(null);
    const activeFile = ref('html');
    const activeView = ref('editor');
    const theme = ref(getCookie('theme') || 'dark');
    const showThemeDropdown = ref(false);
    const showUploadDropdown = ref(false);
    const showConsole = ref(false);
    const consoleLogs = ref([]);
    const consoleInput = ref('');
    const showSaveTooltip = ref(false);
    const fileInput = ref(null);
    const previewWindow = ref(null);
    const showDownloadPopup = ref(false);
    const projectName = ref('');
    const canUndo = ref(false);
    const canRedo = ref(false);
    let editor = null;

    const files = [
      { name: 'index.html', type: 'html' },
      { name: 'style.css', type: 'css' },
      { name: 'script.js', type: 'js' }
    ];

    const fileIcons = {
      html: `
<svg class="w-4 h-4" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8.34247L15.6575 4H6C4.89543 4 4 4.89543 4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><text x="12" y="13" font-size="6" fill="currentColor" text-anchor="middle" dominant-baseline="middle">HTML</text></svg>
      `,
      css: `
<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8.34247L15.6575 4H6C4.89543 4 4 4.89543 4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><text x="12" y="13" font-size="6" fill="currentColor" text-anchor="middle" dominant-baseline="middle">CSS</text></svg>
      `,
      js: `
<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8.34247L15.6575 4H6C4.89543 4 4 4.89543 4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><text x="12" y="13" font-size="6" fill="currentColor" text-anchor="middle" dominant-baseline="middle">JS</text></svg>
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

    function getCookie(name) {
      return Cookies.get(name);
    }

    function setCookie(name, value) {
      const secure = window.location.protocol === 'https:';
      Cookies.set(name, value, {
        expires: 7,
        secure: secure,
        sameSite: 'strict',
        path: '/'
      });
    }

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
      setCookie('theme', newTheme);
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
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
      });
      fileContents[activeFile.value].session = editor.getSession();
      editor.setValue(fileContents[activeFile.value].value, -1);
      editor.on('change', () => {
        fileContents[activeFile.value].value = editor.getValue();
        updatePreviewFrame();
        if (previewWindow.value && !previewWindow.value.closed) {
          updateExternalPreview();
        }
        updateUndoRedoState();
      });
      updateUndoRedoState();
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

    const updateExternalPreview = () => {
      if (previewWindow.value && !previewWindow.value.closed) {
        previewWindow.value.document.open();
        previewWindow.value.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>${fileContents.css.value}</style>
            </head>
            <body>
              ${fileContents.html.value}
              <script>${fileContents.js.value}<\/script>
            </body>
          </html>
        `);
        previewWindow.value.document.close();
      }
    };

    const setActiveFile = (type) => {
      activeFile.value = type;
      if (editor) {
        if (!fileContents[type].session) {
          fileContents[type].session = ace.createEditSession(fileContents[type].value);
          fileContents[type].session.setMode(`ace/mode/${type}`);
        }
        editor.setSession(fileContents[type].session);
        updateEditorOptions(type);
        updateUndoRedoState();
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

    const openDownloadPopup = () => {
      showDownloadPopup.value = true;
    };

    const cancelDownload = () => {
      showDownloadPopup.value = false;
      projectName.value = '';
    };

    const downloadProject = async () => {
      const zip = new JSZip();
      zip.file('index.html', fileContents.html.value);
      zip.file('style.css', fileContents.css.value);
      zip.file('script.js', fileContents.js.value);

      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = projectName.value.trim() ? `${projectName.value}.zip` : 'website.zip';
      saveAs(content, fileName);

      showDownloadPopup.value = false;
      projectName.value = '';
    };

    const toggleThemeDropdown = () => {
      showThemeDropdown.value = !showThemeDropdown.value;
    };

    const saveCode = () => {
      const csrfToken = Math.random().toString(36).substring(2);
      setCookie('csrf_token', csrfToken);

      const htmlContent = fileContents.html.value;
      const cssContent = fileContents.css.value;
      const jsContent = fileContents.js.value;

      setCookie('htmlCode', htmlContent);
      setCookie('cssCode', cssContent);
      setCookie('jsCode', jsContent);

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
          if (editor) {
            editor.setValue(content, -1);
          }
          updatePreviewFrame();
        };
        reader.readAsText(file);
      }
      showUploadDropdown.value = false;
    };

    const loadSavedCode = () => {
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

    const openPreviewInNewTab = () => {
      if (previewWindow.value && !previewWindow.value.closed) {
        previewWindow.value.focus();
        updateExternalPreview();
      } else {
        previewWindow.value = window.open('', '_blank');
        if (previewWindow.value) {
          updateExternalPreview();
        }
      }
    };

    const formatText = () => {
      if (editor) {
        const beautify = ace.require("ace/ext/beautify");
        beautify.beautify(editor.session);
      }
    };

    const updateUndoRedoState = () => {
      if (editor && editor.session) {
        canUndo.value = editor.session.getUndoManager().hasUndo();
        canRedo.value = editor.session.getUndoManager().hasRedo();
      }
    };

    const undo = () => {
      if (editor && editor.session === fileContents[activeFile.value].session && canUndo.value) {
        editor.undo();
        updateUndoRedoState();
      }
    };

    const redo = () => {
      if (editor && editor.session === fileContents[activeFile.value].session && canRedo.value) {
        editor.redo();
        updateUndoRedoState();
      }
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
      if (previewWindow.value && !previewWindow.value.closed) {
        previewWindow.value.close();
      }
    });

    watch(activeFile, (newFile) => {
      if (editor) {
        if (!fileContents[newFile].session) {
          fileContents[newFile].session = ace.createEditSession(fileContents[newFile].value);
          fileContents[newFile].session.setMode(`ace/mode/${newFile}`);
        }
        editor.setSession(fileContents[newFile].session);
        updateEditorOptions(newFile);
        updateUndoRedoState();
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
      showDownloadPopup,
      projectName,
      canUndo,
      canRedo,
      setActiveFile,
      setActiveView,
      toggleConsole,
      clearConsole,
      executeConsoleCommand,
      openDownloadPopup,
      cancelDownload,
      downloadProject,
      toggleThemeDropdown,
      setTheme,
      saveCode,
      toggleUploadDropdown,
      triggerFileUpload,
      handleFileUpload,
      openPreviewInNewTab,
      formatText,
      undo,
      redo,
    };
  }
};
</script>
