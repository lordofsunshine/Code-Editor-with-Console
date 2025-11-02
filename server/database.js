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
        content TEXT DEFAULT '',
        language TEXT DEFAULT 'plaintext',
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
  }

  createUser(username, password) {
    const stmt = this.db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    return stmt.run(username, password);
  }

  getUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  updateUserLastAccess(userId) {
    const stmt = this.db.prepare('UPDATE users SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(userId);
  }

  createProject(userId, name) {
    const stmt = this.db.prepare('INSERT INTO projects (user_id, name) VALUES (?, ?)');
    return stmt.run(userId, name);
  }

  getProjects(userId) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId);
  }

  getProject(projectId, userId) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?');
    return stmt.get(projectId, userId);
  }

  updateProjectLastAccess(projectId) {
    const stmt = this.db.prepare('UPDATE projects SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(projectId);
  }

  deleteProject(projectId, userId) {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
    return stmt.run(projectId, userId);
  }

  createFile(projectId, name, path, content = '', language = 'plaintext', isMedia = false) {
    const stmt = this.db.prepare(
      'INSERT INTO files (project_id, name, path, content, language) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(projectId, name, path, content, language);
  }

  getFiles(projectId) {
    const stmt = this.db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY path');
    return stmt.all(projectId);
  }

  getFile(fileId, projectId) {
    const stmt = this.db.prepare('SELECT * FROM files WHERE id = ? AND project_id = ?');
    return stmt.get(fileId, projectId);
  }

  updateFile(fileId, content) {
    const stmt = this.db.prepare(
      'UPDATE files SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    return stmt.run(content, fileId);
  }

  deleteFile(fileId, projectId) {
    const stmt = this.db.prepare('DELETE FROM files WHERE id = ? AND project_id = ?');
    return stmt.run(fileId, projectId);
  }

  updateProjectTimestamp(projectId) {
    const stmt = this.db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(projectId);
  }

  updateUserAvatar(userId, avatar) {
    const stmt = this.db.prepare('UPDATE users SET avatar = ? WHERE id = ?');
    return stmt.run(avatar, userId);
  }

  getUserAvatar(userId) {
    const stmt = this.db.prepare('SELECT avatar FROM users WHERE id = ?');
    return stmt.get(userId);
  }

  getInactiveProjects(daysInactive) {
    const stmt = this.db.prepare(`
      SELECT p.*, u.username 
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE datetime(p.last_accessed_at) <= datetime('now', '-' || ? || ' days')
    `);
    return stmt.all(daysInactive);
  }

  getInactiveUsers(daysInactive) {
    const stmt = this.db.prepare(`
      SELECT id, username, last_accessed_at
      FROM users
      WHERE datetime(last_accessed_at) <= datetime('now', '-' || ? || ' days')
    `);
    return stmt.all(daysInactive);
  }

  deleteInactiveProjects(daysInactive) {
    const stmt = this.db.prepare(`
      DELETE FROM projects 
      WHERE datetime(last_accessed_at) <= datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(daysInactive);
  }

  deleteInactiveUsers(daysInactive) {
    const stmt = this.db.prepare(`
      DELETE FROM users 
      WHERE datetime(last_accessed_at) <= datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(daysInactive);
  }

  getExpiringProjects(userId, warningDays) {
    const stmt = this.db.prepare(`
      SELECT id, name, last_accessed_at,
             julianday('now') - julianday(last_accessed_at) as days_inactive
      FROM projects
      WHERE user_id = ?
      AND datetime(last_accessed_at) <= datetime('now', '-' || ? || ' days')
      ORDER BY last_accessed_at ASC
    `);
    return stmt.all(userId, warningDays);
  }

  getAccountExpirationInfo(userId, warningDays) {
    const stmt = this.db.prepare(`
      SELECT id, username, last_accessed_at,
             julianday('now') - julianday(last_accessed_at) as days_inactive
      FROM users
      WHERE id = ?
      AND datetime(last_accessed_at) <= datetime('now', '-' || ? || ' days')
    `);
    return stmt.get(userId, warningDays);
  }

  vacuum() {
    this.db.exec('VACUUM');
  }

  optimize() {
    this.db.exec('PRAGMA optimize');
    this.db.exec('PRAGMA incremental_vacuum(100)');
  }

  createInvitation(projectId, fromUserId, toUserId, role = 'editor') {
    const stmt = this.db.prepare('INSERT INTO invitations (project_id, from_user_id, to_user_id, role) VALUES (?, ?, ?, ?)');
    return stmt.run(projectId, fromUserId, toUserId, role);
  }

  getInvitation(invitationId) {
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
    const stmt = this.db.prepare('UPDATE invitations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(status, invitationId);
  }

  addCollaborator(projectId, userId, role = 'editor') {
    const stmt = this.db.prepare('INSERT INTO project_collaborators (project_id, user_id, role) VALUES (?, ?, ?)');
    return stmt.run(projectId, userId, role);
  }

  getCollaborators(projectId) {
    const stmt = this.db.prepare(`
      SELECT pc.*, u.username, u.avatar
      FROM project_collaborators pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.project_id = ?
    `);
    return stmt.all(projectId);
  }

  removeCollaborator(projectId, userId) {
    const stmt = this.db.prepare('DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?');
    return stmt.run(projectId, userId);
  }

  isCollaborator(projectId, userId) {
    const ownerStmt = this.db.prepare('SELECT 1 FROM projects WHERE id = ? AND user_id = ?');
    if (ownerStmt.get(projectId, userId)) {
      return true;
    }
    
    const collabStmt = this.db.prepare('SELECT 1 FROM project_collaborators WHERE project_id = ? AND user_id = ?');
    return !!collabStmt.get(projectId, userId);
  }

  getSharedProjects(userId) {
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
    const stmt = this.db.prepare(`
      SELECT 1 FROM projects WHERE id = ? AND user_id = ?
      UNION
      SELECT 1 FROM project_collaborators WHERE project_id = ? AND user_id = ?
    `);
    return !!stmt.get(projectId, userId, projectId, userId);
  }

  getUserByUsernameForInvite(username) {
    const stmt = this.db.prepare('SELECT id, username FROM users WHERE username = ?');
    return stmt.get(username);
  }

  getUserById(userId) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  }

  getUserIdFromSession(sessionId) {
    return null;
  }

  getEditorSettings(userId) {
    const stmt = this.db.prepare('SELECT settings FROM editor_settings WHERE user_id = ?');
    const result = stmt.get(userId);
    return result ? JSON.parse(result.settings) : null;
  }

  saveEditorSettings(userId, settings) {
    const settingsJson = JSON.stringify(settings);
    const stmt = this.db.prepare(`
      INSERT INTO editor_settings (user_id, settings) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET settings = ?, updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(userId, settingsJson, settingsJson);
  }

  getUserRole(projectId, userId) {
    const project = this.db.prepare('SELECT user_id FROM projects WHERE id = ?').get(projectId);
    if (project && project.user_id === userId) {
      return 'owner';
    }
    
    const collab = this.db.prepare('SELECT role FROM project_collaborators WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    return collab ? collab.role : null;
  }

  updateCollaboratorRole(projectId, userId, role) {
    const stmt = this.db.prepare('UPDATE project_collaborators SET role = ? WHERE project_id = ? AND user_id = ?');
    return stmt.run(role, projectId, userId);
  }

  searchFiles(projectId, query) {
    const stmt = this.db.prepare(`
      SELECT * FROM files 
      WHERE project_id = ? AND (name LIKE ? OR path LIKE ?)
      ORDER BY name
    `);
    return stmt.all(projectId, `%${query}%`, `%${query}%`);
  }

  searchFilesByContent(projectId, query) {
    const stmt = this.db.prepare(`
      SELECT * FROM files 
      WHERE project_id = ? AND content LIKE ?
      ORDER BY name
    `);
    return stmt.all(projectId, `%${query}%`);
  }
}
