export async function checkWarnings() {
  try {
    const [projectsRes, accountRes] = await Promise.all([
      fetch('/api/warnings/expiring-projects'),
      fetch('/api/warnings/account-status')
    ]);

    if (projectsRes.ok) {
      const data = await projectsRes.json();
      if (data.projects && data.projects.length > 0) {
        showProjectWarnings(data.projects);
      }
    }

    if (accountRes.ok) {
      const data = await accountRes.json();
      if (data.warning) {
        showAccountWarning(data.daysUntilDeletion);
      }
    }
  } catch (err) {
    console.error('Failed to check warnings:', err);
  }
}

function showProjectWarnings(projects) {
  const container = document.getElementById('warningsContainer');
  if (!container) return;

  projects.forEach(project => {
    const daysUntilDeletion = 90 - Math.floor(project.days_inactive);
    
    const warning = document.createElement('div');
    warning.className = 'warning-banner warning-project';
    warning.innerHTML = `
      <svg viewBox="0 0 24 24" class="warning-icon">
        <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16v2h2v-2h-2zm0-6v4h2v-4h-2z"/>
      </svg>
      <div class="warning-content">
        <strong>Project "${escapeHtml(project.name)}" will be deleted</strong>
        <span>in ${daysUntilDeletion} day${daysUntilDeletion !== 1 ? 's' : ''} due to inactivity</span>
      </div>
      <button class="warning-close" onclick="this.parentElement.remove()">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    `;
    
    container.appendChild(warning);
  });
}

function showAccountWarning(daysUntilDeletion) {
  const container = document.getElementById('warningsContainer');
  if (!container) return;

  const warning = document.createElement('div');
  warning.className = 'warning-banner warning-account';
  warning.innerHTML = `
    <svg viewBox="0 0 24 24" class="warning-icon">
      <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16v2h2v-2h-2zm0-6v4h2v-4h-2z"/>
    </svg>
    <div class="warning-content">
      <strong>Your account will be deleted</strong>
      <span>in ${daysUntilDeletion} day${daysUntilDeletion !== 1 ? 's' : ''} due to inactivity</span>
    </div>
    <button class="warning-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
  `;
  
  container.appendChild(warning);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

