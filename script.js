const styles = `
    .error-message {
        color: white;
        padding: 2px 10px;
    }
    .error-text {
        color: red;
    }
    .command-symbol {
        color: grey;
    }
    .command-message {
        color: white;
    }
`;

function addMessageToConsole(message, isError, isCommand) {
    let consoleElement = document.getElementById('console-log');
    let messageElement = document.createElement('div');
    messageElement.classList.add('console-message');

    if (isError) {
        let errorTime = document.createElement('span');
        let currentTime = new Date();
        errorTime.textContent = currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds();
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

function executeCommand(command) {
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
    let cssCode = "<style>" + styles + document.getElementById("css-code").value + "</style>";
    let jsCode = document.getElementById("js-code").value;
    let output = document.getElementById("output");
    let consoleLog = document.getElementById("console-log");

    output.contentWindow.console.log = function(message) {
        addMessageToConsole(message, false, false);
    };

    output.contentWindow.onerror = function(message, source, lineno, colno, error) {
        addMessageToConsole(message, true, false);
        return true;
    };

    output.contentDocument.body.innerHTML = htmlCode + cssCode;

    try {
        output.contentWindow.eval(jsCode);
    } catch (e) {
        addMessageToConsole(e.message, true, false);
    }
}

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

    document.getElementById('run-btn').addEventListener('click', run);
     })
