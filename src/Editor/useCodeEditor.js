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
  let editor = null;

  const editorTheme = ref(localStorage.getItem("editorTheme") || "dark");
  const editorFontSize = ref(
    parseInt(localStorage.getItem("editorFontSize") || "14"),
  );
  const editorAutocomplete = ref(
    localStorage.getItem("editorAutocomplete") !== "false",
  );
  const editorLineNumbers = ref(
    localStorage.getItem("editorLineNumbers") !== "false",
  );
  const editorWrap = ref(localStorage.getItem("editorWrap") !== "false");

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
  <meta charset="UTF-8" />
  <link rel="icon" href="/favicon.ico" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code Editor</title>
</head>
<body>
  <div class="container">
  <div class="card">
    <h1 class="title">Code Editor</h1>
    <a href="https://github.com/lordofsunshine/Code-Editor-with-Console" class="credits">by lordofsunshine</a>
  </div>
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

.card {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 1.6rem 2.9rem;
  border-radius: 0.5rem;
  background: #5757570f;
}

.title {
  color: #5e5e5e;
  font-size: 4rem;
  font-weight: 500;
  margin: 0;
}

.credits {
  font-family: "Pixelify Sans", sans-serif;
  font-size: 1.3rem;
  background: #1a1a1a;
  color: #575757;
  padding: 0.5rem 1.5rem;
  border-radius: 0.3rem;
  text-decoration: none;
  width: -webkit-fill-available;
  transition: background-color 0.3s ease;
}

.credits:hover {
  background-color: #0c0c0c;
}

@media (max-width: 768px) {
  .title {
    font-size: 3rem;
  }

  .watermark {
    font-size: 1.2rem;
    padding: 0.4rem 1.2rem;
  }
}`),
    js: ref(``),
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
      editor
        .getSession()
        .setMode(`ace/mode/${fileType === "js" ? "javascript" : fileType}`);
      editor.setOption("wrap", editorWrap.value);
    }
  };

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
    fileContents[activeFile.value].session = editor.getSession();
    editor.setValue(fileContents[activeFile.value].value, -1);

    editor.on("change", () => {
      fileContents[activeFile.value].value = editor.getValue();
      hasUnsavedChanges.value = true;
      updatePreviewFrame();
      if (previewWindow.value && !previewWindow.value.closed) {
        updateExternalPreview();
      }
      updateUndoRedoState();
    });

    updateUndoRedoState();

    consoleLogs.value.push({
      type: "info",
      message: "Console initialized. List of all commands: editor help",
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  const createPreviewContent = () => {
    const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>${fileContents.css.value}</style>
            <script>
              window.addEventListener('error', function(event) {
                window.parent.postMessage({
                  type: 'error',
                  message: event.message
                }, '*');
                return false;
              });

              (function() {
                const originalConsole = {
                  log: console.log,
                  error: console.error,
                  warn: console.warn,
                  info: console.info
                };

                console.log = function(...args) {
                  window.parent.postMessage({
                    type: 'success',
                    message: args.join(' ')
                  }, '*');
                  originalConsole.log.apply(console, args);
                };

                console.error = function(...args) {
                  window.parent.postMessage({
                    type: 'error',
                    message: args.join(' ')
                  }, '*');
                  originalConsole.error.apply(console, args);
                };

                console.warn = function(...args) {
                  window.parent.postMessage({
                    type: 'warn',
                    message: args.join(' ')
                  }, '*');
                  originalConsole.warn.apply(console, args);
                };

                console.info = function(...args) {
                  window.parent.postMessage({
                    type: 'info',
                    message: args.join(' ')
                  }, '*');
                  originalConsole.info.apply(console, args);
                };
              })();
            <\/script>
          </head>
          <body>
            ${fileContents.html.value}
            <script>${fileContents.js.value}<\/script>
          </body>
        </html>
      `;
    return content;
  };

  const updatePreviewFrame = () => {
    if (!previewFrame.value) return;

    const frameDoc = previewFrame.value.contentDocument;
    if (!frameDoc) return;

    const content = createPreviewContent();
    frameDoc.open();
    frameDoc.write(content);
    frameDoc.close();

    previewFrame.value.style.pointerEvents = "auto";

    previewFrame.value.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    );

    previewFrame.value.removeAttribute("sandbox");
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
      if (!fileContents[type].value.trim()) {
        fileContents[type].value = " ";
      }
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
    url.searchParams.set("file", type);
    window.history.pushState({}, "", url);
  };

  const setActiveView = (view) => {
    activeView.value = view;
    nextTick(() => {
      if (view === "editor" && !editor) {
        initEditor();
      } else if (view === "preview") {
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
          const fontSize = parseInt(args[0]);
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
        updatePreviewFrame();
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
    updatePreviewFrame();
    hasUnsavedChanges.value = false;
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
      updatePreviewFrame();
      loadSavedCode();
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
    if (fileFromUrl && ["html", "css", "js"].includes(fileFromUrl)) {
      setActiveFile(fileFromUrl);
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
      editor.setFontSize(parseInt(savedFontSize));
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
  };
}
