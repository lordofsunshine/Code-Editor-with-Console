import { fetchWhatsNew } from '../utils/whatsnew.js';

export async function initWhatsNew() {
  const container = document.getElementById('whatsNewContainer');
  const list = document.getElementById('whatsNewList');
  
  if (!container || !list) return;
  
  try {
    const data = await fetchWhatsNew();
    
    if (!data || !data.items || data.items.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    list.innerHTML = data.items.map(item => `
      <div class="whats-new-item">
        <div class="whats-new-item-title">${escapeHtml(item.title)}</div>
        <div class="whats-new-item-description">${escapeHtml(item.description)}</div>
      </div>
    `).join('');
    
    const link = container.querySelector('.whats-new-link');
    if (link && data.repoUrl) {
      link.href = data.repoUrl;
    }
    
    container.classList.add('loaded');
  } catch (err) {
    console.error('Failed to load What\'s New:', err);
    container.style.display = 'none';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

