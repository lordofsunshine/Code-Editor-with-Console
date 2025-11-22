import Database3 from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class Database {
  constructor() {
    const dbPath = './data';
    if (!existsSync(dbPath)) {
      mkdirSync(dbPath, { recursive: true });
    }
    
    this.db = new Database3('./data/editor.db');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000');
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('auto_vacuum = INCREMENTAL');
    
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        encryption_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        language TEXT DEFAULT 'plaintext',
        size INTEGER DEFAULT 0,
        is_media INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, path)
      );

      CREATE TABLE IF NOT EXISTS project_collaborators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'editor',
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'editor',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS editor_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        settings TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_last_access ON users(last_accessed_at);
      CREATE INDEX IF NOT EXISTS idx_projects_last_access ON projects(last_accessed_at);
      CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
      CREATE INDEX IF NOT EXISTS idx_collaborators_user ON project_collaborators(user_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_to_user ON invitations(to_user_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
      CREATE INDEX IF NOT EXISTS idx_editor_settings_user ON editor_settings(user_id);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
    `);

    const userColumns = this.db.pragma('table_info(users)');
    const hasLastAccessed = userColumns.some(col => col.name === 'last_accessed_at');
    
    if (!hasLastAccessed) {
      this.db.exec(`
        ALTER TABLE users ADD COLUMN last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE projects ADD COLUMN last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP;
        CREATE INDEX IF NOT EXISTS idx_users_last_access ON users(last_accessed_at);
        CREATE INDEX IF NOT EXISTS idx_projects_last_access ON projects(last_accessed_at);
      `);
    }

    const invitationColumns = this.db.pragma('table_info(invitations)');
    const hasRoleInInvitations = invitationColumns.some(col => col.name === 'role');
    
    if (!hasRoleInInvitations) {
      this.db.exec(`
        ALTER TABLE invitations ADD COLUMN role TEXT DEFAULT 'editor';
      `);
    }

    const collaboratorColumns = this.db.pragma('table_info(project_collaborators)');
    const hasRoleInCollaborators = collaboratorColumns.some(col => col.name === 'role');
    
    if (!hasRoleInCollaborators) {
      this.db.exec(`
        ALTER TABLE project_collaborators ADD COLUMN role TEXT DEFAULT 'editor';
      `);
    }

    const projectColumns = this.db.pragma('table_info(projects)');
    const hasEncryptionKey = projectColumns.some(col => col.name === 'encryption_key');
    
    if (!hasEncryptionKey) {
      this.db.exec(`
        ALTER TABLE projects ADD COLUMN encryption_key TEXT;
      `);
    }

    const fileColumns = this.db.pragma('table_info(files)');
    const hasSize = fileColumns.some(col => col.name === 'size');
    const hasIsMedia = fileColumns.some(col => col.name === 'is_media');
    
    if (!hasSize) {
      this.db.exec(`
        ALTER TABLE files ADD COLUMN size INTEGER DEFAULT 0;
        ALTER TABLE files ADD COLUMN is_media INTEGER DEFAULT 0;
      `);
    } else if (!hasIsMedia) {
      this.db.exec(`
        ALTER TABLE files ADD COLUMN is_media INTEGER DEFAULT 0;
      `);
    }

    const hasContent = fileColumns.some(col => col.name === 'content');
    if (hasContent) {
      const files = this.db.prepare('SELECT id, project_id FROM files WHERE content IS NOT NULL AND content != ?').all('');
      if (files.length > 0) {
        console.log(`Warning: ${files.length} files have content in database. Migration needed.`);
      }
    }
  }

  createUser(username, password) {
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      throw new Error('Invalid user data');
    }
    const stmt = this.db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    return stmt.run(username, password);
  }

  getUserByUsername(username) {
    if (!username || typeof username !== 'string' || username.length > 100) {
      return null;
    }
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  updateUserLastAccess(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }
    const stmt = this.db.prepare('UPDATE users SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(userId);
  }

  createProject(userId, name, encryptionKey) {
    if (!Number.isInteger(userId) || userId <= 0 || !name || !encryptionKey) {
      throw new Error('Invalid project data');
    }
    const stmt = this.db.prepare('INSERT INTO projects (user_id, name, encryption_key) VALUES (?, ?, ?)');
    return stmt.run(userId, name, encryptionKey);
  }

  getProjects(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return [];
    }
    const stmt = this.db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId);
  }

  getProject(projectId, userId) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return null;
    }
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?');
    return stmt.get(projectId, userId);
  }

  getProjectById(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return null;
    }
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(projectId);
  }

  getProjectByUsernameAndName(username, projectName) {
    if (!username || typeof username !== 'string' || username.length > 100) {
      return null;
    }
    if (!projectName || typeof projectName !== 'string' || projectName.length > 100) {
      return null;
    }
    const stmt = this.db.prepare(`
      SELECT p.*, u.username 
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE u.username = ? AND p.name = ?
      LIMIT 1
    `);
    return stmt.get(username, projectName);
  }

  getFileByPath(projectId, filePath) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return null;
    }
    if (!filePath || typeof filePath !== 'string' || filePath.length > 500) {
      return null;
    }
    const stmt = this.db.prepare('SELECT * FROM files WHERE project_id = ? AND path = ? LIMIT 1');
    return stmt.get(projectId, filePath);
  }

  getProjectEncryptionKey(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return null;
    }
    const stmt = this.db.prepare('SELECT encryption_key FROM projects WHERE id = ?');
    const result = stmt.get(projectId);
    return result?.encryption_key;
  }

  updateProjectLastAccess(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return;
    }
    const stmt = this.db.prepare('UPDATE projects SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(projectId);
  }

  deleteProject(projectId, userId) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return { changes: 0 };
    }
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
    return stmt.run(projectId, userId);
  }

  createFile(projectId, name, path, language = 'plaintext', size = 0, isMedia = 0) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !name || !path) {
      throw new Error('Invalid file data');
    }
    if (!Number.isInteger(size) || size < 0) {
      size = 0;
    }
    const stmt = this.db.prepare(
      'INSERT INTO files (project_id, name, path, language, size, is_media) VALUES (@projectId, @name, @path, @language, @size, @isMedia)'
    );
    return stmt.run({ projectId, name, path, language, size, isMedia: isMedia ? 1 : 0 });
  }

  getFiles(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return [];
    }
    const stmt = this.db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY path');
    return stmt.all(projectId);
  }

  getFile(fileId, projectId) {
    if (!Number.isInteger(fileId) || fileId <= 0 || !Number.isInteger(projectId) || projectId <= 0) {
      return null;
    }
    const stmt = this.db.prepare('SELECT * FROM files WHERE id = ? AND project_id = ?');
    return stmt.get(fileId, projectId);
  }

  getFileWithContent(fileId, projectId) {
    if (!Number.isInteger(fileId) || fileId <= 0 || !Number.isInteger(projectId) || projectId <= 0) {
      return null;
    }
    
    try {
      const fileColumns = this.db.pragma('table_info(files)');
      const hasContent = fileColumns.some(col => col.name === 'content');
      
      if (hasContent) {
        const stmt = this.db.prepare('SELECT * FROM files WHERE id = ? AND project_id = ?');
        const file = stmt.get(fileId, projectId);
        if (file && file.content && file.content.trim() !== '') {
          return file;
        }
      }
    } catch (err) {
      return null;
    }
    
    return null;
  }

  updateFile(fileId, size) {
    if (!Number.isInteger(fileId) || fileId <= 0 || !Number.isInteger(size) || size < 0) {
      return;
    }
    const stmt = this.db.prepare(
      'UPDATE files SET size = @size, updated_at = CURRENT_TIMESTAMP WHERE id = @fileId'
    );
    return stmt.run({ size, fileId });
  }

  deleteFile(fileId, projectId) {
    if (!Number.isInteger(fileId) || fileId <= 0 || !Number.isInteger(projectId) || projectId <= 0) {
      return { changes: 0 };
    }
    const stmt = this.db.prepare('DELETE FROM files WHERE id = ? AND project_id = ?');
    return stmt.run(fileId, projectId);
  }

  updateProjectTimestamp(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return;
    }
    const stmt = this.db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(projectId);
  }

  updateUserAvatar(userId, avatar) {
    if (!Number.isInteger(userId) || userId <= 0 || typeof avatar !== 'string') {
      return;
    }
    const stmt = this.db.prepare('UPDATE users SET avatar = ? WHERE id = ?');
    return stmt.run(avatar, userId);
  }

  updateUsername(userId, username) {
    if (!Number.isInteger(userId) || userId <= 0 || !username || typeof username !== 'string') {
      return;
    }
    const stmt = this.db.prepare('UPDATE users SET username = ? WHERE id = ?');
    return stmt.run(username, userId);
  }

  getUserAvatar(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }
    const stmt = this.db.prepare('SELECT avatar FROM users WHERE id = ?');
    return stmt.get(userId);
  }

  getInactiveProjects(daysInactive) {
    if (!Number.isInteger(daysInactive) || daysInactive <= 0) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT p.*, u.username 
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE datetime(p.last_accessed_at) <= datetime('now', ? || ' days')
    `);
    return stmt.all(-Math.abs(daysInactive));
  }

  getInactiveUsers(daysInactive) {
    if (!Number.isInteger(daysInactive) || daysInactive <= 0) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT id, username, last_accessed_at
      FROM users
      WHERE datetime(last_accessed_at) <= datetime('now', ? || ' days')
    `);
    return stmt.all(-Math.abs(daysInactive));
  }

  deleteInactiveProjects(daysInactive) {
    if (!Number.isInteger(daysInactive) || daysInactive <= 0) {
      return { changes: 0 };
    }
    const stmt = this.db.prepare(`
      DELETE FROM projects 
      WHERE datetime(last_accessed_at) <= datetime('now', ? || ' days')
    `);
    return stmt.run(-Math.abs(daysInactive));
  }

  deleteInactiveUsers(daysInactive) {
    if (!Number.isInteger(daysInactive) || daysInactive <= 0) {
      return { changes: 0 };
    }
    const stmt = this.db.prepare(`
      DELETE FROM users 
      WHERE datetime(last_accessed_at) <= datetime('now', ? || ' days')
    `);
    return stmt.run(-Math.abs(daysInactive));
  }

  getExpiringProjects(userId, warningDays) {
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(warningDays) || warningDays <= 0) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT id, name, last_accessed_at,
             julianday('now') - julianday(last_accessed_at) as days_inactive
      FROM projects
      WHERE user_id = ?
      AND datetime(last_accessed_at) <= datetime('now', ? || ' days')
      ORDER BY last_accessed_at ASC
    `);
    return stmt.all(userId, -Math.abs(warningDays));
  }

  getAccountExpirationInfo(userId, warningDays) {
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(warningDays) || warningDays <= 0) {
      return null;
    }
    const stmt = this.db.prepare(`
      SELECT id, username, last_accessed_at,
             julianday('now') - julianday(last_accessed_at) as days_inactive
      FROM users
      WHERE id = ?
      AND datetime(last_accessed_at) <= datetime('now', ? || ' days')
    `);
    return stmt.get(userId, -Math.abs(warningDays));
  }

  vacuum() {
    this.db.exec('VACUUM');
  }

  optimize() {
    this.db.exec('PRAGMA optimize');
    this.db.exec('PRAGMA incremental_vacuum(100)');
  }

  createInvitation(projectId, fromUserId, toUserId, role = 'editor') {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fromUserId) || fromUserId <= 0 || !Number.isInteger(toUserId) || toUserId <= 0) {
      throw new Error('Invalid invitation data');
    }
    if (!['viewer', 'editor'].includes(role)) {
      role = 'editor';
    }
    const stmt = this.db.prepare('INSERT INTO invitations (project_id, from_user_id, to_user_id, role) VALUES (?, ?, ?, ?)');
    return stmt.run(projectId, fromUserId, toUserId, role);
  }

  getInvitation(invitationId) {
    if (!Number.isInteger(invitationId) || invitationId <= 0) {
      return null;
    }
    const stmt = this.db.prepare(`
      SELECT i.*, p.name as project_name, u1.username as from_username, u2.username as to_username
      FROM invitations i
      JOIN projects p ON i.project_id = p.id
      JOIN users u1 ON i.from_user_id = u1.id
      JOIN users u2 ON i.to_user_id = u2.id
      WHERE i.id = ?
    `);
    return stmt.get(invitationId);
  }

  getInvitationsByUser(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT i.*, p.name as project_name, u.username as from_username
      FROM invitations i
      JOIN projects p ON i.project_id = p.id
      JOIN users u ON i.from_user_id = u.id
      WHERE i.to_user_id = ? AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `);
    return stmt.all(userId);
  }

  getInvitationsByProject(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT i.*, u.username as to_username
      FROM invitations i
      JOIN users u ON i.to_user_id = u.id
      WHERE i.project_id = ?
      ORDER BY i.created_at DESC
    `);
    return stmt.all(projectId);
  }

  updateInvitationStatus(invitationId, status) {
    if (!Number.isInteger(invitationId) || invitationId <= 0 || typeof status !== 'string') {
      return;
    }
    const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled', 'removed', 'left'];
    if (!validStatuses.includes(status)) {
      return;
    }
    const stmt = this.db.prepare('UPDATE invitations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(status, invitationId);
  }

  addCollaborator(projectId, userId, role = 'editor') {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('Invalid collaborator data');
    }
    if (!['viewer', 'editor'].includes(role)) {
      role = 'editor';
    }
    const stmt = this.db.prepare('INSERT INTO project_collaborators (project_id, user_id, role) VALUES (?, ?, ?)');
    return stmt.run(projectId, userId, role);
  }

  getCollaborators(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT pc.*, u.username, u.avatar
      FROM project_collaborators pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.project_id = ?
    `);
    return stmt.all(projectId);
  }

  removeCollaborator(projectId, userId) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return { changes: 0 };
    }
    const stmt = this.db.prepare('DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?');
    return stmt.run(projectId, userId);
  }

  isCollaborator(projectId, userId) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return false;
    }
    const ownerStmt = this.db.prepare('SELECT 1 FROM projects WHERE id = ? AND user_id = ?');
    if (ownerStmt.get(projectId, userId)) {
      return true;
    }
    
    const collabStmt = this.db.prepare('SELECT 1 FROM project_collaborators WHERE project_id = ? AND user_id = ?');
    return !!collabStmt.get(projectId, userId);
  }

  getSharedProjects(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT p.*, u.username as owner_username
      FROM projects p
      JOIN project_collaborators pc ON p.id = pc.project_id
      JOIN users u ON p.user_id = u.id
      WHERE pc.user_id = ?
      ORDER BY p.updated_at DESC
    `);
    return stmt.all(userId);
  }

  hasProjectAccess(projectId, userId) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return false;
    }
    const stmt = this.db.prepare(`
      SELECT 1 FROM projects WHERE id = ? AND user_id = ?
      UNION
      SELECT 1 FROM project_collaborators WHERE project_id = ? AND user_id = ?
    `);
    return !!stmt.get(projectId, userId, projectId, userId);
  }

  getUserByUsernameForInvite(username) {
    if (!username || typeof username !== 'string' || username.length > 100) {
      return null;
    }
    const stmt = this.db.prepare('SELECT id, username FROM users WHERE username = ?');
    return stmt.get(username);
  }

  getUserById(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  }

  getEditorSettings(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }
    const stmt = this.db.prepare('SELECT settings FROM editor_settings WHERE user_id = ?');
    const result = stmt.get(userId);
    if (!result) return null;
    try {
      return JSON.parse(result.settings);
    } catch (err) {
      return null;
    }
  }

  saveEditorSettings(userId, settings) {
    if (!Number.isInteger(userId) || userId <= 0 || !settings || typeof settings !== 'object') {
      return;
    }
    const settingsJson = JSON.stringify(settings);
    if (settingsJson.length > 1048576) {
      throw new Error('Settings too large');
    }
    const stmt = this.db.prepare(`
      INSERT INTO editor_settings (user_id, settings) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET settings = ?, updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(userId, settingsJson, settingsJson);
  }

  getUserRole(projectId, userId) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return null;
    }
    const project = this.db.prepare('SELECT user_id FROM projects WHERE id = ?').get(projectId);
    if (project && project.user_id === userId) {
      return 'owner';
    }
    
    const collab = this.db.prepare('SELECT role FROM project_collaborators WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    return collab ? collab.role : null;
  }

  updateCollaboratorRole(projectId, userId, role) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return;
    }
    if (!['viewer', 'editor'].includes(role)) {
      return;
    }
    const stmt = this.db.prepare('UPDATE project_collaborators SET role = ? WHERE project_id = ? AND user_id = ?');
    return stmt.run(role, projectId, userId);
  }

  searchFiles(projectId, query) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return [];
    }
    if (typeof query !== 'string' || query.length > 200) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT * FROM files 
      WHERE project_id = ? AND (name LIKE ? OR path LIKE ?)
      ORDER BY name
    `);
    return stmt.all(projectId, `%${query}%`, `%${query}%`);
  }

  searchFilesByContent(projectId, query) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return [];
    }
    if (typeof query !== 'string' || query.length > 200) {
      return [];
    }
    const stmt = this.db.prepare(`
      SELECT * FROM files 
      WHERE project_id = ? AND content LIKE ?
      ORDER BY name
    `);
    return stmt.all(projectId, `%${query}%`);
  }

  createChatMessage(projectId, userId, message) {
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(userId) || userId <= 0 || !message || typeof message !== 'string') {
      throw new Error('Invalid chat message data');
    }
    if (message.length > 2000) {
      throw new Error('Message too long');
    }
    const stmt = this.db.prepare(
      'INSERT INTO chat_messages (project_id, user_id, message) VALUES (?, ?, ?)'
    );
    return stmt.run(projectId, userId, message);
  }

  getChatMessages(projectId, limit = 100) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return [];
    }
    if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
      limit = 100;
    }
    const stmt = this.db.prepare(`
      SELECT cm.*, u.username, u.avatar
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.project_id = ?
      ORDER BY cm.created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit).reverse();
  }

  getLastChatMessage(projectId) {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return null;
    }
    const stmt = this.db.prepare(`
      SELECT cm.*, u.username
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.project_id = ?
      ORDER BY cm.created_at DESC
      LIMIT 1
    `);
    return stmt.get(projectId);
  }

  deleteOldChatMessages() {
    const stmt = this.db.prepare(`
      DELETE FROM chat_messages
      WHERE project_id IN (
        SELECT DISTINCT project_id
        FROM chat_messages
        WHERE datetime(created_at) < datetime('now', '-24 hours')
        AND project_id NOT IN (
          SELECT DISTINCT project_id
          FROM chat_messages
          WHERE datetime(created_at) >= datetime('now', '-24 hours')
        )
      )
    `);
    return stmt.run();
  }
}
