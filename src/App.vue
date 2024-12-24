<template>
  <div :class="['flex flex-col body-bg h-screen', themeClass]">
    <header class="flex items-center justify-between h-16 px-4 border-b border-muted">
      <div class="flex items-center navv-flex gap-4">
        <div class="flex items-center px-3 gap-2 logo-bg font-semibold cursor-grab">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Code Editor</span>
        </div>
        <div class="flex items-center gap-4">
          <a target="_blank" href="https://github.com/lordofsunshine/Code-Editor-with-Console"
            class="bg-transparent bg-hover p-2 rounded-md button-animation"
            @mouseenter="showTooltip($event, 'GitHub Repository')" @mouseleave="hideTooltip">
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
          <button @click="openDownloadPopup" class="bg-transparent bg-hover p-2 rounded-md button-animation"
            @mouseenter="showTooltip($event, 'Download the Project')" @mouseleave="hideTooltip">
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
            <button @click="saveCode" class="bg-transparent bg-hover p-2 rounded-md button-animation"
              @mouseenter="showTooltip($event, 'Save')" @mouseleave="hideTooltip">
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
          </div>
          <div class="relative">
            <button @click="toggleThemeDropdown" class="bg-transparent bg-hover p-2 rounded-md button-animation"
              @mouseenter="showTooltip($event, 'Toggle theme')" @mouseleave="hideTooltip">
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
                <div v-for="t in themes" :key="t">
                  <button @click="setTheme(t)"
                    :class="['w-full text-left px-2 py-1 cursor-pointer bg-hover flex items-center justify-between button-animation', { 'bg-selected text-primary font-medium': theme === t }]">
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
            <button @click="toggleUploadDropdown" class="bg-transparent bg-navv bg-hover p-2 rounded-md button-animation"
              @mouseenter="showTooltip($event, 'Files Sidebar')" @mouseleave="hideTooltip">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-settings w-4 h-4">
                <path
                  d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z">
                </path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span class="sr-only">Files Sidebar</span>
            </button>
            <transition name="dropdown">
              <div v-if="showUploadDropdown"
                class="absolute upload-dropdown right-0 w-40 bg-dropdown shadow-lg mt-2 rounded-md overflow-hidden z-10">
                <button @click="triggerFileUpload"
                  class="upload-btn w-full text-left px-2 py-1 cursor-pointer hover:bg-hover button-animation">Upload
                  files</button>
              </div>
            </transition>
          </div>
          <input type="file" ref="fileInput" @change="handleFileUpload" multiple style="display: none;"
            accept=".html,.css,.js">
        </div>
        <div class="flex-1 overflow-auto dark-color">
          <div class="width py-2">
            <div v-for="file in files" :key="file.name" @click="setActiveFile(file.type)"
              :class="['flex items-center file-flex text-sm file-bg font-medium cursor-pointer p-block rounded button-animation', { 'bg-selected': activeFile === file.type }]">
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
              <button v-for="view in ['editor', 'preview']" :key="view" @click="setActiveView(view)"
                :class="['px-4 py-2 text-sm font-medium border-b-2 transition-colors button-animation', activeView === view ? 'border-white header-color text-white' : 'border-transparent header-color-end text-gray-400 hover:text-gray-300']">
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
                class="p-2 bg-transparent rounded-md transition-colors duration-200 button-animation"
                @mouseenter="showTooltip($event, 'Open in New Tab')" @mouseleave="hideTooltip">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
            <iframe ref="previewFrame" class="w-full h-full bg-white" src="about:blank"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              title="Preview"></iframe>
          </div>
        </div>
      </div>
    </div>
    <footer class="border-t border-muted">
      <div class="flex items-center justify-between px-4 h-12">
        <div class="flex items-center gap-4">
          <button @click="toggleConsole" class="flex items-center bg-transparent gap-1 p-2 console-icon button-animation"
            @mouseenter="showTooltip($event, 'Toggle Console')" @mouseleave="hideTooltip">
            <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]"
              xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-chevron-down h-4 w-4 transition-transform -rotate-90">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
            Console
            <span class="sr-only">Toggle console</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button @click="formatText" class="bg-transparent bg-hover p-1 rounded-md button-animation"
            @mouseenter="showTooltip($event, 'Format Text')" @mouseleave="hideTooltip">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-align-left">
              <line x1="21" x2="3" y1="6" y2="6"></line>
              <line x1="15" x2="3" y1="12" y2="12"></line>
              <line x1="17" x2="3" y1="18" y2="18"></line>
            </svg>
          </button>
          <button @click="undo" :disabled="!canUndo"
            :class="['bg-transparent bg-hover p-1 rounded-md transition-opacity duration-300 button-animation', { 'opacity-50 cursor-not-allowed': !canUndo }]"
            @mouseenter="showTooltip($event, 'Undo')" @mouseleave="hideTooltip">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-undo-2">
              <path d="M9 14 4 9l5-5"></path>
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
            </svg>
          </button>
          <button @click="redo" :disabled="!canRedo"
            :class="['bg-transparent bg-hover p-1 rounded-md transition-opacity duration-300 button-animation', { 'opacity-50 cursor-not-allowed': !canRedo }]"
            @mouseenter="showTooltip($event, 'Redo')" @mouseleave="hideTooltip">
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
          <button @click="toggleConsole" @mouseenter="showTooltip($event, 'Toggle Console')" @mouseleave="hideTooltip"
            class="flex items-center bg-transparent gap-1 p-2 console-icon button-animation">
            <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]"
              xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-chevron-down h-4 w-4 transition-transform rotate-0">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
            Console
            <span class="sr-only">Toggle console</span>
          </button>
          <button @click="clearConsole" class="text-sm text-blue-500 hover:text-blue-600 button-animation">Clear
            console</button>
        </div>
        <div class="h-48 overflow-auto p-2 font-mono text-sm whitespace-pre custom-scrollbar">
          <div v-for="(log, index) in consoleLogs" :key="index" :class="['mb-1', getMessageTypeClass(log.type)]">
            <span class="select-none text-gray-500 mr-2">{{ log.timestamp }}</span>
            <template v-if="log.command">
              <span class="select-none text-gray-400">></span> {{ log.command }}
            </template>
            <template v-else>
              <span v-if="log.type === 'error'" class="select-none text-red-500">ERROR: </span>
              <span v-else-if="log.type === 'warn'" class="select-none text-yellow-500">WARNING: </span>
              <span v-else-if="log.type === 'info'" class="select-none text-blue-500">INFO: </span>
            <span v-else-if="log.type === 'success'" class="select-none text-green-500">SUCCESS: </span>
            {{ log.message }}
          </template>
        </div>
      </div>
      <div class="flex items-center p-2 border-t border-muted">
        <span class="text-gray-500 mr-2">></span>
        <input v-model="consoleInput" @keyup.enter="executeConsoleCommand"
          class="flex-1 bg-transparent outline-none input-console" placeholder="Enter command...">
      </div>
    </div>
  </transition>
  <transition name="fade">
    <div v-if="showDownloadPopup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="download-popup p-6 w-96">
        <h2 class="text-xl font-bold mb-4">Download Project</h2>
        <input v-model="projectName" class="w-full px-3 py-2 border download-input mb-4"
          placeholder="Enter project name...">
        <div class="flex justify-end">
          <button @click="cancelDownload" style="transition: 0.2s all"
            class="px-4 py-2 text-gr hover:text-gray-800 mr-2 button-animation">Cancel</button>
          <button @click="downloadProject" class="px-4 py-2 download-btn text-white rounded button-animation">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
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
            </svg> Download
          </button>
        </div>
      </div>
    </div>
  </transition>
  <div ref="tooltip" class="tooltip"></div>
</div></template>

<script>
import { useCodeEditor } from './Editor/useCodeEditor.js';

export default {
  name: 'App',
  setup() {
    return useCodeEditor();
  }
};
</script>