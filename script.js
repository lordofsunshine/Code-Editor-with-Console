@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap');

* {
  margin: 0;
  padding: 0;
  font-family: "Poppins", sans-serif;
  box-sizing: border-box;
}
body {
  background: #0a0a0a;
  color: #f5f5f5;
  padding: 20px;
}
h1 {
  margin: 10px;
}
.container {
  width: 100%;
  height: 100vh;
  display: flex;
}
.left,
.right {
  flex-basis: 50%;
  padding: 10px;
}
textarea {
    width: 100%;
    height: 26%;
    background: #151515;
    font-family: "Source Code Pro", monospace;
    color: #fff;
    padding: 10px 20px;
    font-size: 14px;
    border: 0;
    outline: 0;
}
iframe {
    width: 100%;
    height: 86.3%;
    background: #151515;
    border: 0;
    outline: 0;
}
label i {
  margin-right: 10px;
  margin-left: 10px;
}
label {
  display: flex;
  padding: 8px 10px;
  gap: 5px;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  vertical-align: middle;
  font-family: "Inter", sans-serif;
  overflow: hidden;
  background: #1c1c1c;
  user-select: none;
}
#console-log {
  position: relative;
  background-color: #151515;
  color: #fff;
  width: 100%;
  max-height: 80%;
  height: 100%;
  padding: 4px 0;
  overflow-y: scroll;
  line-height: normal;
  letter-spacing: normal;
  font-family: Arial, monospace;
}
.console-input {
  z-index: 9999999;
}
#console-log:empty {
  display: none;
}
.console-message {
  padding: 2px 10px;
}
.error-text {
  color: grey;
}
.command-symbol {
  color: grey;
}
.command-message {
  color: white;
  padding: 0 5px;
}
.error-message {
  color: white;
  margin-left: 5px;
}
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: #252525;
}
::-webkit-scrollbar-thumb {
  background: #3b3b3b;
}
.flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.menu-btn {
  background-color: #171717;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 14px;
  margin: 0 5px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}
.menu-btn.active {
  background-color: #fff;
  color: #000;
}
#console-log {
  position: relative;
}
.console-input {
  display: flex;
  justify-content: space-between;
}
#command-input {
  flex-grow: 1;
  padding: 8px;
  width: 100%;
  background-color: #1c1c1c;
  color: #fff;
  border: none;
  outline: none;
}

#command-submit {
  padding: 8px 16px;
  background-color: #3b3b3b;
  color: #fff;
  border: none;
  cursor: pointer;
}
.resizable {
  resize: vertical;
  overflow: auto;
  min-width: 50px;
  min-height: 50px;
  max-width: 100%;
  max-height: 100%;
}
.download-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  margin-left: auto;
  border: 0;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}
.download-btn:hover {
  opacity: 0.6;
  transition: all 0.3s;
}
.flex-magic {
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 10px;
}
.close {
  position: absolute;
  right: 0;
  top: 0;
  padding: 10px;
  transition: all 0.3s;
}
.close:hover {
  opacity: 0.6;
  transition: all 0.3s;
}
.save-icon {
  margin-left: 10px;
  color: #404040;
  animation: blink 1s infinite;
}
@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}
.save-icon.blink {
  display: inline !important;
  animation: blink 1s infinite;
}
.dropdown-popup {
    position: fixed;
    background-color: #fff;
    color: #48484891;
    letter-spacing: -0.2px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0px 8px 16px rgb(0 0 0 / 28%);
    border-radius: 10px;
    padding: 16px 28px;
    display: none;
    z-index: 999;
    animation: fadeIn 0.3s ease-in-out;
}
.dropdown-popup.show {
    display: block; 
}
.dropdown-popup button {
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 5px;
    margin-bottom: 8px;
    padding: 10px 16px;
    background-color: #f0f0f0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    width: 100%;
    transition: all 0.3s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
}


.dropdown-popup button:hover {
    background-color: #e0e0e0;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.custom {
  border: 1px solid #4848483b;
  margin-block-start: 5px;
  margin-block-end: 10px;
}
.dropdown-flex {
  display: flex;
  align-items: baseline;
  gap: 40px;
  user-select: none;
}
.dropbtn {
  background-color: #191919;
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.dropbtn:hover {
  opacity: 0.8;
}
.flex-objects {
  display: flex;
  align-items: center;
  gap: 5px;
}
@keyframes rotate-refresh {
    0%, 100% {
        transform: rotate(0deg);
    }
    50% {
        transform: rotate(360deg);
    }
}
.func-btn {
    transition: all 0.5s;
    background: transparent;
    color: #848484;
    font-weight: 500;
    border: 0;
    border-radius: 8px;
    width: max-content;
    height: max-content;
    user-select: none;
}
.func-btn:hover {
    animation: rotate-refresh 2s infinite;
    background: #ffffff14;
    color: #a4a4a4;
}
.more-btn {
  display: flex;
  transition: all 0.5s;
  background: transparent;
  color: #848484;
  font-weight: 500;
  border: 0;
  border-radius: 2px;
  margin-left: auto;
  user-select: none;
}
.more-btn:hover {
  background: #ffffff14;
  color: #a4a4a4;
}
.webview-label {
    display: flex;
    padding: 8px 10px;
    gap: 5px;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 500;
    vertical-align: middle;
    font-family: "Inter", sans-serif;
    overflow: hidden;
    background: #1c1c1c;
    user-select: none;
}
.object {
  display: flex;
  align-items: center;
  gap: 10px;
}
.button-file {
  background: #1c1c1c;
}
::selection {
    background: #ffffff21;
    color: #fff;
    text-shadow: none;
}
@media only screen and (max-device-width: 670px) {
  .container {
    display: block;
  }
  textarea {
    height: 35%;
  }
  .left,
  .right {
    padding: 10px 0;
  }
  h1 {
    margin: 10px 0;
  }
  .flex {
    display: block;
    text-wrap: nowrap;
    margin-bottom: 20px;
  }
  .menu {
    display: block;
    text-wrap: wrap;
  }
  .menu-btn {
    margin: 5px 0 !important;
    width: 100%;
  }
  iframe {
    width: 100%;
    height: 100%;
  }
  .console-message {
    padding: 8px 10px;
  }
  .dropdown-flex {
      align-items: baseline;
  }
  .download-btn {
      white-space: normal;
  }
  .dropdown-popup {
      position: unset;
      font-size: 14px;
  }
  .dropbtn {
      margin-left: auto;
  }
}
