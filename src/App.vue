<template>
  <div :class="['flex flex-col body-bg h-screen', themeClass]">
    <transition name="slide-fade">
      <div v-if="showUpdatePopup" class="bg-[#1a1b1e] text-white px-4 py-2 flex items-center justify-center text-sm border-b border-[#2a2b2e]">
        <span>
          code-editor.pro will become unavailable in October, 2025. Please use our 
          <button @click="showAlternativeDomains" class="text-blue-400 hover:text-blue-300 underline mx-1">alternative domains</button>. 
          For all updates, join our <a href="https://discord.gg/FtvCbrc7ZU" target="_blank" class="text-blue-400 hover:text-blue-300 underline mx-1">Discord Server</a>.
        </span>
        <button @click="acknowledgeUpdate" class="ml-4 text-gray-400 hover:text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </transition>
    <header class="flex items-center justify-between h-16 px-4 border-b border-muted">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 logo-container">
            <div class="flex items-center px-3 gap-2 logo-bg font-semibold whitespace-nowrap cursor-grab">
              <span>Code Editor</span>
            </div>
          </div>
          <div class="header-actions hidden md:flex items-center gap-2">
            <button @click="openDownloadPopup" class="bg-transparent bg-hover p-2 rounded-md button-animation"
              @mouseenter="showTooltip($event, 'Download')" @mouseleave="hideTooltip">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" x2="12" y1="15" y2="3"></line>
              </svg>
              <span class="sr-only">Download</span>
            </button>
            <div class="relative">
              <button @click="saveCode" class="bg-transparent bg-hover p-2 rounded-md button-animation save-button"
                :class="{ 'saved': justSaved }">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="size-icon save-icon">
                  <path class="save-path"
                    d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z">
                  </path>
                  <path class="save-path" d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path>
                  <path class="save-path" d="M7 3v4a1 1 0 0 0 1 1h7"></path>
                  <path class="check-path" d="M20 6L9 17l-5-5" style="display: none;"></path>
                </svg>
                <span class="sr-only">Save</span>
              </button>
            </div>
            <div class="relative">
              <button @click="toggleTheme"
                data-dropdown="theme"
                class="bg-transparent bg-hover p-2 rounded-md button-animation theme-toggle-icon"
                @mouseenter="showTooltip($event, 'Toggle theme')" @mouseleave="hideTooltip">
                <svg v-if="theme === 'light'" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" class="lucide lucide-sun size-icon">
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
                <svg v-else-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" class="lucide lucide-moon size-icon">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="lucide lucide-monitor size-icon">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span class="sr-only">Toggle theme</span>
              </button>
            </div>
          </div>
        </div>
        <button @click="runCode"
          class="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 :pointer-events-none :size-4 :shrink-0 rounded-md h-7 text-xs font-medium px-2 bg-run text-background run-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="lucide lucide-play h-3 w-3 mr-1">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
          Run
        </button>
        <div class="flex items-center gap-2">
          <button @click="formatText" class="bg-transparent bg-hover p-1 rounded-md button-animation"
            @mouseenter="showTooltip($event, 'Format')" @mouseleave="hideTooltip">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-undo-2">
              <path d="M9 14 4 9l5-5"></path>
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
            </svg>
          </button>
          <button @click="redo" :disabled="!canRedo"
            :class="['bg-transparent bg-hover p-1 rounded-md transition-opacity duration-300 button-animation', { 'opacity-50 cursor-not-allowed': !canRedo }]"
            @mouseenter="showTooltip($event, 'Redo')" @mouseleave="hideTooltip">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-redo-2">
              <path d="m15 14 5-5-5-5"></path>
              <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"></path>
            </svg>
          </button>
        </div>
      </div>
      <button @click.stop="toggleMobileMenu" class="mobile-menu-button md:hidden">
        <div class="hamburger-icon" :class="{ 'active': isMobileMenuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </header>
    <div class="flex flex-1 overflow-hidden">
      <div class="flex flex-col w-64 border-r border-muted files-block">
        <div class="flex items-center justify-between h-12 px-4 border-b border-muted">
          <span class="text-xs uppercase tracking-wider file-title font-medium">Explorer</span>
          <div class="relative">
            <button @click="triggerFileUpload"
              class="bg-transparent px-3 py-1.5 rounded-md upload-button text-sm font-medium">Upload
            </button>
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
          <div v-show="activeView === 'editor'" class="absolute inset-0 code-bg editor"
            :style="{ opacity: activeView === 'editor' ? 1 : 0 }">
            <div ref="editorContainer" class="w-full h-full"></div>
          </div>
          <div v-show="activeView === 'preview'" class="absolute inset-0 preview"
            :style="{ opacity: activeView === 'preview' ? 1 : 0 }">
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
        <div class="flex items-center justify-between max-width gap-6">
          <button @click="toggleConsole" class="flex items-center bg-transparent gap-1 p-2 console-icon button-animation"
            @mouseenter="showTooltip($event, 'Toggle Terminal')" @mouseleave="hideTooltip">
            <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]"
              xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-chevron-down h-4 w-4 transition-transform -rotate-90">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
            Terminal
            <span class="sr-only">Toggle terminal</span>
          </button>
          <div class="footer-text">
            <span class="file-type">{{ activeFile.toUpperCase() }}</span>
            <span class="encoding flex items-center gap-1">
              <template v-if="isDetectingEncoding">
                <svg class="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Detecting...</span>
              </template>
              <span v-else>{{ currentEncoding }}</span>
            </span>
            <div class="save-info">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Last saved {{ lastSaved ? getLastSavedText(lastSaved) : 'never' }}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
    <transition name="slide-fade">
      <div v-if="showConsole" class="fixed bottom-0 left-0 right-0 bg-console border-t border-muted">
        <div class="flex items-center justify-between p-2 border-b border-muted">
          <button @click="toggleConsole" class="flex items-center bg-transparent gap-1 p-2 console-icon button-animation">
            <svg :class="['ml-1 transform transition-transform', { 'rotate-180': showConsole }]"
              xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-chevron-down h-4 w-4 transition-transform rotate-0">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
            Terminal
            <span class="sr-only">Toggle terminal</span>
          </button>
          <button @click="clearConsole" :class="[
            'text-sm clear-console-btn button-animation',
            consoleLogs.length === 0 ? 'disabled' : 'text-blue-500 hover:text-blue-600'
          ]" :disabled="consoleLogs.length === 0">
            Clear terminal
          </button>
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
            class="flex-1 bg-transparent outline-none input-console" placeholder="Enter command... ( editor help )">
        </div>
      </div>
    </transition>
    <transition name="modal">
      <div v-if="showDownloadPopup" class="modal-backdrop">
        <div class="modern-popup" @click.stop>
          <div class="glass-effect"></div>
          <div class="modern-popup-content">
            <div class="modern-popup-header">
              <h2>Download Project</h2>
              <button @click="cancelDownload" class="close-btn" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            
            <div class="modern-popup-body">
              <div class="input-wrapper">
                <label for="projectName">Project Name</label>
                <input 
                  v-model="projectName"
                  id="projectName"
                  type="text"
                  placeholder="Enter project name..."
                  @keyup.enter="downloadProject"
                  class="modern-input"
                >
              </div>
            </div>

            <div class="modern-popup-footer">
              <button 
                @click="handleDownload" 
                :disabled="!projectName"
                class="download-btn"
                :class="{ 'disabled': !projectName }"
              >
                <span>Download</span>
                <svg width="16" height="16" viewBox="0 0 16 16" class="download-icon">
                  <path d="M8 2v8m0 0l-3-3m3 3l3-3m-7.5 6h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
    <transition name="modal">
      <div v-if="showDomainsPopup" class="modal-backdrop">
        <div class="modern-popup" @click.stop>
          <div class="glass-effect"></div>
          <div class="modern-popup-content">
            <div class="modern-popup-header">
              <h2>Available Domains</h2>
              <button @click="closeDomainsPopup" class="close-btn" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            
            <div class="modern-popup-body domains-list">
              <div class="domain-item" v-for="(domain, index) in alternativeDomains" :key="index">
                <div class="domain-name">
                  <span class="domain-status" :class="domain.status"></span>
                  <a :href="domain.url" target="_blank" class="domain-link">{{ domain.name }}</a>
                </div>
                <div class="domain-info">{{ domain.info }}</div>
              </div>
              
              <div class="discord-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="discord-icon">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="10" r="3"></circle>
                  <path d="M7 16.3c2.2 0 4.3-1 5-2.9"></path>
                  <path d="M17 16.3c-2.2 0-4.3-1-5-2.9"></path>
                </svg>
                <span>Stay updated by joining our <a href="https://discord.gg/FtvCbrc7ZU" target="_blank" class="discord-link">Discord Server</a></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
    <div ref="tooltip" class="tooltip"></div>
    <transition name="mobile-menu">
      <div v-if="isMobileMenuOpen" class="mobile-menu-container" @click.self="toggleMobileMenu">
        <div class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
        <div class="mobile-menu-content" @click.stop>
          <div class="mobile-menu-header">
            <span class="mobile-menu-title">Menu</span>
            <button @click="toggleMobileMenu" class="mobile-menu-close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="mobile-menu-items">
            <div class="mobile-menu-section">
              <div class="mobile-menu-section-title">Actions</div>
              <button @click="runCodeMobile" class="mobile-menu-item mobile-run-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="6 3 20 12 6 21 6 3"></polygon>
                </svg>
                <span>Run</span>
              </button>
              <button @click="saveCodeMobile" class="mobile-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Save</span>
              </button>
              <button @click="openDownloadPopupMobile" class="mobile-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" x2="12" y1="15" y2="3"></line>
                </svg>
                <span>Download</span>
              </button>
            </div>

            <div class="mobile-menu-section">
              <div class="mobile-menu-section-title">Edit</div>
              <button @click="formatTextMobile" class="mobile-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="15" x2="3" y1="12" y2="12"></line>
                  <line x1="17" x2="3" y1="18" y2="18"></line>
                </svg>
                <span>Format</span>
              </button>
              <button @click="undoMobile" :disabled="!canUndo" class="mobile-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 14 4 9l5-5"></path>
                  <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
                </svg>
                <span>Undo</span>
              </button>
              <button @click="redoMobile" :disabled="!canRedo" class="mobile-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m15 14 5-5-5-5"></path>
                  <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"></path>
                </svg>
                <span>Redo</span>
              </button>
            </div>

            <div class="mobile-menu-section">
              <div class="mobile-menu-section-title">Settings</div>
              <button @click="toggleThemeOnly" class="mobile-menu-item">
                <template v-if="theme === 'light'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                </template>
                <template v-else-if="theme === 'dark'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                  </svg>
                </template>
                <template v-else>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" x2="16" y1="21" y2="21"></line>
                    <line x1="12" x2="12" y1="17" y2="21"></line>
                  </svg>
                </template>
                <span>Theme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="slide-fade">
      <div v-if="showErrorPopup" class="error-popup" :class="{ hiding: isErrorPopupHiding }">
        <div class="error-popup-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
            class="error-popup-icon">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="error-popup-message">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useCodeEditor } from './Editor/useCodeEditor.js';

export default {
  name: 'App',
  setup() {
    return useCodeEditor();
  }
};
</script>

<style>
.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
