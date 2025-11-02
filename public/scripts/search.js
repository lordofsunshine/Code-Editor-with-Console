import { getCookie, fetchWithCSRF } from './utils.js';

let searchModal = null;
let searchResults = [];
let currentProjectId = null;

export function initSearch() {
  createSearchModal();
}

export function setSearchProjectId(projectId) {
  currentProjectId = projectId;
}

function createSearchModal() {
  searchModal = document.createElement('div');
  searchModal.className = 'search-modal';
  searchModal.innerHTML = `
    <div class="search-content">
      <div class="search-header">
        <h3>Search Files</h3>
        <button class="search-close" aria-label="Close search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="search-input-wrapper">
        <input type="text" class="search-input" placeholder="Search files..." autocomplete="off">
        <div class="search-options">
          <label class="search-option">
            <input type="radio" name="searchType" value="names" checked>
            <span>File names</span>
          </label>
          <label class="search-option">
            <input type="radio" name="searchType" value="content">
            <span>File content</span>
          </label>
        </div>
      </div>
      <div class="search-results"></div>
    </div>
  `;
  document.body.appendChild(searchModal);

  const closeBtn = searchModal.querySelector('.search-close');
  const searchInput = searchModal.querySelector('.search-input');
  const searchOptions = searchModal.querySelectorAll('input[name="searchType"]');

  closeBtn.addEventListener('click', hideSearch);
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) hideSearch();
  });

  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value);
    }, 300);
  });

  searchOptions.forEach(option => {
    option.addEventListener('change', () => {
      if (searchInput.value.trim()) {
        performSearch(searchInput.value);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      showSearch();
    }
    if (e.key === 'Escape' && searchModal.classList.contains('active')) {
      hideSearch();
    }
  });
}

export function showSearch() {
  if (!currentProjectId) {
    showMessage('Please select a project first', 'error');
    return;
  }
  searchModal.classList.add('active');
  const searchInput = searchModal.querySelector('.search-input');
  searchInput.value = '';
  searchInput.focus();
  searchModal.querySelector('.search-results').innerHTML = '';
}

export function hideSearch() {
  searchModal.classList.remove('active');
}

async function performSearch(query) {
  if (!query.trim() || !currentProjectId) {
    searchModal.querySelector('.search-results').innerHTML = '';
    return;
  }

  const searchType = searchModal.querySelector('input[name="searchType"]:checked').value;
  
  try {
    const response = await fetchWithCSRF('/api/search/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: currentProjectId,
        query: query,
        searchIn: searchType
      })
    });

    if (response.ok) {
      const data = await response.json();
      displaySearchResults(data.results, query, searchType);
    } else {
      const error = await response.json();
      showMessage(error.error || 'Search failed', 'error');
    }
  } catch (err) {
    showMessage('Search failed', 'error');
  }
}

function displaySearchResults(results, query, searchType) {
  const resultsContainer = searchModal.querySelector('.search-results');
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="search-empty">No results found</div>';
    return;
  }

  resultsContainer.innerHTML = `
    <div class="search-count">${results.length} result${results.length !== 1 ? 's' : ''}</div>
    ${results.map(file => `
      <div class="search-result-item" data-file-id="${file.id}">
        <div class="search-result-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
        </div>
        <div class="search-result-content">
          <div class="search-result-name">${highlightMatch(file.name, query)}</div>
          <div class="search-result-path">${file.path}</div>
          ${searchType === 'content' ? `<div class="search-result-preview">${getContentPreview(file.content, query)}</div>` : ''}
        </div>
      </div>
    `).join('')}
  `;

  resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const fileId = parseInt(item.dataset.fileId);
      if (window.openFileById) {
        window.openFileById(fileId);
        hideSearch();
      }
    });
  });
}

function highlightMatch(text, query) {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function getContentPreview(content, query) {
  const index = content.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return '';
  
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 50);
  let preview = content.substring(start, end);
  
  if (start > 0) preview = '...' + preview;
  if (end < content.length) preview = preview + '...';
  
  return highlightMatch(preview, query);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showMessage(message, type = 'info') {
  if (window.showToast) {
    window.showToast(message, type);
  } else if (window.showMessage) {
    window.showMessage(message, type);
  }
}

