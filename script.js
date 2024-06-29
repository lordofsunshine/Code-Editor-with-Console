document.addEventListener('DOMContentLoaded', init);

function init() {
    setupConsole();
    setupUIElements();
    setupEventListeners();
    initializeAutosave();
    loadSavedContent();
}

function addMessageToConsole(message, isError, isCommand) {
    const consoleElement = document.getElementById('console-log');
    if (!consoleElement) return;

    const messageElement = document.createElement('div');
    messageElement.classList.add('console-message');

    if (isError) {
        const errorTime = document.createElement('span');
        errorTime.textContent = new Date().toLocaleTimeString();
        errorTime.classList.add('error-text');
        messageElement.appendChild(errorTime);
    } else if (isCommand) {
        const commandSymbol = document.createElement('span');
        commandSymbol.textContent = '>';
        commandSymbol.classList.add('command-symbol');
        messageElement.appendChild(commandSymbol);
    }

    const messageContent = document.createElement('span');
    messageContent.textContent = message;
    messageContent.classList.add(isCommand ? 'command-message' : 'error-message');
    messageElement.appendChild(messageContent);

    consoleElement.appendChild(messageElement);
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

function executeCommand(command) {
    if (command.trim() === '') {
        addMessageToConsole('The command cannot be empty.', true, false);
        return;
    }

    try {
        const result = eval(command);
        addMessageToConsole(command, false, true);
        addMessageToConsole(result, false, false);
    } catch (e) {
        addMessageToConsole(e.message, true, false);
    }
}

function run() {
    const htmlCode = document.getElementById('html-code').value;
    const cssCode = document.getElementById('css-code').value;
    const jsCode = document.getElementById('js-code').value;
    const output = document.getElementById('output');

    if (!output) return;

    const doc = output.contentDocument;
    doc.open();
    doc.write(`
        <html>
        <head>
            <style>${cssCode}</style>
        </head>
        <body>
            ${htmlCode}
            <script>
                console.log = function(message) {
                    window.parent.addMessageToConsole(message, false, false);
                };
                window.onerror = function(message) {
                    window.parent.addMessageToConsole(message, true, false);
                    return true;
                };
                try {
                    ${jsCode}
                } catch (e) {
                    window.parent.addMessageToConsole(e.message, true, false);
                }
            </script>
        </body>
        </html>
    `);
    doc.close();
}

let autosaveEnabled = localStorage.getItem('autosave') === 'true';
let autosaveInterval;

function toggleAutosave() {
    autosaveEnabled = !autosaveEnabled;
    localStorage.setItem('autosave', autosaveEnabled);
    document.getElementById('toggle-autosave-dropdown').textContent = autosaveEnabled ? 'Disable Autosave' : 'Enable Autosave';

    if (autosaveEnabled) {
        startAutosave();
    } else {
        stopAutosave();
    }
}

function startAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(saveCode, 5000);
}

function stopAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
}

function saveCode() {
    const htmlCode = document.getElementById('html-code').value;
    const cssCode = document.getElementById('css-code').value;
    const jsCode = document.getElementById('js-code').value;

    localStorage.setItem('htmlCode', htmlCode);
    localStorage.setItem('cssCode', cssCode);
    localStorage.setItem('jsCode', jsCode);

    showSaveIcon();
}

function showSaveIcon() {
    const saveIcon = document.getElementById('saveIcon');
    if (saveIcon) {
        saveIcon.style.display = 'block';
        setTimeout(() => {
            saveIcon.style.display = 'none';
        }, 2000);
    }
}

function saveCodeOnChange() {
    if (autosaveEnabled) {
        if (autosaveInterval) clearTimeout(autosaveInterval);
        autosaveInterval = setTimeout(saveCode, 500);
    }
}

function loadSavedContent() {
    const htmlCode = localStorage.getItem('htmlCode');
    const cssCode = localStorage.getItem('cssCode');
    const jsCode = localStorage.getItem('jsCode');

    if (htmlCode) document.getElementById('html-code').value = htmlCode;
    if (cssCode) document.getElementById('css-code').value = cssCode;
    if (jsCode) document.getElementById('js-code').value = jsCode;
}

function setupConsole() {
    const consoleInput = document.querySelector('.right .console-input');
    if (consoleInput) {
        consoleInput.style.display = 'none';
    }

    const consoleLog = document.getElementById('console-log');
    if (consoleLog) {
        consoleLog.style.display = 'none';
        document.querySelectorAll('.console-label').forEach(label => {
            label.style.display = 'none';
        });
    }
}

function setupUIElements() {
    document.getElementById('dropdownButton')?.addEventListener('click', toggleDropdown);
    document.getElementById('downloadFilesAsZip')?.addEventListener('click', downloadFilesAsZip);
    document.getElementById('toggle-autosave-dropdown')?.addEventListener('click', toggleAutosave);

    const commandInput = document.getElementById('command-input');
    if (commandInput) {
        commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeCommand(commandInput.value);
                commandInput.value = '';
            }
        });
    }

    document.querySelector('.close')?.addEventListener('click', clearConsole);

    ['html-code', 'css-code', 'js-code'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            saveCodeOnChange();
            run();
        });
    });

    ['webview-btn', 'console-btn'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', toggleView);
    });
}

function setupEventListeners() {
    const output = document.getElementById('output');
    if (!output) return;

    output.contentWindow.console.log = message => addMessageToConsole(message, false, false);
    output.contentWindow.onerror = (message, source, lineno, colno, error) => {
        addMessageToConsole(message, true, false);
        return true;
    };
}

function toggleDropdown() {
    const dropdownMenu = document.getElementById('dropdownPopup');
    if (dropdownMenu) {
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    }
}

function toggleView(e) {
    const isWebView = e.target.id === 'webview-btn';
    const output = document.getElementById('output');
    const consoleLog = document.getElementById('console-log');
    const consoleInput = document.querySelector('.right .console-input');

    if (output) output.style.display = isWebView ? 'block' : 'none';
    if (consoleLog) consoleLog.style.display = isWebView ? 'none' : 'block';
    if (consoleInput) consoleInput.style.display = isWebView ? 'none' : 'block';

    document.querySelectorAll(isWebView ? '.webview-label' : '.console-label').forEach(label => {
        label.style.display = 'flex';
    });
    document.querySelectorAll(isWebView ? '.console-label' : '.webview-label').forEach(label => {
        label.style.display = 'none';
    });

    document.getElementById('webview-btn')?.classList.toggle('active', isWebView);
    document.getElementById('console-btn')?.classList.toggle('active', !isWebView);
}

function clearConsole() {
    const consoleLog = document.getElementById('console-log');
    if (consoleLog) {
        Array.from(consoleLog.children).forEach(child => {
            if (child.classList.contains('console-message')) {
                consoleLog.removeChild(child);
            }
        });
    }
}

function downloadFilesAsZip() {
    const htmlContent = document.getElementById('html-code').value;
    const cssContent = document.getElementById('css-code').value;
    const jsContent = document.getElementById('js-code').value;

    const zip = new JSZip();

    if (htmlContent) zip.file("index.html", htmlContent);
    if (cssContent) zip.file("style.css", cssContent);
    if (jsContent) zip.file("script.js", jsContent);

    zip.generateAsync({ type: "blob" })
        .then(content => saveAs(content, "website.zip"));
}

function initializeAutosave() {
    document.getElementById('toggle-autosave-dropdown').textContent = autosaveEnabled ? 'Disable Autosave' : 'Enable Autosave';
    if (autosaveEnabled) startAutosave();
}
