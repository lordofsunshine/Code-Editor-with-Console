function run(){
    let htmlCode = document.getElementById("html-code").value;
    let cssCode = "<style>body { color: white; } " + document.getElementById("css-code").value + "</style>";
    let jsCode = document.getElementById("js-code").value;
    let output = document.getElementById("output");
    let consoleLog = document.getElementById("console-log");

    consoleLog.innerHTML = '';

    output.contentWindow.console.log = function(message) {
        let date = new Date();
        let timestamp = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
        let formattedMessage = timestamp + ' - ' + message + '<br>';
        consoleLog.innerHTML += formattedMessage;
    };

    output.contentWindow.onerror = function(message, source, lineno, colno, error) {
        let date = new Date();
        let timestamp = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
        let errorMessage = '<br>' + timestamp + ' - Error: ' + message;
        errorMessage += '<br>Source: ' + source;
        errorMessage += '<br>Line: ' + lineno + ', Column: ' + colno;
        errorMessage += '<br>Error object: ' + error + '<br>';
        consoleLog.innerHTML += errorMessage;
        return true;
    };

    output.contentDocument.body.innerHTML = htmlCode + cssCode;

    try {
        output.contentWindow.eval(jsCode);
    } catch (e) {
        let date = new Date();
        let timestamp = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
        let runtimeErrorMessage = '<br>' + timestamp + ' - Runtime Error: ' + e.message + '<br>';
        consoleLog.innerHTML += runtimeErrorMessage;
    }
}
