document.addEventListener('DOMContentLoaded', init);

function init() {
    setupConsole();
    setupUIElements();
    setupEventListeners();
    initializeAutosave();
    loadSavedContent();
    initializeAutoRefresh();
    showRunButton();
}

document.addEventListener('DOMContentLoaded', () => {
    const fileInputs = {
        'html': document.getElementById('html-code'),
        'css': document.getElementById('css-code'),
        'js': document.getElementById('js-code')
    };

    function handleFileSelect(evt) {
        const files = evt.target.files;
        let filesLoaded = 0;

        for (const file of files) {
            const reader = new FileReader();

            reader.onload = (function(theFile) {
                return function(e) {
                    const fileType = theFile.name.split('.').pop().toLowerCase();
                    if (fileInputs[fileType]) {
                        fileInputs[fileType].value = e.target.result;
                        filesLoaded++;

                        if (filesLoaded === files.length) {
                            collectAndRunCode();
                        }
                    }
                };
            })(file);

            reader.readAsText(file);
        }
    }

    const uploadButton = document.createElement('button');
    uploadButton.textContent = 'Upload Files';
    uploadButton.className = 'button-file';
    uploadButton.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '.html,.css,.js';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', handleFileSelect);

        document.body.appendChild(fileInput);
        fileInput.click();

        fileInput.addEventListener('change', () => {
            document.body.removeChild(fileInput);
        });
    });

    const editorContainer = document.querySelector('.input-file');
    editorContainer.insertBefore(uploadButton, editorContainer.firstChild);
});

function toggleFullscreen() {
    const iframe = document.getElementById('output');

    if (!iframe) return;

    if (!document.fullscreenElement && !document.mozFullScreenElement &&
        !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.msRequestFullscreen) {
            iframe.msRequestFullscreen();
        } else if (iframe.mozRequestFullScreen) {
            iframe.mozRequestFullScreen();
        } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function collectAndRunCode() {
    const htmlCode = document.getElementById('html-code').value;
    const cssCode = document.getElementById('css-code').value;
    const jsCode = document.getElementById('js-code').value;
    const output = document.getElementById('output');

    if (output) {
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
}

function refresh() {
    collectAndRunCode();
}

function toggleAutoRefresh() {
    const toggleButton = document.getElementById('toggleAutoRefresh');

    autoRefreshEnabled = !autoRefreshEnabled;
    localStorage.setItem('autoRefresh', autoRefreshEnabled);
    toggleButton.textContent = autoRefreshEnabled ? 'Disable Auto-refresh' : 'Enable Auto-refresh';

    const runButton = document.getElementById('runButton');
    if (autoRefreshEnabled) {
        if (runButton) runButton.style.display = 'none';
        run();
    } else {
        showRunButton();
    }
}

document.getElementById('runButton').addEventListener('click', run);

function initializeAutoRefresh() {
    autoRefreshEnabled = localStorage.getItem('autoRefresh') !== 'false';
    document.getElementById('toggleAutoRefresh').textContent = autoRefreshEnabled ? 'Disable Auto-refresh' : 'Enable Auto-refresh';
    if (!autoRefreshEnabled) {
        showRunButton();
    }
}

function showRunButton() {
    let runButton = document.getElementById('runButton');
    if (!runButton) {
        runButton = document.createElement('button');
        runButton.id = 'runButton';
        runButton.classList.add('refresh-btn');
        runButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20"/></svg>';
        runButton.addEventListener('click', run);
        document.body.appendChild(runButton);
    } else {
        runButton.style.display = 'flex';
    }
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
        alert('The command cannot be empty.');
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

    if (!output || !autoRefreshEnabled) return;

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

    collectAndRunCode();
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
    document.getElementById('toggleAutoRefresh')?.addEventListener('click', toggleAutoRefresh);
    document.getElementById('dropdownButton')?.addEventListener('click', toggleDropdown);
    document.getElementById('downloadFilesAsZip')?.addEventListener('click', downloadFilesAsZip);
    document.getElementById('toggle-autosave-dropdown')?.addEventListener('click', toggleAutosave);
    document.getElementById('app').style.display = 'block';

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

window.onerror = function(message, source, lineno, colno, error) {
    alert('An error occurred in the Code Editor: ' + message);
    return true;
};
