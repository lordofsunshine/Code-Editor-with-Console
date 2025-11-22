import { fetchWithCSRF } from './utils.js';
import { showToast } from './collaboration.js';

let currentProjectId = null;
let socket = null;
let chatMessages = [];
let isChatTabOpen = false;
let currentPing = 0;

export function initChat(socketInstance) {
  socket = socketInstance;
  
  if (!socket && window.getSocket) {
    socket = window.getSocket();
  }
  
  if (socket && !socket.hasChatListener) {
    socket.on('chat-message', handleNewChatMessage);
    socket.hasChatListener = true;
  }

  setupChatUI();
  measureInitialPing();
  
  if (typeof window !== 'undefined') {
    window.measurePing = measurePing;
  }
}

export function setCurrentProject(projectId) {
  currentProjectId = projectId;
  if (projectId) {
    measurePing(projectId);
  }
}

async function measureInitialPing() {
  try {
    const startTime = Date.now();
    await fetch('/api/auth/me');
    const ping = Date.now() - startTime;
    currentPing = Math.round(ping);
    updatePingDisplay();
  } catch (err) {
    currentPing = 0;
    updatePingDisplay();
  }
}

async function measurePing(projectId) {
  try {
    const startTime = Date.now();
    await fetch(`/api/files/${projectId}`);
    const ping = Date.now() - startTime;
    currentPing = Math.round(ping);
    updatePingDisplay();
  } catch (err) {
    console.error('Failed to measure ping:', err);
  }
}

function setupChatUI() {
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatMessage');
  const cancelChatBtn = document.getElementById('cancelChat');

  if (chatInput && sendChatBtn) {
    sendChatBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (cancelChatBtn) {
    cancelChatBtn.addEventListener('click', () => {
      const inviteModal = document.getElementById('inviteModal');
      if (inviteModal) {
        inviteModal.classList.add('closing');
        setTimeout(() => {
          inviteModal.classList.remove('active', 'closing');
        }, 300);
      }
    });
  }
  
  currentPing = 0;
  updatePingDisplay();
}

async function sendMessage() {
  if (!currentProjectId) return;

  const chatInput = document.getElementById('chatInput');
  if (!chatInput) return;

  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.disabled = true;
  const sendBtn = document.getElementById('sendChatMessage');
  if (sendBtn) sendBtn.disabled = true;

  const startTime = Date.now();

  try {
    const response = await fetchWithCSRF(`/api/chat/${currentProjectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      chatInput.value = '';
      showResponseTime(responseTime);
    } else {
      showToast(data.error || 'Failed to send message', 'error');
    }
  } catch (err) {
    showToast('Failed to send message', 'error');
  } finally {
    chatInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    chatInput.focus();
  }
}

function handleNewChatMessage({ message, responseTime }) {
  if (!message || message.project_id !== currentProjectId) return;

  const existingMessage = chatMessages.find(m => m.id === message.id);
  if (existingMessage) {
    return;
  }

  const isCurrentUser = message.user_id === window.editorState?.userId;
  
  if (!isCurrentUser) {
    let projectName = 'project';
    if (window.editorState?.projects) {
      const project = window.editorState.projects.find(p => p.id === currentProjectId);
      if (project) projectName = project.name;
    }
    
    const shortMessage = message.message.length > 50 
      ? message.message.substring(0, 50) + '...' 
      : message.message;
    
    showToast(`${message.username} in "${projectName}": ${shortMessage}`, 'info');
  }

  chatMessages.push(message);
  chatMessages.sort((a, b) => {
    return new Date(a.created_at) - new Date(b.created_at);
  });

  if (isChatTabOpen) {
    addMessageToUI(message, isCurrentUser);
    if (responseTime && isCurrentUser) {
      showResponseTime(responseTime);
    }
  }
}

function addMessageToUI(message, isCurrentUser) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  const emptyMessage = messagesContainer.querySelector('div[style*="text-align: center"]');
  if (emptyMessage) {
    emptyMessage.style.animation = 'messageFadeOut 0.2s ease';
    setTimeout(() => {
      emptyMessage.remove();
    }, 200);
  }

  const messageEl = createMessageElement(message, isCurrentUser);
  messageEl.style.opacity = '0';
  messageEl.style.transform = isCurrentUser ? 'translateX(20px) scale(0.95)' : 'translateX(-20px) scale(0.95)';
  
  messagesContainer.appendChild(messageEl);
  
  requestAnimationFrame(() => {
    messageEl.style.transition = 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    messageEl.style.opacity = '1';
    messageEl.style.transform = 'translateX(0) scale(1)';
  });
  
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 50);
}

function createMessageElement(message, isCurrentUser) {
  const div = document.createElement('div');
  div.className = `chat-message ${isCurrentUser ? 'own' : ''}`;
  
  const date = new Date(message.created_at);
  const now = new Date();
  
  const timeStr = date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  let dateStr = '';
  if (!isToday) {
    dateStr = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: !isThisYear ? 'numeric' : undefined
    });
  }

  const avatarHtml = message.avatar 
    ? `<img src="${escapeHtml(message.avatar)}" alt="${escapeHtml(message.username)}" class="chat-avatar">`
    : `<div class="chat-avatar-text">${escapeHtml(message.username.substring(0, 2).toUpperCase())}</div>`;

  div.innerHTML = `
    <div class="chat-message-header">
      ${avatarHtml}
      <div class="chat-message-info">
        <span class="chat-message-author">${escapeHtml(message.username)}</span>
        <span class="chat-message-time">${dateStr ? dateStr + ' ' : ''}${timeStr}</span>
      </div>
    </div>
    <div class="chat-message-text">${escapeHtml(message.message)}</div>
  `;

  return div;
}

function showResponseTime(ms) {
  currentPing = Math.round(ms);
  updatePingDisplay();
}

function updatePingDisplay() {
  const responseTimeEl = document.getElementById('chatResponseTime');
  if (!responseTimeEl) return;

  responseTimeEl.textContent = `~${currentPing}ms`;
}

export async function loadChatMessages(projectId) {
  if (!projectId) return;

  try {
    const response = await fetch(`/api/chat/${projectId}`);
    if (response.ok) {
      const data = await response.json();
      const loadedMessages = data.messages || [];
      
      const messageIds = new Set(chatMessages.map(m => m.id));
      const newMessages = loadedMessages.filter(m => !messageIds.has(m.id));
      
      if (newMessages.length > 0) {
        chatMessages = [...chatMessages, ...newMessages].sort((a, b) => {
          return new Date(a.created_at) - new Date(b.created_at);
        });
      } else if (chatMessages.length === 0) {
        chatMessages = loadedMessages.sort((a, b) => {
          return new Date(a.created_at) - new Date(b.created_at);
        });
      }
      
      if (isChatTabOpen) {
        renderChatMessages();
      }
    }
  } catch (err) {
    console.error('Failed to load chat messages');
  }
}

export function clearChatMessages() {
  chatMessages = [];
}

window.clearChatMessages = clearChatMessages;

function renderChatMessages() {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  if (chatMessages.length === 0) {
    messagesContainer.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 40px 20px;">No messages yet. Start the conversation!</div>';
    return;
  }

  const currentUserId = window.editorState?.userId;

  messagesContainer.innerHTML = '';
  
  chatMessages.forEach((msg, index) => {
    const isCurrentUser = msg.user_id === currentUserId;
    const messageEl = createMessageElement(msg, isCurrentUser);
    messageEl.style.opacity = '0';
    messageEl.style.transform = isCurrentUser ? 'translateX(20px) scale(0.95)' : 'translateX(-20px) scale(0.95)';
    messagesContainer.appendChild(messageEl);
    
    setTimeout(() => {
      requestAnimationFrame(() => {
        messageEl.style.transition = 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        messageEl.style.opacity = '1';
        messageEl.style.transform = 'translateX(0) scale(1)';
      });
    }, index * 30);
  });

  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 100);
}

export function openChatTab() {
  isChatTabOpen = true;
  const chatTab = document.getElementById('chatTab');
  if (chatTab) {
    chatTab.style.display = 'block';
  }
  
  if (currentProjectId) {
    loadChatMessages(currentProjectId).then(() => {
      setTimeout(() => {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.focus();
        }
      }, 100);
    });
  } else {
    setTimeout(() => {
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        chatInput.focus();
      }
    }, 100);
  }
}

export function closeChatTab() {
  isChatTabOpen = false;
  const chatTab = document.getElementById('chatTab');
  if (chatTab) {
    chatTab.style.display = 'none';
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

