import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import ace from "ace-builds";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-twilight";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-beautify";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import confetti from "canvas-confetti";
import { runConfetti } from "./confetti.js";

export function useCodeEditor() {
  const editorContainer = ref(null);
  const previewFrame = ref(null);
  const activeFile = ref("html");
  const activeView = ref("editor");
  const theme = ref(localStorage.getItem("theme") || "dark");
  const showThemeDropdown = ref(false);
  const showUploadDropdown = ref(false);
  const showConsole = ref(false);
  const consoleLogs = ref([]);
  const consoleInput = ref("");
  const showSaveTooltip = ref(false);
  const fileInput = ref(null);
  const previewWindow = ref(null);
  const showDownloadPopup = ref(false);
  const projectName = ref("");
  const canUndo = ref(false);
  const canRedo = ref(false);
  const tooltip = ref(null);
  const hasUnsavedChanges = ref(false);
  const justSaved = ref(false);
  let editor = null;

  const editorTheme = ref(localStorage.getItem("editorTheme") || "dark");
  const editorFontSize = ref(
    Number.parseInt(localStorage.getItem("editorFontSize") || "14"),
  );
  const editorAutocomplete = ref(
    localStorage.getItem("editorAutocomplete") !== "false",
  );
  const editorLineNumbers = ref(
    localStorage.getItem("editorLineNumbers") !== "false",
  );
  const editorWrap = ref(localStorage.getItem("editorWrap") !== "false");

  const currentLanguage = ref("HTML");
  const currentEncoding = ref("UTF-8");
  const lastSaved = ref(null);

  const files = [
    { name: "index.html", type: "html" },
    { name: "style.css", type: "css" },
    { name: "script.js", type: "js" },
  ];

  const fileIcons = {
    html: `<svg class="w-4 h-4" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8.34247L15.6575 4H6C4.89543 4 4 4.89543 4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><text x="12" y="13" font-size="6" fill="currentColor" text-anchor="middle" dominant-baseline="middle">HTML</text></svg>`,
    css: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8.34247L15.6575 4H6C4.89543 4 4 4.89543 4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><text x="12" y="13" font-size="6" fill="currentColor" text-anchor="middle" dominant-baseline="middle">CSS</text></svg>`,
    js: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8.34247L15.6575 4H6C4.89543 4 4 4.89543 4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><text x="12" y="13" font-size="6" fill="currentColor" text-anchor="middle" dominant-baseline="middle">JS</text></svg>`,
  };

  const fileContents = {
    html: ref(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Modern Code Editor - Write, Edit, and Preview Code in Real-time">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <title>Modern Code Editor</title>
</head>
<body>
    <main class="container">
        <div class="hero">
            <h1 class="title">Welcome to Code Editor</h1>
            <p class="subtitle">A modern, lightweight code editor for web development</p>
            
            <div class="features">
                <div class="feature-card">
                    <span class="feature-icon">⚡</span>
                    <h2>Fast & Responsive</h2>
                    <p>Edit code in real-time with instant preview</p>
                </div>
                
                <div class="feature-card">
                    <span class="feature-icon">🎨</span>
                    <h2>Beautiful UI</h2>
                    <p>Clean and modern interface for better coding experience</p>
                </div>
                
                <div class="feature-card">
                    <span class="feature-icon">🚀</span>
                    <h2>Easy to Use</h2>
                    <p>Simple yet powerful features for developers</p>
                </div>
            </div>
        </div>
    </main>
</body>
</html>`),

    css: ref(`:root {
    --primary-color: #ffffff;
    --secondary-color: #d1d1d1;
    --background: #000000;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --card-bg: rgba(255, 255, 255, 0.05);
    --border-color: rgba(255, 255, 255, 0.1);
    --shadow-color: rgba(0, 0, 0, 0.8);
}

*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--background);
    color: var(--text-primary);
    line-height: 1.6;
    min-height: 100vh;
    display: grid;
    place-items: center;
}

.container {
    width: min(90%, 1200px);
    margin-inline: auto;
    padding: 2rem;
}

.hero {
    text-align: center;
    animation: fadeIn 0.8s ease-out;
}

.title {
    font-size: clamp(2rem, 5vw, 4rem);
    font-weight: 800;
    background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
    -webkit-background-clip: text;
    color: transparent;
    margin-bottom: 1rem;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
}

.subtitle {
    color: var(--text-secondary);
    font-size: clamp(1rem, 2vw, 1.25rem);
    margin-bottom: 3rem;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin: 3rem 0;
}

.feature-card {
    background: linear-gradient(145deg, #111111, #000000);
    padding: 2rem;
    border-radius: 1rem;
    border: 1px solid var(--border-color);
    box-shadow: 0 25px 50px -12px var(--shadow-color);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #ffffff, transparent);
    animation: shimmer 2s infinite linear;
}

.feature-card:hover {
    transform: translateY(-5px);
    border-color: rgba(255, 255, 255, 0.2);
}

.feature-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    display: inline-block;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
}

.feature-card h2 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
}

.feature-card p {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes shimmer {
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(100%);
    }
}

@media (max-width: 768px) {
    .features {
        grid-template-columns: 1fr;
    }
    
    .feature-card {
        padding: 1.5rem;
    }
}
`),

    js: ref(`document.addEventListener('DOMContentLoaded', () => {
    const features = document.querySelectorAll('.feature-card')
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px'
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1'
                entry.target.style.transform = 'translateY(0)'
                observer.unobserve(entry.target)
            }
        })
    }, observerOptions)
    
    features.forEach(feature => {
        feature.style.opacity = '0'
        feature.style.transform = 'translateY(20px)'
        feature.style.transition = 'all 0.6s ease-out'
        observer.observe(feature)
    })

    features.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            card.style.setProperty('--x', \`\${x}px\`)
            card.style.setProperty('--y', \`\${y}px\`)
        })
    })

    console.log(
        '%cWelcome to Code Editor! 🚀',
        'color: #ffffff; font-size: 24px; font-weight: bold; text-shadow: 0 0 10px rgba(255,255,255,0.5);'
    )
})`),
  };

  const themeClass = computed(() => `theme-${theme.value}`);

  const themes = ["light", "dark", "system"];

  const getAceTheme = (themeValue) => {
    if (themeValue === "system") {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "ace/theme/twilight"
        : "ace/theme/github";
    }
    return themeValue === "dark" ? "ace/theme/twilight" : "ace/theme/github";
  };

  const getMessagePrefix = (type) => {
    switch (type) {
      case "error":
        return "ERROR: ";
      case "warn":
        return "WARNING: ";
      case "info":
        return "INFO: ";
      case "success":
        return "SUCCESS: ";
      default:
        return "";
    }
  };

  const getMessageTypeClass = (type) => {
    switch (type) {
      case "error":
        return "text-red-500";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      case "success":
        return "text-green-500";
      default:
        return "text-gray-400";
    }
  };

  const applyTheme = (newTheme) => {
    let appliedTheme = newTheme;
    if (newTheme === "system") {
      appliedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.className = `theme-${appliedTheme}`;
    const aceTheme = getAceTheme(appliedTheme);
    if (editor) {
      editor.setTheme(aceTheme);
    }
  };

  const setTheme = (newTheme) => {
    theme.value = newTheme;
    editorTheme.value = newTheme;
    localStorage.setItem("theme", newTheme);
    localStorage.setItem("editorTheme", newTheme);
    showThemeDropdown.value = false;
    applyTheme(newTheme);
  };

  const updateEditorOptions = (fileType) => {
    if (editor) {
      const session = editor.getSession();
      session.setMode(
        `ace/mode/${fileType === "js" ? "javascript" : fileType}`,
      );

      if (fileType === "css") {
        session.setOption("useWorker", false);
      } else {
        session.setOption("useWorker", false);
      }

      editor.setOption("wrap", editorWrap.value);
    }
  };

  const isInitialLoad = ref(true);

  const initEditor = () => {
    if (!editorContainer.value) return;

    ace.config.set(
      "basePath",
      "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/",
    );

    editor = ace.edit(editorContainer.value, {
      mode: `ace/mode/${activeFile.value === "js" ? "javascript" : activeFile.value}`,
      theme: getAceTheme(editorTheme.value),
      fontSize: editorFontSize.value,
      showPrintMargin: false,
      highlightActiveLine: false,
      showGutter: editorLineNumbers.value,
      wrap: editorWrap.value,
      useWorker: false,
      scrollPastEnd: 0.5,
      enableBasicAutocompletion: editorAutocomplete.value,
      enableLiveAutocompletion: editorAutocomplete.value,
      enableSnippets: true,
    });

    editor
      .getSession()
      .setMode(
        `ace/mode/${activeFile.value === "js" ? "javascript" : activeFile.value}`,
      );

    if (fileContents[activeFile.value].value) {
      editor.setValue(fileContents[activeFile.value].value, -1);
    }

    fileContents[activeFile.value].session = editor.getSession();

    editor.on("change", () => {
      fileContents[activeFile.value].value = editor.getValue();
      hasUnsavedChanges.value = true;
      updateUndoRedoState();
    });

    updateUndoRedoState();
    updatePreviewFrame();
  };

  const createPreviewContent = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${fileContents.css.value}</style>
        </head>
        <body>
          ${fileContents.html.value}
          <script>
            window.onerror = function(msg, url, lineNo, columnNo, error) {
              window.parent.postMessage({
                type: 'error',
                message: msg
              }, '*');
              return false;
            };

            ${fileContents.js.value}
          </script>
        </body>
      </html>
    `;
  };

  const updatePreviewFrame = () => {
    if (!previewFrame.value) return;

    const htmlContent = fileContents.html.value;
    const cssContent = fileContents.css.value;
    const jsContent = fileContents.js.value;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssContent}</style>
        </head>
        <body>
          ${htmlContent}
          <script>${jsContent}</script>
        </body>
      </html>
    `;

    const previewDocument =
      previewFrame.value.contentDocument ||
      previewFrame.value.contentWindow.document;
    previewDocument.open();
    previewDocument.write(content);
    previewDocument.close();
  };

  const openPreviewInNewTab = () => {
    const content = createPreviewContent();
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    previewWindow.value = window.open(url, "_blank");
  };

  const updateExternalPreview = () => {
    if (previewWindow.value && !previewWindow.value.closed) {
      const content = createPreviewContent();
      previewWindow.value.document.open();
      previewWindow.value.document.write(content);
      previewWindow.value.document.close();
    }
  };

  const setActiveFile = (type) => {
    activeFile.value = type;
    if (editor) {
      if (!fileContents[type].session) {
        fileContents[type].session = ace.createEditSession(
          fileContents[type].value,
        );
        fileContents[type].session.setMode(
          `ace/mode/${type === "js" ? "javascript" : type}`,
        );
      }
      editor.setSession(fileContents[type].session);
      updateEditorOptions(type);
      updateUndoRedoState();
    }
    const url = new URL(window.location);
    url.searchParams.set("file", files.find((file) => file.type === type).name);
    window.history.pushState({}, "", url);
    updateLanguageAndEncoding();
  };

  const setActiveView = (view) => {
    activeView.value = view;
    nextTick(() => {
      if (view === "editor" && !editor) {
        initEditor();
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
    if (!consoleInput.value.trim()) return;

    const command = consoleInput.value;
    const timestamp = new Date().toLocaleTimeString();

    consoleLogs.value.push({
      type: "command",
      command: command,
      timestamp: timestamp,
    });

    try {
      if (command.startsWith("editor ")) {
        const editorCommand = command.slice(7).trim();
        executeEditorCommand(editorCommand);
      } else if (command === "clear") {
        clearConsole();
      } else if (previewFrame.value && previewFrame.value.contentWindow) {
        const result = previewFrame.value.contentWindow.eval(command);
        consoleLogs.value.push({
          type: "success",
          message: result !== undefined ? String(result) : "undefined",
          timestamp: timestamp,
        });
      }
    } catch (error) {
      consoleLogs.value.push({
        type: "error",
        message: error.message,
        timestamp: timestamp,
      });
    }

    consoleInput.value = "";
  };

  const executeEditorCommand = (command) => {
    const timestamp = new Date().toLocaleTimeString();
    const [action, ...args] = command.split(" ");

    switch (action) {
      case "theme":
        if (args.length > 0 && themes.includes(args[0])) {
          setTheme(args[0]);
          consoleLogs.value.push({
            type: "success",
            message: `Editor theme changed to ${args[0]}`,
            timestamp: timestamp,
          });
        } else {
          consoleLogs.value.push({
            type: "error",
            message: "Invalid theme. Available themes: " + themes.join(", "),
            timestamp: timestamp,
          });
        }
        break;
      case "fontsize":
        if (args.length > 0 && !isNaN(args[0])) {
          const fontSize = Number.parseInt(args[0]);
          if (fontSize >= 8 && fontSize <= 30) {
            editorFontSize.value = fontSize;
            editor.setFontSize(fontSize);
            localStorage.setItem("editorFontSize", fontSize);
            consoleLogs.value.push({
              type: "success",
              message: `Font size changed to ${fontSize}`,
              timestamp: timestamp,
            });
          } else {
            consoleLogs.value.push({
              type: "error",
              message: "Font size must be between 8 and 30",
              timestamp: timestamp,
            });
          }
        } else {
          consoleLogs.value.push({
            type: "error",
            message: "Invalid font size. Usage: editor fontsize [size]",
            timestamp: timestamp,
          });
        }
        break;
      case "autocomplete":
        editorAutocomplete.value = !editorAutocomplete.value;
        editor.setOptions({
          enableBasicAutocompletion: editorAutocomplete.value,
          enableLiveAutocompletion: editorAutocomplete.value,
        });
        localStorage.setItem("editorAutocomplete", editorAutocomplete.value);
        consoleLogs.value.push({
          type: "success",
          message: `Autocomplete ${editorAutocomplete.value ? "enabled" : "disabled"}`,
          timestamp: timestamp,
        });
        break;
      case "linenumbers":
        editorLineNumbers.value = !editorLineNumbers.value;
        editor.setOption("showGutter", editorLineNumbers.value);
        localStorage.setItem("editorLineNumbers", editorLineNumbers.value);
        consoleLogs.value.push({
          type: "success",
          message: `Line numbers ${editorLineNumbers.value ? "shown" : "hidden"}`,
          timestamp: timestamp,
        });
        break;
      case "wrap":
        editorWrap.value = !editorWrap.value;
        editor.setOption("wrap", editorWrap.value);
        localStorage.setItem("editorWrap", editorWrap.value);
        consoleLogs.value.push({
          type: "success",
          message: `Line wrap ${editorWrap.value ? "enabled" : "disabled"}`,
          timestamp: timestamp,
        });
        break;
      case "format":
        formatText();
        consoleLogs.value.push({
          type: "success",
          message: "Code formatted",
          timestamp: timestamp,
        });
        break;
      case "help":
        const helpCommands = [
          "Available commands:",
          "- editor theme [theme]: Change editor theme (light, dark, system)",
          "- editor fontsize [size]: Change font size (8-30)",
          "- editor autocomplete: Toggle autocomplete",
          "- editor linenumbers: Toggle line numbers",
          "- editor wrap: Toggle line wrap",
          "- editor format: Format code",
          "- editor help: Show this help message",
        ];
        const helpMessage = helpCommands.join("\n");
        consoleLogs.value.push({
          type: "info",
          message: helpMessage,
          timestamp: timestamp,
        });
        break;
      default:
        consoleLogs.value.push({
          type: "error",
          message: `Unknown editor command: ${action}. Type 'editor help' for available commands.`,
          timestamp: timestamp,
        });
    }
  };

  const openDownloadPopup = () => {
    showDownloadPopup.value = true;
  };

  const cancelDownload = () => {
    showDownloadPopup.value = false;
    projectName.value = "";
  };

  const downloadProject = async () => {
    const zip = new JSZip();
    zip.file("index.html", fileContents.html.value);
    zip.file("style.css", fileContents.css.value);
    zip.file("script.js", fileContents.js.value);

    const content = await zip.generateAsync({ type: "blob" });
    const fileName = projectName.value.trim()
      ? `${projectName.value}.zip`
      : "website.zip";
    saveAs(content, fileName);

    showDownloadPopup.value = false;
    projectName.value = "";
  };

  const toggleThemeDropdown = () => {
    showThemeDropdown.value = !showThemeDropdown.value;
  };

  const saveCode = () => {
    localStorage.setItem("htmlCode", fileContents.html.value);
    localStorage.setItem("cssCode", fileContents.css.value);
    localStorage.setItem("jsCode", fileContents.js.value);
    hasUnsavedChanges.value = false;

    lastSaved.value = new Date();
    localStorage.setItem("lastSavedTime", lastSaved.value.toISOString());

    showSaveTooltip.value = true;
    setTimeout(() => {
      showSaveTooltip.value = false;
    }, 2000);

    justSaved.value = true;
    setTimeout(() => {
      justSaved.value = false;
    }, 1500);
  };

  const toggleUploadDropdown = () => {
    showUploadDropdown.value = !showUploadDropdown.value;
  };

  const triggerFileUpload = () => {
    fileInput.value.click();
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const validExtensions = [".html", ".css", ".js"];

    const invalidFiles = files.filter(
      (file) =>
        !validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)),
    );

    if (invalidFiles.length > 0) {
      consoleLogs.value.push({
        type: "error",
        message: `Invalid file type(s): ${invalidFiles.map((f) => f.name).join(", ")}. Only .html, .css, and .js files are supported.`,
        timestamp: new Date().toLocaleTimeString(),
      });
      event.target.value = "";
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        if (file.name.endsWith(".html")) {
          fileContents.html.value = content;
          setActiveFile("html");
        } else if (file.name.endsWith(".css")) {
          fileContents.css.value = content;
          setActiveFile("css");
        } else if (file.name.endsWith(".js")) {
          fileContents.js.value = content;
          setActiveFile("js");
        }
        if (editor) {
          editor.setValue(content, -1);
        }
      };
      reader.readAsText(file);
    });

    showUploadDropdown.value = false;
    event.target.value = "";
  };

  const loadSavedCode = () => {
    const htmlCode = localStorage.getItem("htmlCode");
    const cssCode = localStorage.getItem("cssCode");
    const jsCode = localStorage.getItem("jsCode");

    if (htmlCode) fileContents.html.value = htmlCode;
    if (cssCode) fileContents.css.value = cssCode;
    if (jsCode) fileContents.js.value = jsCode;

    if (editor) {
      editor.setValue(fileContents[activeFile.value].value, -1);
    }
    hasUnsavedChanges.value = false;

    const savedTime = localStorage.getItem("lastSavedTime");
    if (savedTime) {
      lastSaved.value = new Date(savedTime);
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
    if (
      editor &&
      editor.session === fileContents[activeFile.value].session &&
      canUndo.value
    ) {
      editor.undo();
      updateUndoRedoState();
    }
  };

  const redo = () => {
    if (
      editor &&
      editor.session === fileContents[activeFile.value].session &&
      canRedo.value
    ) {
      editor.redo();
      updateUndoRedoState();
    }
  };

  let tooltipTimer;

  const showTooltip = (event, text) => {
    clearTimeout(tooltipTimer);

    tooltipTimer = setTimeout(() => {
      if (tooltip.value) {
        const rect = event.target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        tooltip.value.textContent = text;
        tooltip.value.style.opacity = "0";
        tooltip.value.style.display = "block";

        const tooltipRect = tooltip.value.getBoundingClientRect();

        let left = rect.left + (rect.width - tooltipRect.width) / 2;
        let top = rect.bottom + 10;

        if (left < 0) {
          left = 0;
        } else if (left + tooltipRect.width > viewportWidth) {
          left = viewportWidth - tooltipRect.width;
        }

        if (top + tooltipRect.height > viewportHeight) {
          top = rect.top - tooltipRect.height - 10;
        }

        tooltip.value.style.left = `${left}px`;
        tooltip.value.style.top = `${top}px`;

        tooltip.value.style.opacity = "1";
      }
    }, 1000);
  };

  const hideTooltip = () => {
    clearTimeout(tooltipTimer);

    if (tooltip.value) {
      tooltip.value.style.opacity = "0";
      setTimeout(() => {
        tooltip.value.style.display = "none";
      }, 300);
    }
  };

  const handleButtonClick = (event) => {
    const button = event.currentTarget;
    button.style.transform = "scale(0.95)";
    setTimeout(() => {
      button.style.transform = "scale(1)";
    }, 200);
  };

  const hasRunOnce = ref(false);

  const runCode = () => {
    if (!editor) return;

    try {
      clearConsole();

      fileContents[activeFile.value].value = editor.getValue();

      activeView.value = "preview";

      if (!hasRunOnce.value) {
        runConfetti();
        hasRunOnce.value = true;
        localStorage.setItem("hasRunOnce", "true");
      }

      updatePreviewFrame();
    } catch (error) {
      consoleLogs.value.push({
        type: "error",
        message: error.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  const toggleTheme = () => {
    const themes = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const updateLanguageAndEncoding = () => {
    const fileExtensions = {
      html: "HTML",
      css: "CSS",
      js: "JavaScript",
    };
    currentLanguage.value = fileExtensions[activeFile.value] || "Unknown";
    currentEncoding.value = "UTF-8";
  };

  const getLastSavedText = (date) => {
    if (!date) return "never";

    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return "now";
    }
  };

  const formatLastSaved = computed(() => {
    if (!lastSaved.value) return "never";

    const date = new Date(lastSaved.value);
    if (isNaN(date.getTime())) return "never";

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  });

  const isMobileMenuOpen = ref(false);

  const toggleMobileMenu = (event) => {
    if (event) {
      event.stopPropagation();
    }

    isMobileMenuOpen.value = !isMobileMenuOpen.value;

    if (isMobileMenuOpen.value) {
      document.body.style.overflow = "hidden";
      document.addEventListener("click", handleClickOutside);
    } else {
      document.body.style.overflow = "";
      document.removeEventListener("click", handleClickOutside);
    }
  };

  const handleClickOutside = (event) => {
    const mobileMenu = document.querySelector(".mobile-menu-content");
    const hamburgerButton = document.querySelector(".mobile-menu-button");

    if (
      mobileMenu &&
      !mobileMenu.contains(event.target) &&
      hamburgerButton &&
      !hamburgerButton.contains(event.target)
    ) {
      toggleMobileMenu();
    }
  };

  const runCodeMobile = () => {
    runCode();
    toggleMobileMenu();
  };

  const formatTextMobile = () => {
    formatText();
    toggleMobileMenu();
  };

  const undoMobile = () => {
    undo();
    toggleMobileMenu();
  };

  const redoMobile = () => {
    redo();
    toggleMobileMenu();
  };

  const saveCodeMobile = () => {
    saveCode();
    toggleMobileMenu();
  };

  const toggleThemeMobile = () => {
    toggleTheme();
    toggleMobileMenu();
  };

  const toggleThemeOnly = () => {
    toggleTheme();
  };

  const previewError = ref(null);

  const handleFileFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileFromUrl = urlParams.get("file");

    if (fileFromUrl) {
      const fileType = files.find((file) => file.name === fileFromUrl)?.type;
      if (fileType) {
        setActiveFile(fileType);
        previewError.value = null;
      } else {
        setActiveView("preview");
        previewError.value = {
          title: "File Not Found",
          message: `The requested file "${fileFromUrl}" does not exist or was not found.`,
          icon: "🔍",
        };
        fileContents.html.value = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        .error-container {
            font-family: system-ui, -apple-system, sans-serif;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000000;
            margin: 0;
            padding: 1rem;
        }
        
        .error-card {
            background: linear-gradient(145deg, #111111, #000000);
            padding: 3rem;
            border-radius: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            text-align: center;
            animation: slideIn 0.5s ease-out;
            max-width: 90%;
            width: 450px;
            position: relative;
            overflow: hidden;
        }
        
        .error-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #ffffff, #808080, #404040);
            animation: shimmer 2s linear infinite;
        }
        
        .error-icon {
            font-size: 4.5rem;
            margin-bottom: 1.5rem;
            display: inline-block;
            animation: bounce 2s ease infinite;
            filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
        }
        
        .error-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(to right, #ffffff, #d1d1d1);
            -webkit-background-clip: text;
            color: transparent;
            letter-spacing: -0.025em;
        }
        
        .error-message {
            color: #a0a0a0;
            line-height: 1.8;
            font-size: 1.1rem;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes bounce {
            0%, 100% {
                transform: translateY(0) scale(1);
            }
            50% {
                transform: translateY(-15px) scale(1.1);
            }
        }
        
        @keyframes shimmer {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(100%);
            }
        }
        
        .error-card::after {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at top right, 
                                      rgba(255, 255, 255, 0.1),
                                      transparent 300px);
            pointer-events: none;
        }
    </style>
</head>
<body class="error-container">
    <div class="error-card">
        <span class="error-icon">${previewError.value.icon}</span>
        <h1 class="error-title">${previewError.value.title}</h1>
        <p class="error-message">${previewError.value.message}</p>
    </div>
</body>
</html>`;
      }
    } else {
      setActiveFile("html");
    }
  };

  let lastError = null;
  let lastErrorTime = 0;

  onMounted(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
    }
    window.addEventListener("message", (event) => {
      if (
        event.data &&
        (event.data.type === "log" ||
          event.data.type === "error" ||
          event.data.type === "warn" ||
          event.data.type === "info" ||
          event.data.type === "evalResult")
      ) {
        if (event.data.type === "evalResult") {
          const messageType = event.data.error ? "error" : "success";
          consoleLogs.value.push({
            type: messageType,
            message: event.data.error || event.data.result,
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          consoleLogs.value.push({
            ...event.data,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    });

    nextTick(() => {
      initEditor();
      loadSavedCode();
      handleFileFromUrl();
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addListener(() => {
      if (theme.value === "system") {
        applyTheme("system");
      }
    });

    window.addEventListener("resize", () => {
      if (editor) {
        editor.resize();
      }
    });

    setTheme(editorTheme.value);

    if (editor) {
      editor.setFontSize(editorFontSize.value);
      editor.setOptions({
        enableBasicAutocompletion: editorAutocomplete.value,
        enableLiveAutocompletion: editorAutocomplete.value,
        showGutter: editorLineNumbers.value,
        wrap: editorWrap.value,
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const fileFromUrl = urlParams.get("file");
    if (fileFromUrl) {
      const fileType = files.find((file) => file.name === fileFromUrl)?.type;
      if (fileType) {
        setActiveFile(fileType);
      } else {
        setActiveView("preview");
        consoleLogs.value.push({
          type: "error",
          message: "The requested file does not exist or was not found.",
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } else {
      setActiveFile("html");
    }

    window.addEventListener("beforeunload", (event) => {
      if (hasUnsavedChanges.value) {
        event.preventDefault();
        event.returnValue = "";
      }
    });

    const savedFontSize = localStorage.getItem("fontSize");
    if (savedFontSize && editor) {
      editor.setFontSize(Number.parseInt(savedFontSize));
    }

    const savedAutocomplete = localStorage.getItem("autocomplete");
    if (savedAutocomplete !== null && editor) {
      const autocompleteEnabled = savedAutocomplete === "true";
      editor.setOptions({
        enableBasicAutocompletion: autocompleteEnabled,
        enableLiveAutocompletion: autocompleteEnabled,
      });
    }

    const savedShowLineNumbers = localStorage.getItem("showLineNumbers");
    if (savedShowLineNumbers !== null && editor) {
      editor.setOption("showGutter", savedShowLineNumbers === "true");
    }

    const savedWrap = localStorage.getItem("wrap");
    if (savedWrap !== null && editor) {
      editor.setOption("wrap", savedWrap === "true");
    }
    hasRunOnce.value = localStorage.getItem("hasRunOnce") === "true";

    updateLanguageAndEncoding();

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "error") {
        const currentTime = Date.now();
        if (
          lastError !== event.data.message ||
          currentTime - lastErrorTime > 1000
        ) {
          lastError = event.data.message;
          lastErrorTime = currentTime;
          consoleLogs.value.push({
            type: "error",
            message: event.data.message,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    });
  });

  onUnmounted(() => {
    if (editor) {
      editor.destroy();
    }
    if (previewWindow.value && !previewWindow.value.closed) {
      previewWindow.value.close();
    }
    document.removeEventListener("click", handleClickOutside);
    window.removeEventListener("message", () => {});
  });

  watch(activeFile, (newFile) => {
    if (editor) {
      if (!fileContents[newFile].session) {
        fileContents[newFile].session = ace.createEditSession(
          fileContents[newFile].value,
        );
        fileContents[newFile].session.setMode(
          `ace/mode/${newFile === "js" ? "javascript" : newFile}`,
        );
      }
      editor.setSession(fileContents[newFile].session);
      updateEditorOptions(newFile);
      updateUndoRedoState();
    }
    updateLanguageAndEncoding();
  });

  watch(theme, (newTheme) => {
    setTheme(newTheme);
  });

  watch(editorTheme, (newTheme) => {
    localStorage.setItem("editorTheme", newTheme);
    setTheme(newTheme);
  });

  watch(editorFontSize, (newSize) => {
    localStorage.setItem("editorFontSize", newSize);
    if (editor) {
      editor.setFontSize(newSize);
    }
  });

  watch(editorAutocomplete, (newValue) => {
    localStorage.setItem("editorAutocomplete", newValue);
    if (editor) {
      editor.setOptions({
        enableBasicAutocompletion: newValue,
        enableLiveAutocompletion: newValue,
      });
    }
  });

  watch(editorLineNumbers, (newValue) => {
    localStorage.setItem("editorLineNumbers", newValue);
    if (editor) {
      editor.setOption("showGutter", newValue);
    }
  });

  watch(editorWrap, (newValue) => {
    localStorage.setItem("editorWrap", newValue);
    if (editor) {
      editor.setOption("wrap", newValue);
    }
  });

  watch(previewError, (newValue) => {
    if (!newValue) {
      updatePreviewFrame();
    }
  });

  return {
    editorContainer,
    previewFrame,
    activeFile,
    activeView,
    theme,
    themes,
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
    tooltip,
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
    handleButtonClick,
    getMessageTypeClass,
    getMessagePrefix,
    showTooltip,
    hideTooltip,
    formatText,
    undo,
    redo,
    openPreviewInNewTab,
    editorTheme,
    editorFontSize,
    editorAutocomplete,
    editorLineNumbers,
    editorWrap,
    runCode,
    toggleTheme,
    currentLanguage,
    currentEncoding,
    lastSaved,
    formatLastSaved,
    isMobileMenuOpen,
    toggleMobileMenu,
    runCodeMobile,
    formatTextMobile,
    undoMobile,
    redoMobile,
    saveCodeMobile,
    toggleThemeMobile,
    toggleThemeOnly,
    previewError,
    getLastSavedText,
    initEditor,
    justSaved,
    hasRunOnce,
  };
}
