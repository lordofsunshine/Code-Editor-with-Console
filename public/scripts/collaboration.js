import { fetchWithCSRF } from './utils.js';
import { initChat, setCurrentProject as setChatProject, openChatTab, closeChatTab, loadChatMessages } from './chat.js';

let socket = null;
let currentProjectId = null;
let pendingInvitations = [];

export function initCollaboration() {
  const userId = window.editorState?.userId;
  const username = window.editorState?.username;

  if (!userId || !username) {
    console.error('User not authenticated');
    return;
  }

  socket = io({
    transports: ['websocket', 'polling'],
    auth: {
      userId: userId,
      username: username
    }
  });

  socket.on('connect', () => {
    if (currentProjectId) {
      socket.emit('join-project', currentProjectId);
    }
  });

  socket.on('invitation-received', (invitation) => {
    pendingInvitations.push(invitation);
    updateNotificationBadge();
    showNotificationToast(invitation);
    renderNotifications();
  });

  socket.on('invitation-updated', () => {
    loadPendingInvitations();
  });

  socket.on('kicked-from-project', ({ projectId, projectName, reason }) => {
    showToast(`You have been removed from project "${projectName}"`, 'error');
    
    if (currentProjectId === projectId) {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setTimeout(() => {
        if (window.loadProjects) {
          window.loadProjects();
        }
      }, 1000);
    }
  });

  socket.on('file-updated', ({ fileId, content, username, isTyping }) => {
    if (window.onFileUpdatedByOther) {
      setTimeout(() => {
        window.onFileUpdatedByOther(fileId, content, username, isTyping);
      }, 50);
    }
  });

  socket.on('file-added', ({ file, username }) => {
    if (window.onFileAddedByOther) {
      window.onFileAddedByOther(file, username);
    }
  });

  socket.on('file-removed', ({ fileId, username }) => {
    if (window.onFileRemovedByOther) {
      window.onFileRemovedByOther(fileId, username);
    }
  });

  socket.on('collaborators-update', ({ collaborators }) => {
    if (window.onCollaboratorsUpdate) {
      window.onCollaboratorsUpdate(collaborators);
    }
  });

  setupInvitationUI();
  setupNotificationsUI();
  setupModalTabs();
  loadPendingInvitations();
  
  initChat(socket);
  
  window.showToast = showToast;
  window.showMessage = showToast;
  window.getSocket = () => socket;
}

export function joinProject(projectId) {
  currentProjectId = projectId;
  setChatProject(projectId);
  if (socket && socket.connected) {
    socket.emit('join-project', projectId);
  }
  if (window.measurePing) {
    window.measurePing(projectId);
  }
}

export function leaveProject(projectId) {
  if (socket && socket.connected) {
    socket.emit('leave-project', projectId);
  }
  currentProjectId = null;
}

export function emitFileChange(projectId, fileId, content, cursorPosition, isTyping = false) {
  if (socket && socket.connected) {
    socket.emit('file-change', { projectId, fileId, content, cursorPosition, isTyping });
  }
}

export function emitFileCreated(projectId, file) {
  if (socket && socket.connected) {
    socket.emit('file-created', { projectId, file });
  }
}

export function emitFileDeleted(projectId, fileId) {
  if (socket && socket.connected) {
    socket.emit('file-deleted', { projectId, fileId });
  }
}

function setupInvitationUI() {
  const inviteBtn = document.getElementById('inviteBtn');
  const leaveBtn = document.getElementById('leaveBtn');
  const leaveBtnWrapper = document.getElementById('leaveBtnWrapper');
  const projectMenu = document.getElementById('projectMenu');
  const openChatFromMenu = document.getElementById('openChatFromMenu');
  const leaveProjectFromMenu = document.getElementById('leaveProjectFromMenu');
  const inviteModal = document.getElementById('inviteModal');
  const cancelInvite = document.getElementById('cancelInvite');
  const sendInviteBtn = document.getElementById('sendInvite');
  const inviteUsername = document.getElementById('inviteUsername');
  const inviteRole = document.getElementById('inviteRole');
  const inviteStatus = document.getElementById('inviteStatus');

  if (leaveBtn) {
    leaveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (projectMenu) {
        const isOpen = projectMenu.style.display === 'block';
        closeAllMenus();
        if (!isOpen) {
          projectMenu.style.display = 'block';
        }
      }
    });
  }

  if (openChatFromMenu) {
    openChatFromMenu.addEventListener('click', async () => {
      closeAllMenus();
      if (inviteModal) {
        inviteModal.classList.add('active');
        switchTab('chat');
        if (currentProjectId && window.loadChatMessages) {
          window.loadChatMessages(currentProjectId);
        }
      }
    });
  }

  if (leaveProjectFromMenu) {
    leaveProjectFromMenu.addEventListener('click', async () => {
      closeAllMenus();
      if (!currentProjectId) return;
      
      if (confirm('Are you sure you want to leave this project?')) {
        try {
          const response = await fetchWithCSRF(`/api/invitations/leave/${currentProjectId}`, {
            method: 'POST'
          });
          
          if (response.ok) {
            showToast('Left project successfully', 'success');
            leaveProject(currentProjectId);
            if (window.reloadProjects) {
              await window.reloadProjects();
            }
            if (window.clearEditor) {
              window.clearEditor();
            }
          }
        } catch (err) {
          showToast('Failed to leave project', 'error');
        }
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (leaveBtnWrapper && !leaveBtnWrapper.contains(e.target)) {
      closeAllMenus();
    }
  });

  function closeAllMenus() {
    if (projectMenu) {
      projectMenu.style.display = 'none';
    }
  }

  inviteBtn.addEventListener('click', async () => {
    inviteModal.classList.add('active');
    const isOwner = inviteBtn.style.display !== 'none';
    const savedTab = localStorage.getItem('inviteModalTab') || 'invite';
    const tabToShow = isOwner ? savedTab : 'chat';
    switchTab(tabToShow);
    inviteStatus.className = 'invite-status';
    inviteStatus.textContent = '';
    inviteUsername.value = '';
    if (isOwner) {
      await loadProjectInvitations();
    }
  });

  cancelInvite.addEventListener('click', () => {
    inviteModal.classList.add('closing');
    setTimeout(() => {
      inviteModal.classList.remove('active', 'closing');
      closeChatTab();
      if (window.clearChatMessages) {
        window.clearChatMessages();
      }
    }, 300);
  });

  sendInviteBtn.addEventListener('click', async () => {
    const username = inviteUsername.value.trim();
    const role = inviteRole ? inviteRole.value : 'editor';
    if (!username || !currentProjectId) return;

    try {
      const checkResponse = await fetch(`/api/invitations/project/${currentProjectId}`);
      if (checkResponse.ok) {
        const invitations = await checkResponse.json();
        const activeInvitations = invitations.filter(inv => inv.status === 'accepted' || inv.status === 'pending');
        
        if (activeInvitations.length >= 2) {
          inviteStatus.className = 'invite-status error';
          inviteStatus.textContent = 'Maximum 2 collaborators allowed per project';
          return;
        }
      }

      const response = await fetchWithCSRF('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProjectId, username, role })
      });

      const data = await response.json();

      if (response.ok) {
        inviteStatus.className = 'invite-status success';
        inviteStatus.textContent = 'Invitation sent successfully!';
        inviteUsername.value = '';
        await loadProjectInvitations();
      } else {
        inviteStatus.className = 'invite-status error';
        inviteStatus.textContent = data.error || 'Failed to send invitation';
      }
    } catch (err) {
      inviteStatus.className = 'invite-status error';
      inviteStatus.textContent = 'Failed to send invitation';
    }
  });

  inviteModal.addEventListener('click', (e) => {
    if (e.target === inviteModal) {
      inviteModal.classList.add('closing');
      setTimeout(() => {
        inviteModal.classList.remove('active', 'closing');
        closeChatTab();
        if (window.clearChatMessages) {
          window.clearChatMessages();
        }
      }, 300);
    }
  });
}

function setupModalTabs() {
  const tabs = document.querySelectorAll('.modal-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      const inviteBtn = document.getElementById('inviteBtn');
      const isOwner = inviteBtn && inviteBtn.style.display !== 'none';
      
      if (tabName === 'invite' && !isOwner) {
        return;
      }
      
      switchTab(tabName);
      localStorage.setItem('inviteModalTab', tabName);
    });
  });
}

function switchTab(tabName) {
  const inviteBtn = document.getElementById('inviteBtn');
  const isOwner = inviteBtn && inviteBtn.style.display !== 'none';
  
  if (tabName === 'invite' && !isOwner) {
    tabName = 'chat';
  }
  
  const tabs = document.querySelectorAll('.modal-tab');
  const tabContents = document.querySelectorAll('.modal-tab-content');
  
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  tabContents.forEach(content => {
    if (content.id === `${tabName}Tab`) {
      content.style.display = 'block';
      if (tabName === 'chat') {
        openChatTab();
        if (currentProjectId) {
          loadChatMessages(currentProjectId);
        }
      } else {
        closeChatTab();
      }
    } else {
      content.style.display = 'none';
    }
  });
  
  if (isOwner || tabName === 'chat') {
    localStorage.setItem('inviteModalTab', tabName);
  }
}

function setupNotificationsUI() {
  const notificationsBtn = document.getElementById('notificationsBtn');
  const notificationsPanel = document.getElementById('notificationsPanel');
  const closeNotifications = document.getElementById('closeNotifications');

  notificationsBtn.addEventListener('click', () => {
    notificationsPanel.classList.toggle('active');
    renderNotifications();
  });

  closeNotifications.addEventListener('click', () => {
    notificationsPanel.classList.remove('active');
  });
}

async function loadPendingInvitations() {
  try {
    const response = await fetch('/api/invitations/received');
    if (response.ok) {
      pendingInvitations = await response.json();
      updateNotificationBadge();
      document.getElementById('notificationsBtn').style.display = 'flex';
    }
  } catch (err) {
    console.error('Failed to load invitations');
  }
}

async function loadProjectInvitations() {
  if (!currentProjectId) return;

  try {
    const response = await fetch(`/api/invitations/project/${currentProjectId}`);
    if (response.ok) {
      const invitations = await response.json();
      renderProjectInvitations(invitations);
    }
  } catch (err) {
    console.error('Failed to load project invitations');
  }
}

function renderProjectInvitations(invitations) {
  const container = document.getElementById('invitationsList');
  
  const activeInvitations = invitations.filter(inv => 
    inv.status === 'pending' || inv.status === 'accepted'
  );
  
  if (activeInvitations.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">No invitations sent</div>';
    return;
  }

  container.innerHTML = activeInvitations.map(inv => `
    <div class="invitation-item">
      <div class="invitation-user-info">
        <span class="invitation-user">${escapeHtml(inv.to_username)}</span>
        <span class="invitation-role">${inv.role || 'editor'}</span>
      </div>
      <span class="invitation-status ${inv.status}">${inv.status}</span>
      <button class="invitation-remove" onclick="window.removeCollaborator(${inv.id}, '${inv.status}', ${inv.to_user_id})" title="${inv.status === 'pending' ? 'Cancel invitation' : 'Remove from project'}">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
  `).join('');
}

window.removeCollaborator = async (invitationId, status, userId) => {
  if (!currentProjectId) return;

  try {
    if (status === 'pending') {
      const response = await fetchWithCSRF(`/api/invitations/${invitationId}/cancel`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setTimeout(async () => {
          await loadProjectInvitations();
        }, 300);
        showToast('Invitation cancelled', 'success');
      }
    } else if (status === 'accepted') {
      const response = await fetchWithCSRF(`/api/invitations/collaborators/${currentProjectId}/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTimeout(async () => {
          await loadProjectInvitations();
        }, 300);
        showToast('User removed from project', 'success');
      }
    }
  } catch (err) {
    showToast('Failed to remove collaborator', 'error');
  }
};

function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  const count = pendingInvitations.length;
  
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderNotifications() {
  const container = document.getElementById('notificationsList');
  
  if (pendingInvitations.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">No notifications</div>';
    return;
  }

  container.innerHTML = pendingInvitations.map(inv => `
    <div class="notification-item" data-id="${inv.id}">
      <div class="notification-title">Project Invitation</div>
      <div class="notification-message">
        <strong>${escapeHtml(inv.from_username)}</strong> invited you to join 
        <strong>${escapeHtml(inv.project_name)}</strong> as <strong>${inv.role || 'editor'}</strong>
      </div>
      <div class="notification-actions">
        <button class="notification-accept" onclick="window.acceptInvitation(${inv.id})">Accept</button>
        <button class="notification-reject" onclick="window.rejectInvitation(${inv.id})">Reject</button>
      </div>
    </div>
  `).join('');
}

window.acceptInvitation = async (invitationId) => {
  try {
    const response = await fetchWithCSRF(`/api/invitations/${invitationId}/accept`, {
      method: 'POST'
    });

    if (response.ok) {
      pendingInvitations = pendingInvitations.filter(inv => inv.id !== invitationId);
      updateNotificationBadge();
      renderNotifications();
      
      if (window.reloadProjects) {
        await window.reloadProjects();
      }
      
      showToast('Invitation accepted!', 'success');
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to accept invitation', 'error');
    }
  } catch (err) {
    showToast('Failed to accept invitation', 'error');
  }
};

window.rejectInvitation = async (invitationId) => {
  try {
    const response = await fetchWithCSRF(`/api/invitations/${invitationId}/reject`, {
      method: 'POST'
    });

    if (response.ok) {
      pendingInvitations = pendingInvitations.filter(inv => inv.id !== invitationId);
      updateNotificationBadge();
      renderNotifications();
      showToast('Invitation rejected', 'success');
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to reject invitation', 'error');
    }
  } catch (err) {
    showToast('Failed to reject invitation', 'error');
  }
};

function showNotificationToast(invitation) {
  showToast(`${invitation.from_username} invited you to ${invitation.project_name}`, 'info');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
  
  let bgColor, textColor, borderColor, icon, glowColor;
  
  if (isLightTheme) {
    switch(type) {
      case 'success':
        bgColor = 'rgba(34, 197, 94, 0.15)';
        textColor = '#15803d';
        borderColor = 'rgba(34, 197, 94, 0.4)';
        glowColor = 'rgba(34, 197, 94, 0.5)';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>';
        break;
      case 'error':
        bgColor = 'rgba(239, 68, 68, 0.15)';
        textColor = '#dc2626';
        borderColor = 'rgba(239, 68, 68, 0.4)';
        glowColor = 'rgba(239, 68, 68, 0.5)';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>';
        break;
      default:
        bgColor = 'rgba(59, 130, 246, 0.15)';
        textColor = '#2563eb';
        borderColor = 'rgba(59, 130, 246, 0.4)';
        glowColor = 'rgba(59, 130, 246, 0.5)';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
    }
  } else {
    switch(type) {
      case 'success':
        bgColor = 'rgba(34, 197, 94, 0.2)';
        textColor = '#4ade80';
        borderColor = 'rgba(34, 197, 94, 0.5)';
        glowColor = 'rgba(34, 197, 94, 0.6)';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>';
        break;
      case 'error':
        bgColor = 'rgba(239, 68, 68, 0.2)';
        textColor = '#f87171';
        borderColor = 'rgba(239, 68, 68, 0.5)';
        glowColor = 'rgba(239, 68, 68, 0.6)';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>';
        break;
      default:
        bgColor = 'rgba(59, 130, 246, 0.2)';
        textColor = '#60a5fa';
        borderColor = 'rgba(59, 130, 246, 0.5)';
        glowColor = 'rgba(59, 130, 246, 0.6)';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
    }
  }
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;
  
  const animationName = `toastGlow-${type}`;
  
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 16px 20px;
    background: ${bgColor};
    color: ${textColor};
    border: 1px solid ${borderColor};
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, ${isLightTheme ? '0.1' : '0.3'}), 0 0 0 0 ${borderColor};
    z-index: 10000;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    min-width: 280px;
    max-width: 400px;
    animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1), ${animationName} 0.6s ease 0.2s;
    transform-origin: bottom right;
  `;
  
  let styleElement = document.getElementById('toast-styles');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'toast-styles';
    styleElement.textContent = `
      @keyframes toastSlideIn {
        0% {
          opacity: 0;
          transform: translateY(20px) scale(0.9);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes toastSlideOut {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateY(-20px) scale(0.9);
        }
      }
      
      @keyframes toastGlow-success {
        0%, 100% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(34, 197, 94, 0.5);
        }
        50% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px 4px rgba(34, 197, 94, 0.6);
        }
      }
      
      @keyframes toastGlow-error {
        0%, 100% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(239, 68, 68, 0.5);
        }
        50% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px 4px rgba(239, 68, 68, 0.6);
        }
      }
      
      @keyframes toastGlow-info {
        0%, 100% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(59, 130, 246, 0.5);
        }
        50% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px 4px rgba(59, 130, 246, 0.6);
        }
      }
      
      .toast-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .toast-icon svg {
        width: 100%;
        height: 100%;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      
      .toast-message {
        flex: 1;
        line-height: 1.5;
        word-break: break-word;
      }
    `;
    document.head.appendChild(styleElement);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s cubic-bezier(0.7, 0, 0.84, 0)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showInviteButton(show) {
  const inviteBtn = document.getElementById('inviteBtn');
  const leaveBtnWrapper = document.getElementById('leaveBtnWrapper');
  inviteBtn.style.display = show ? 'flex' : 'none';
  if (leaveBtnWrapper) {
    leaveBtnWrapper.style.display = !show ? 'flex' : 'none';
  }
  
  const inviteTab = document.querySelector('.modal-tab[data-tab="invite"]');
  if (inviteTab) {
    if (show) {
      inviteTab.style.display = 'block';
      inviteTab.style.pointerEvents = 'auto';
      inviteTab.style.opacity = '1';
    } else {
      inviteTab.style.display = 'none';
      inviteTab.style.pointerEvents = 'none';
      inviteTab.style.opacity = '0.5';
    }
  }
  
  const inviteTabContent = document.getElementById('inviteTab');
  if (inviteTabContent && !show) {
    const chatTab = document.querySelector('.modal-tab[data-tab="chat"]');
    if (chatTab) {
      chatTab.click();
    }
  }
}

export function setCurrentProjectId(projectId) {
  currentProjectId = projectId;
}

export { showToast };

