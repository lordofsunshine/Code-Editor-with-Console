const README_URL = 'https://raw.githubusercontent.com/lordofsunshine/Code-Editor-with-Console/refs/heads/main/README.md';
const REPO_URL = 'https://github.com/lordofsunshine/Code-Editor-with-Console';

let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000;

export async function fetchWhatsNew() {
  if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const response = await fetch(README_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch README');
    }
    
    const markdown = await response.text();
    const whatsNew = parseWhatsNew(markdown);
    
    cachedData = whatsNew;
    cacheTimestamp = Date.now();
    
    return whatsNew;
  } catch (err) {
    console.error('Failed to fetch What\'s New:', err);
    return getDefaultWhatsNew();
  }
}

function parseWhatsNew(markdown) {
  const whatsNewRegex = /### What's New\?\s*\n\n([\s\S]*?)(?=\n###|\n##|$)/i;
  const match = markdown.match(whatsNewRegex);
  
  if (!match || !match[1]) {
    return getDefaultWhatsNew();
  }
  
  let content = match[1].trim();
  const items = [];
  
  const itemRegex = /^- \*\*([^*]+)\*\*: (.+?)(?=\n- |$)/gs;
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(content)) !== null) {
    const title = itemMatch[1].trim();
    let description = itemMatch[2].trim();
    
    if (description.length > 120) {
      description = description.substring(0, 120) + '...';
    }
    
    items.push({ title, description });
  }
  
  if (items.length === 0) {
    return getDefaultWhatsNew();
  }
  
  return {
    items: items.slice(0, 5),
    repoUrl: REPO_URL
  };
}

function getDefaultWhatsNew() {
  return {
    items: [
      {
        title: 'Folder structure support',
        description: 'Create nested directories and organize files hierarchically...'
      },
      {
        title: 'Project chat system',
        description: 'Real-time chat for project collaborators with automatic cleanup...'
      },
      {
        title: 'Custom select menus',
        description: 'Modern, theme-aware custom select components replacing default browser selects...'
      },
      {
        title: 'Enhanced UI animations',
        description: 'Smooth message animations in chat, response time indicators...'
      },
      {
        title: 'Terms of Service',
        description: 'Comprehensive Terms of Service page covering platform rules...'
      }
    ],
    repoUrl: REPO_URL
  };
}

