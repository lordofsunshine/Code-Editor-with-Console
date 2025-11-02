let starsAnimationInterval = null;
let starsCount = 0;
const MAX_STARS = 30;

function initStarsAnimation() {
  const editorContainer = document.querySelector('.editor-container');
  if (!editorContainer) return;

  let starsContainer = editorContainer.querySelector('.stars-container');
  if (!starsContainer) {
    starsContainer = document.createElement('div');
    starsContainer.className = 'stars-container';
    editorContainer.appendChild(starsContainer);
  }

  starsCount = 0;

  const createStar = () => {
    if (!document.getElementById('welcomeScreen') || document.getElementById('welcomeScreen').classList.contains('hidden')) {
      return;
    }

    if (starsCount >= MAX_STARS) {
      return;
    }

    const star = document.createElement('div');
    star.className = 'star';
    
    const size = Math.random() > 0.7 ? 'large' : Math.random() > 0.5 ? 'medium' : 'small';
    star.classList.add(size);
    
    if (Math.random() > 0.8) {
      star.classList.add('twinkle');
    }
    
    const rotation = Math.random() * 360;
    
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 1 + 's';
    star.style.setProperty('--rotation', `${rotation}deg`);
    star.style.transform = `rotate(${rotation}deg)`;
    
    starsContainer.appendChild(star);
    starsCount++;
    
    const fadeDelay = 5000 + Math.random() * 3000;
    setTimeout(() => {
      if (star.parentNode) {
        star.style.animation = 'starFade 2.5s ease-in forwards';
        setTimeout(() => {
          if (star.parentNode) {
            star.remove();
            starsCount--;
          }
        }, 2500);
      }
    }, fadeDelay);
  };

  starsAnimationInterval = setInterval(() => {
    if (starsCount < MAX_STARS) {
      createStar();
    }
  }, 1000);

  for (let i = 0; i < 5; i++) {
    setTimeout(() => createStar(), i * 400);
  }
}

function stopStarsAnimation() {
  if (starsAnimationInterval) {
    clearInterval(starsAnimationInterval);
    starsAnimationInterval = null;
  }
  
  const starsContainer = document.querySelector('.stars-container');
  if (starsContainer) {
    const stars = starsContainer.querySelectorAll('.star');
    stars.forEach(star => {
      star.style.transition = 'opacity 0.5s ease-out';
      star.style.opacity = '0';
      setTimeout(() => star.remove(), 500);
    });
    setTimeout(() => {
      if (starsContainer.parentNode) {
        starsContainer.remove();
      }
    }, 600);
  }
  
  starsCount = 0;
}

function checkWelcomeScreenVisibility() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
    if (!starsAnimationInterval) {
      initStarsAnimation();
    }
  } else {
    if (starsAnimationInterval) {
      stopStarsAnimation();
    }
  }
}

function initStarsObserver() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  if (!welcomeScreen) return;

  checkWelcomeScreenVisibility();
  
  const observer = new MutationObserver(() => {
    checkWelcomeScreenVisibility();
  });

  observer.observe(welcomeScreen, {
    attributes: true,
    attributeFilter: ['class']
  });
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

async function fetchWithCSRF(url, options = {}) {
  const csrfToken = window.editorState?.csrfToken || getCookie('csrfToken');
  if (csrfToken && options.method && options.method !== 'GET') {
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': csrfToken
    };
  }
  return fetch(url, options);
}

export { initStarsObserver, stopStarsAnimation, getCookie, fetchWithCSRF };

