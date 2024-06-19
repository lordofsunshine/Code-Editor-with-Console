function addMessageToConsole(message, isError, isCommand) {
    let consoleElement = document.getElementById('console-log');
    let messageElement = document.createElement('div');
    messageElement.classList.add('console-message');

    if (isError) {
        let errorTime = document.createElement('span');
        let currentTime = new Date();
        let hours = String(currentTime.getHours()).padStart(2, '0');
        let minutes = String(currentTime.getMinutes()).padStart(2, '0');
        let seconds = String(currentTime.getSeconds()).padStart(2, '0');
        errorTime.textContent = hours + ':' + minutes + ':' + seconds;
        errorTime.classList.add('error-text');
        messageElement.appendChild(errorTime);
    } else if (isCommand) {
        let commandSymbol = document.createElement('span');
        commandSymbol.textContent = '>';
        commandSymbol.classList.add('command-symbol');
        messageElement.appendChild(commandSymbol);
    }

    let messageContent = document.createElement('span');
    messageContent.textContent = message;
    messageContent.classList.add(isCommand ? 'command-message' : 'error-message');
    messageElement.appendChild(messageContent);

    consoleElement.appendChild(messageElement);
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

function executeCommand() {
    var commandInput = document.getElementById('command-input');
    var command = commandInput.value;

    if (command.trim() === '') {
        addMessageToConsole('The command cannot be empty.', true, false);
        return;
    }

    try {
        let result = eval(command);
        addMessageToConsole(command, false, true);
        addMessageToConsole(result, false, false);
    } catch (e) {
        addMessageToConsole(e.message, true, false);
    }
}

function run() {
    let htmlCode = document.getElementById("html-code").value;
    let cssCode = document.getElementById("css-code").value;
    let jsCode = document.getElementById("js-code").value;
    let output = document.getElementById("output");

    output.contentDocument.body.innerHTML = '';
    output.contentDocument.head.innerHTML = '';

    let styleEl = output.contentDocument.createElement('style');
    styleEl.type = 'text/css';
    styleEl.appendChild(output.contentDocument.createTextNode(cssCode));
    output.contentDocument.head.appendChild(styleEl);

    output.contentDocument.body.innerHTML = htmlCode;

    output.contentWindow.console.log = function(message) {
        addMessageToConsole(message, false, false);
    };
    output.contentWindow.onerror = function(message, source, lineno, colno, error) {
        addMessageToConsole(message, true, false);
        return true;
    };

    try {
        output.contentWindow.eval(jsCode);
    } catch (e) {
        addMessageToConsole(e.message, true, false);
    }
}

window.run = run;

document.addEventListener('DOMContentLoaded', function() {
    var consoleInput = document.querySelector('.right .console-input');
    consoleInput.style.display = 'none';
});

var consoleInput, rightContainer, consoleLog, output, webviewButton, consoleButton, consoleLabels, webviewLabels;

document.addEventListener('DOMContentLoaded', function() {
    consoleInput = document.querySelector('.right .console-input');
    rightContainer = document.querySelector('.right');
    consoleLog = rightContainer.querySelector('#console-log');
    output = rightContainer.querySelector('#output');
    webviewButton = document.getElementById('webview-btn');
    consoleButton = document.getElementById('console-btn');
    consoleLabels = rightContainer.querySelectorAll('.console-label');
    webviewLabels = rightContainer.querySelectorAll('.webview-label');

    consoleInput.style.display = 'none';
    consoleLog.style.display = 'none';
    consoleLabels.forEach(function(label) {
        label.style.display = 'none';
    });

    webviewButton.addEventListener('click', function() {
        output.style.display = 'block';
        webviewLabels.forEach(function(label) {
            label.style.display = 'flex';
        });
        consoleLog.style.display = 'none';
        consoleLabels.forEach(function(label) {
            label.style.display = 'none';
        });
        consoleInput.style.display = 'none';
        this.classList.add('active');
        consoleButton.classList.remove('active');
    });

    consoleButton.addEventListener('click', function() {
        output.style.display = 'none';
        webviewLabels.forEach(function(label) {
            label.style.display = 'none';
        });
        consoleLog.style.display = 'block';
        consoleLabels.forEach(function(label) {
            label.style.display = 'flex';
        });
        consoleInput.style.display = 'block';
        this.classList.add('active');
        webviewButton.classList.remove('active');
    });

    var commandInput = document.getElementById('command-input');
    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand(this.value);
            this.value = '';
        }
    });
})

// Save the Project

function downloadFilesAsZip() {
    const htmlContent = document.getElementById('html-code').value;
    const cssContent = document.getElementById('css-code').value;
    const jsContent = document.getElementById('js-code').value;

    const zip = new JSZip();

    zip.file("index.html", htmlContent);
    zip.file("style.css", cssContent);
    zip.file("script.js", jsContent);

    zip.generateAsync({
            type: "blob"
        })
        .then(function(content) {
            saveAs(content, "website.zip");
        });
}

document.getElementById('downloadFilesAsZip').addEventListener('click', downloadFilesAsZip);


function clearConsole() {
    let consoleLog = document.getElementById('console-log');
    for (let i = consoleLog.children.length - 1; i >= 0; i--) {
        let child = consoleLog.children[i];
        if (child.classList.contains('console-message')) {
            consoleLog.removeChild(child);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    let closeButton = document.querySelector('.close');
    closeButton.addEventListener('click', clearConsole);
});
