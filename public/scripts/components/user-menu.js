import { fetchWithCSRF } from '../utils.js';
import { showToast } from '../collaboration.js';

let isMenuOpen = false;

export function initUserMenu() {
  const userInfo = document.getElementById('userInfo');
  const userMenu = document.getElementById('userMenu');
  const closeUserMenu = document.getElementById('closeUserMenu');
  const avatarInput = document.getElementById('avatarInput');
  const uploadAvatarBtn = document.getElementById('uploadAvatar');
  const usernameInput = document.getElementById('usernameInput');
  const saveProfileBtn = document.getElementById('saveProfile');
  const cancelProfileBtn = document.getElementById('cancelProfile');

  if (!userInfo || !userMenu) return;

  userInfo.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleUserMenu();
  });

  if (closeUserMenu) {
    closeUserMenu.addEventListener('click', () => {
      closeUserMenuPanel();
    });
  }

  if (uploadAvatarBtn && avatarInput) {
    uploadAvatarBtn.addEventListener('click', () => {
      avatarInput.click();
    });

    avatarInput.addEventListener('change', handleAvatarUpload);
  }

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', handleSaveProfile);
  }

  if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener('click', () => {
      closeUserMenuPanel();
    });
  }

  document.addEventListener('click', (e) => {
    if (isMenuOpen && !userMenu.contains(e.target) && !userInfo.contains(e.target)) {
      closeUserMenuPanel();
    }
  });

  loadUserProfile();
}

function toggleUserMenu() {
  if (isMenuOpen) {
    closeUserMenuPanel();
  } else {
    openUserMenuPanel();
  }
}

function openUserMenuPanel() {
  const userMenu = document.getElementById('userMenu');
  if (!userMenu) return;

  userMenu.classList.add('active');
  isMenuOpen = true;

  const username = document.getElementById('username')?.textContent || '';
  const usernameInput = document.getElementById('usernameInput');
  if (usernameInput) {
    usernameInput.value = username;
  }
  
  loadUserProfile();
}

function closeUserMenuPanel() {
  const userMenu = document.getElementById('userMenu');
  if (!userMenu) return;

  userMenu.classList.add('closing');
  setTimeout(() => {
    userMenu.classList.remove('active', 'closing');
    isMenuOpen = false;
  }, 300);
}

async function handleAvatarUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Only JPG, PNG, and WebP images are allowed', 'error');
    return;
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('Avatar size must be less than 5MB', 'error');
    return;
  }

  try {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const avatar = event.target.result;
      
      try {
        const response = await fetchWithCSRF('/api/auth/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar })
        });

        const data = await response.json();

        if (response.ok) {
          showToast('Avatar updated successfully', 'success');
          updateUserAvatar(data.avatar);
          closeUserMenuPanel();
        } else {
          showToast(data.error || 'Failed to upload avatar', 'error');
        }
      } catch (err) {
        showToast('Failed to upload avatar', 'error');
      }
    };
    
    reader.onerror = () => {
      showToast('Failed to read file', 'error');
    };
    
    reader.readAsDataURL(file);
  } catch (err) {
    showToast('Failed to upload avatar', 'error');
  }
}

async function handleSaveProfile() {
  const usernameInput = document.getElementById('usernameInput');
  if (!usernameInput) return;

  const newUsername = usernameInput.value.trim();

  if (newUsername.length < 3) {
    showToast('Username must be at least 3 characters', 'error');
    return;
  }

  if (newUsername.length > 20) {
    showToast('Username must be less than 20 characters', 'error');
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
    showToast('Username can only contain letters, numbers, and underscores', 'error');
    return;
  }

  try {
    const response = await fetchWithCSRF('/api/auth/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername })
    });

    const data = await response.json();

    if (response.ok) {
      showToast('Username updated successfully', 'success');
      updateUsername(newUsername);
      closeUserMenuPanel();
    } else {
      showToast(data.error || 'Failed to update username', 'error');
    }
  } catch (err) {
    showToast('Failed to update username', 'error');
  }
}

function updateUserAvatar(avatar) {
  const userAvatar = document.getElementById('userAvatar');
  const userMenuAvatar = document.getElementById('userMenuAvatar');
  
  if (avatar && avatar.startsWith('data:')) {
    if (userAvatar) {
      userAvatar.style.backgroundImage = `url(${escapeHtml(avatar)})`;
      userAvatar.textContent = '';
    }
    if (userMenuAvatar) {
      userMenuAvatar.style.backgroundImage = `url(${escapeHtml(avatar)})`;
      userMenuAvatar.textContent = '';
    }
  } else {
    const username = document.getElementById('username')?.textContent || '';
    if (userAvatar) {
      userAvatar.style.backgroundImage = '';
      userAvatar.textContent = username.substring(0, 2).toUpperCase();
    }
    if (userMenuAvatar) {
      userMenuAvatar.style.backgroundImage = '';
      userMenuAvatar.textContent = username.substring(0, 2).toUpperCase();
    }
  }
}

function updateUsername(username) {
  const usernameEl = document.getElementById('username');
  if (usernameEl) {
    usernameEl.textContent = escapeHtml(username);
  }

  const userAvatar = document.getElementById('userAvatar');
  const userMenuAvatar = document.getElementById('userMenuAvatar');
  
  if (userAvatar && !userAvatar.style.backgroundImage) {
    userAvatar.textContent = username.substring(0, 2).toUpperCase();
  }
  if (userMenuAvatar && !userMenuAvatar.style.backgroundImage) {
    userMenuAvatar.textContent = username.substring(0, 2).toUpperCase();
  }
}

async function loadUserProfile() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const data = await response.json();
      
      const userAvatar = document.getElementById('userAvatar');
      const userMenuAvatar = document.getElementById('userMenuAvatar');
      
      if (data.avatar && data.avatar.startsWith('data:')) {
        if (userAvatar) {
          userAvatar.style.backgroundImage = `url(${escapeHtml(data.avatar)})`;
          userAvatar.textContent = '';
        }
        if (userMenuAvatar) {
          userMenuAvatar.style.backgroundImage = `url(${escapeHtml(data.avatar)})`;
          userMenuAvatar.textContent = '';
        }
      } else {
        const username = data.username || '';
        if (userAvatar && !userAvatar.style.backgroundImage) {
          userAvatar.textContent = username.substring(0, 2).toUpperCase();
        }
        if (userMenuAvatar && !userMenuAvatar.style.backgroundImage) {
          userMenuAvatar.textContent = username.substring(0, 2).toUpperCase();
        }
      }
    }
  } catch (err) {
    console.error('Failed to load user profile:', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

