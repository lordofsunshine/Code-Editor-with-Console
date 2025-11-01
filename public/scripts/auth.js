const tabs = document.querySelectorAll('.tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMessage = document.getElementById('errorMessage');
const tabsContainer = document.querySelector('.tabs');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    tabsContainer.dataset.active = targetTab;
    
    if (targetTab === 'login') {
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
    } else {
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
    }
    
    hideError();
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      window.location.href = '/editor';
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (err) {
    showError('Connection error');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  
  if (username.length < 3) {
    showError('Username must be at least 3 characters');
    return;
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      tabs[0].click();
      showError('Account created! Please login.', 'success');
      document.getElementById('loginUsername').value = username;
    } else {
      showError(data.error || 'Registration failed');
    }
  } catch (err) {
    showError('Connection error');
  }
});

function showError(message, type = 'error') {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
  
  if (type === 'success') {
    errorMessage.style.background = 'rgba(60, 255, 60, 0.1)';
    errorMessage.style.borderColor = 'rgba(60, 255, 60, 0.3)';
    errorMessage.style.color = '#6bff6b';
  } else {
    errorMessage.style.background = 'rgba(255, 60, 60, 0.1)';
    errorMessage.style.borderColor = 'rgba(255, 60, 60, 0.3)';
    errorMessage.style.color = '#ff6b6b';
  }
}

function hideError() {
  errorMessage.classList.remove('active');
}

