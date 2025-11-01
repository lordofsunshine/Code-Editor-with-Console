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

  socket.on('file-updated', ({ fileId, content, username, isTyping }) => {
    if (window.onFileUpdatedByOther) {
      window.onFileUpdatedByOther(fileId, content, username, isTyping);
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
  loadPendingInvitations();
}

export function joinProject(projectId) {
  currentProjectId = projectId;
  if (socket && socket.connected) {
    socket.emit('join-project', projectId);
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
  const inviteModal = document.getElementById('inviteModal');
  const cancelInvite = document.getElementById('cancelInvite');
  const sendInviteBtn = document.getElementById('sendInvite');
  const inviteUsername = document.getElementById('inviteUsername');
  const inviteStatus = document.getElementById('inviteStatus');

  leaveBtn.addEventListener('click', async () => {
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

  inviteBtn.addEventListener('click', async () => {
    inviteModal.classList.add('active');
    inviteStatus.className = 'invite-status';
    inviteStatus.textContent = '';
    inviteUsername.value = '';
    await loadProjectInvitations();
  });

  cancelInvite.addEventListener('click', () => {
    inviteModal.classList.remove('active');
  });

  sendInviteBtn.addEventListener('click', async () => {
    const username = inviteUsername.value.trim();
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
        body: JSON.stringify({ projectId: currentProjectId, username })
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
      inviteModal.classList.remove('active');
    }
  });
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
      <span class="invitation-user">${escapeHtml(inv.to_username)}</span>
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
        <strong>${escapeHtml(inv.project_name)}</strong>
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
  
  let bgColor, textColor, borderColor, icon;
  
  if (isLightTheme) {
    switch(type) {
      case 'success':
        bgColor = 'rgba(34, 197, 94, 0.15)';
        textColor = '#15803d';
        borderColor = 'rgba(34, 197, 94, 0.4)';
        icon = '✓';
        break;
      case 'error':
        bgColor = 'rgba(239, 68, 68, 0.15)';
        textColor = '#dc2626';
        borderColor = 'rgba(239, 68, 68, 0.4)';
        icon = '✕';
        break;
      default:
        bgColor = 'rgba(59, 130, 246, 0.15)';
        textColor = '#2563eb';
        borderColor = 'rgba(59, 130, 246, 0.4)';
        icon = 'ℹ';
    }
  } else {
    switch(type) {
      case 'success':
        bgColor = 'rgba(34, 197, 94, 0.2)';
        textColor = '#4ade80';
        borderColor = 'rgba(34, 197, 94, 0.5)';
        icon = '✓';
        break;
      case 'error':
        bgColor = 'rgba(239, 68, 68, 0.2)';
        textColor = '#f87171';
        borderColor = 'rgba(239, 68, 68, 0.5)';
        icon = '✕';
        break;
      default:
        bgColor = 'rgba(59, 130, 246, 0.2)';
        textColor = '#60a5fa';
        borderColor = 'rgba(59, 130, 246, 0.5)';
        icon = 'ℹ';
    }
  }
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;
  
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
    animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1), toastGlow 0.6s ease 0.2s;
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
      
      @keyframes toastGlow {
        0%, 100% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(59, 130, 246, 0.5);
        }
        50% {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px 4px rgba(59, 130, 246, 0.5);
        }
      }
      
      .toast-icon {
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
        flex-shrink: 0;
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

async function fetchWithCSRF(url, options = {}) {
  const csrfToken = window.editorState?.csrfToken;
  if (csrfToken && options.method && options.method !== 'GET') {
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': csrfToken
    };
  }
  return fetch(url, options);
}

export function showInviteButton(show) {
  const inviteBtn = document.getElementById('inviteBtn');
  const leaveBtn = document.getElementById('leaveBtn');
  inviteBtn.style.display = show ? 'flex' : 'none';
  leaveBtn.style.display = !show ? 'flex' : 'none';
}

export function setCurrentProjectId(projectId) {
  currentProjectId = projectId;
}

