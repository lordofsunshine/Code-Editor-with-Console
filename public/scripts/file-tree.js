const folderState = new Map();

const state = {
  container: null,
  onFileOpen: null,
  onDeleteFile: null,
  onDeleteFolder: null,
  folderLookup: new Map(),
  filesLookup: new Map(),
  isReadOnly: () => false,
  files: []
};

export function initFileTree(options) {
  const {
    container,
    onFileOpen,
    onDeleteFile,
    onDeleteFolder,
    isReadOnly
  } = options;

  state.container = container;
  state.onFileOpen = onFileOpen;
  state.onDeleteFile = onDeleteFile;
  state.onDeleteFolder = onDeleteFolder;
  state.isReadOnly = typeof isReadOnly === 'function' ? isReadOnly : () => false;

  if (container) {
    container.addEventListener('click', handleClick);
  }

  return {
    update(files, activeFileId) {
      if (!Array.isArray(files)) {
        return;
      }
      renderTree(files, activeFileId);
    }
  };
}

function renderTree(files, activeFileId) {
  const { nodes, folderLookup, filesLookup } = buildTree(files);
  Array.from(folderState.keys()).forEach(path => {
    if (!folderLookup.has(path)) {
      folderState.delete(path);
    }
  });
  state.folderLookup = folderLookup;
  state.filesLookup = filesLookup;
  state.files = files;

  if (!state.container) {
    return;
  }

  if (files.length === 0) {
    state.container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" class="empty-icon">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
        </svg>
        <span>No files yet</span>
      </div>
    `;
    return;
  }

  const html = renderNodes(nodes, activeFileId);
  state.container.innerHTML = html;
}

function buildTree(files) {
  const rootNodes = [];
  const folderLookup = new Map();
  const filesLookup = new Map();

  const ensureFolder = (pathSegments) => {
    const path = pathSegments.join('/');
    if (!folderLookup.has(path)) {
      const depth = pathSegments.length - 1;
      const name = pathSegments[pathSegments.length - 1];
      const node = {
        type: 'folder',
        name,
        path,
        depth,
        children: [],
        fileIds: new Set()
      };
      folderLookup.set(path, node);

      if (pathSegments.length === 1) {
        rootNodes.push(node);
      } else {
        const parentPath = pathSegments.slice(0, -1).join('/');
        const parent = folderLookup.get(parentPath);
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    }
    return folderLookup.get(path);
  };

  files.forEach(file => {
    if (!file || typeof file.path !== 'string') {
      return;
    }

    const segments = file.path.split('/');
    const depth = segments.length - 1;
    filesLookup.set(file.id, file);

    for (let i = 1; i <= depth; i++) {
      const folderSegments = segments.slice(0, i);
      const folderNode = ensureFolder(folderSegments);
      folderNode.fileIds.add(file.id);
    }

    const fileNode = {
      ...file,
      type: 'file',
      depth
    };

    if (depth === 0) {
      rootNodes.push(fileNode);
    } else {
      const parentPath = segments.slice(0, -1).join('/');
      const parent = folderLookup.get(parentPath);
      if (parent) {
        parent.children.push(fileNode);
      } else {
        rootNodes.push(fileNode);
      }
    }
  });

  sortNodes(rootNodes);

  return { nodes: rootNodes, folderLookup, filesLookup };
}

function sortNodes(nodes) {
  nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    return a.type === 'folder' ? -1 : 1;
  });

  nodes.forEach(node => {
    if (node.type === 'folder') {
      sortNodes(node.children);
    }
  });
}

function renderNodes(nodes, activeFileId) {
  return nodes.map(node => {
    if (node.type === 'folder') {
      return renderFolderNode(node, activeFileId);
    }
    return renderFileNode(node, activeFileId);
  }).join('');
}

function renderFolderNode(node, activeFileId) {
  const isExpanded = folderState.has(node.path) ? folderState.get(node.path) : true;
  const childrenHtml = isExpanded ? renderNodes(node.children, activeFileId) : '';
  const readOnly = state.isReadOnly();
  const hasFiles = node.fileIds && node.fileIds.size > 0;
  const depth = Math.max(node.depth, 0);

  return `
    <div class="file-tree-node folder ${isExpanded ? 'expanded' : 'collapsed'}" data-path="${escapeHtml(node.path)}">
      <div class="file-tree-item file-item folder-item" data-depth="${depth}" style="--depth:${depth}">
        <button class="file-tree-toggle" data-action="toggle" data-path="${escapeHtml(node.path)}" aria-label="Toggle folder">
          <svg viewBox="0 0 24 24">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </button>
        <svg class="file-icon folder-icon" viewBox="0 0 24 24">
          <path d="M10 4l2 2h8c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2L2.01 6C2.01 4.9 2.9 4 4.01 4H10z"/>
        </svg>
        <span class="file-name" data-action="toggle" data-path="${escapeHtml(node.path)}" title="${escapeHtml(node.path)}">${escapeHtml(node.name)}</span>
        ${readOnly || !hasFiles ? '' : `
          <button class="file-delete" data-action="delete-folder" data-path="${escapeHtml(node.path)}" title="Delete folder">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        `}
      </div>
      <div class="file-tree-children">
        ${childrenHtml}
      </div>
    </div>
  `;
}

function renderFileNode(node, activeFileId) {
  const isActive = node.id === activeFileId;
  const readOnly = state.isReadOnly();
  const depth = Math.max(node.depth, 0);

  return `
    <div class="file-tree-node file ${isActive ? 'active' : ''}" data-id="${node.id}">
      <div class="file-tree-item file-item" data-depth="${depth}" style="--depth:${depth}">
        <span class="file-tree-toggle placeholder" aria-hidden="true"></span>
        <svg class="file-icon" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
        </svg>
        <button class="file-name-btn" data-action="open-file" data-id="${node.id}" title="${escapeHtml(node.path)}">
          ${escapeHtml(node.name)}
        </button>
        ${readOnly ? '' : `
          <button class="file-delete" data-action="delete-file" data-id="${node.id}" title="Delete file">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        `}
      </div>
    </div>
  `;
}

function handleClick(event) {
  event.stopPropagation();
  
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget || !state.container || !state.container.contains(actionTarget)) {
    return;
  }

  event.preventDefault();

  const action = actionTarget.dataset.action;

  if (action === 'toggle') {
    const path = actionTarget.dataset.path;
    if (path) {
      const current = folderState.has(path) ? folderState.get(path) : true;
      folderState.set(path, !current);
      renderTree(state.files, getActiveFileId());
    }
    return;
  }

  if (action === 'open-file') {
    const id = parseInt(actionTarget.dataset.id, 10);
    if (!Number.isNaN(id) && state.onFileOpen && typeof state.onFileOpen === 'function') {
      state.onFileOpen(id);
    }
    return;
  }

  if (action === 'delete-file') {
    event.stopPropagation();
    const id = parseInt(actionTarget.dataset.id, 10);
    if (!Number.isNaN(id) && state.onDeleteFile && typeof state.onDeleteFile === 'function') {
      state.onDeleteFile(id);
    }
    return;
  }

  if (action === 'delete-folder') {
    event.stopPropagation();
    const path = actionTarget.dataset.path;
    if (path && state.onDeleteFolder && typeof state.onDeleteFolder === 'function') {
      const entry = state.folderLookup.get(path);
      const fileIds = entry ? Array.from(entry.fileIds) : [];
      state.onDeleteFolder(path, fileIds);
    }
  }
}

function getActiveFileId() {
  const activeNode = state.container.querySelector('.file-tree-node.file.active');
  if (!activeNode) {
    return null;
  }

  const id = parseInt(activeNode.dataset.id, 10);
  return Number.isNaN(id) ? null : id;
}

function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

