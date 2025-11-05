const tabs = document.querySelectorAll('.tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMessage = document.getElementById('errorMessage');
const tabsContainer = document.querySelector('.tabs');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');

const loginBtn = loginForm.querySelector('.btn-auth');
const registerBtn = registerForm.querySelector('.btn-auth');

function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

function validateUsername(username) {
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { valid: false, message: 'Username must be less than 20 characters' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  return { valid: true };
}

function calculatePasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  if (strength <= 1) return 'weak';
  if (strength === 2) return 'fair';
  if (strength === 3 || strength === 4) return 'good';
  return 'strong';
}

function updatePasswordStrength(password) {
  const strengthContainer = document.querySelector('.password-strength');
  const strengthText = strengthContainer.querySelector('.strength-text');
  
  if (password.length === 0) {
    strengthContainer.className = 'password-strength';
    strengthText.textContent = 'Enter password';
    return;
  }
  
  const strength = calculatePasswordStrength(password);
  strengthContainer.className = `password-strength ${strength}`;
  
  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong'
  };
  
  strengthText.textContent = strengthLabels[strength];
}

function showValidation(input, message, isError = true) {
  const wrapper = input.closest('.input-wrapper');
  const validationMsg = wrapper.querySelector('.validation-message');
  
  if (message) {
    validationMsg.textContent = message;
    validationMsg.className = isError ? 'validation-message error' : 'validation-message success';
  } else {
    validationMsg.className = 'validation-message';
    validationMsg.textContent = '';
  }
}

function validateForm(form) {
  if (form === loginForm) {
    return loginUsername.value.length >= 3 && loginPassword.value.length >= 6;
  } else {
    const usernameValid = validateUsername(registerUsername.value).valid;
    return usernameValid && registerPassword.value.length >= 6 && registerPassword.value.length <= 128;
  }
}

function updateButtonState(form) {
  const button = form.querySelector('.btn-auth');
  const isValid = validateForm(form);
  button.disabled = !isValid;
}

loginUsername.addEventListener('input', () => {
  updateButtonState(loginForm);
});

loginPassword.addEventListener('input', () => {
  updateButtonState(loginForm);
});

registerUsername.addEventListener('input', (e) => {
  const value = e.target.value;
  updateButtonState(registerForm);
  
  if (value.length > 0) {
    const validation = validateUsername(value);
    if (!validation.valid) {
      showValidation(e.target, validation.message, true);
    } else {
      showValidation(e.target, '✓ Valid username', false);
    }
  } else {
    showValidation(e.target, '', false);
  }
});

registerPassword.addEventListener('input', (e) => {
  const value = e.target.value;
  updatePasswordStrength(value);
  updateButtonState(registerForm);
  
  if (value.length > 0 && value.length < 6) {
    showValidation(e.target, 'Password must be at least 6 characters', true);
  } else if (value.length > 128) {
    showValidation(e.target, 'Password must be less than 128 characters', true);
  } else if (value.length >= 6) {
    showValidation(e.target, '', false);
  } else {
    showValidation(e.target, '', false);
  }
});

document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);
    const eyeOpen = button.querySelector('.eye-open');
    const eyeClosed = button.querySelector('.eye-closed');
    
    if (input.type === 'password') {
      input.type = 'text';
      eyeOpen.style.display = 'none';
      eyeClosed.style.display = 'block';
    } else {
      input.type = 'password';
      eyeOpen.style.display = 'block';
      eyeClosed.style.display = 'none';
    }
  });
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    tabsContainer.dataset.active = targetTab;
    
    if (targetTab === 'login') {
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
      document.querySelector('.logo-section h1').textContent = 'Welcome Back';
      document.querySelector('.subtitle').textContent = 'Sign in to continue coding';
    } else {
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
      document.querySelector('.logo-section h1').textContent = 'Create Account';
      document.querySelector('.subtitle').textContent = 'Join our developer community';
    }
    
    hideMessage();
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = sanitizeInput(loginUsername.value.trim());
  const password = loginPassword.value;
  
  if (!validateForm(loginForm)) {
    showMessage('Please fill in all fields correctly', 'error');
    return;
  }
  
  loginBtn.disabled = true;
  loginBtn.querySelector('.btn-text').textContent = 'Signing In...';
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/editor';
      }, 1000);
    } else {
      showMessage(sanitizeInput(data.error || 'Login failed'), 'error');
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').textContent = 'Sign In';
    }
  } catch (err) {
    showMessage('Connection error. Please try again.', 'error');
    loginBtn.disabled = false;
    loginBtn.querySelector('.btn-text').textContent = 'Sign In';
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = sanitizeInput(registerUsername.value.trim());
  const password = registerPassword.value;
  
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    showMessage(usernameValidation.message, 'error');
    return;
  }
  
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters', 'error');
    return;
  }
  
  if (password.length > 128) {
    showMessage('Password must be less than 128 characters', 'error');
    return;
  }
  
  registerBtn.disabled = true;
  registerBtn.querySelector('.btn-text').textContent = 'Creating Account...';
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showMessage('Account created successfully! Please sign in.', 'success');
      
      setTimeout(() => {
        tabs[0].click();
        loginUsername.value = username;
        registerUsername.value = '';
        registerPassword.value = '';
        updatePasswordStrength('');
        showValidation(registerUsername, '', false);
        showValidation(registerPassword, '', false);
        registerBtn.disabled = true;
        registerBtn.querySelector('.btn-text').textContent = 'Create Account';
        loginUsername.focus();
      }, 1500);
    } else {
      showMessage(sanitizeInput(data.error || 'Registration failed'), 'error');
      registerBtn.disabled = false;
      registerBtn.querySelector('.btn-text').textContent = 'Create Account';
    }
  } catch (err) {
    showMessage('Connection error. Please try again.', 'error');
    registerBtn.disabled = false;
    registerBtn.querySelector('.btn-text').textContent = 'Create Account';
  }
});

function showMessage(message, type = 'error') {
  if (window.showToast) {
    window.showToast(message, type);
    return;
  }
  
  errorMessage.textContent = sanitizeInput(message);
  errorMessage.className = `message-box ${type} active`;
  
  if (type === 'success') {
    setTimeout(() => {
      hideMessage();
    }, 3000);
  }
}

function hideMessage() {
  errorMessage.classList.remove('active');
  setTimeout(() => {
    errorMessage.className = 'message-box';
  }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
  loginUsername.focus();
});
