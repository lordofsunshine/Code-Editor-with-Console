import config from '../config.js';
import { normalizeProjectPath, extractFileNameFromPath } from '../utils/path.js';
import { saveFile, readFile, deleteFile } from '../utils/fileManager.js';
import { isMediaFile } from '../utils/compression.js';

export async function fileRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  const verifyProjectAccess = (projectId, userId) => {
    return fastify.db.hasProjectAccess(projectId, userId);
  };

  fastify.get('/:projectId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    
    if (isNaN(projectId)) {
      return reply.code(400).send({ error: 'Invalid project ID' });
    }
    
    if (!verifyProjectAccess(projectId, request.session.userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    fastify.db.updateProjectLastAccess(projectId);
    fastify.db.updateUserLastAccess(request.session.userId);
    
    const files = fastify.db.getFiles(projectId);
    return files.map(f => ({
      id: f.id,
      name: f.name,
      path: f.path,
      language: f.language,
      size: f.size,
      is_media: f.is_media,
      created_at: f.created_at,
      updated_at: f.updated_at
    }));
  });

  fastify.get('/:projectId/:fileId/content', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const fileId = parseInt(request.params.fileId);
    
    if (isNaN(projectId) || isNaN(fileId)) {
      return reply.code(400).send({ error: 'Invalid IDs' });
    }
    
    if (!verifyProjectAccess(projectId, request.session.userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const file = fastify.db.getFile(fileId, projectId);
    if (!file) {
      return reply.code(404).send({ error: 'File not found' });
    }

    try {
      const encryptionKey = fastify.db.getProjectEncryptionKey(projectId);
      if (!encryptionKey) {
        return reply.code(500).send({ error: 'Project encryption key not found' });
      }

      let content;
      const fileWithContent = fastify.db.getFileWithContent(fileId, projectId);
      
      if (fileWithContent && fileWithContent.content) {
        content = fileWithContent.content;
        
        try {
          await saveFile(projectId, fileId, file.name, fileWithContent.content, encryptionKey);
        } catch (migrateErr) {
          fastify.log.warn(`Error migrating file ${fileId} to storage:`, migrateErr);
        }
      } else {
        try {
          content = await readFile(projectId, fileId, file.name, encryptionKey, file.is_media === 1);
        } catch (fileErr) {
          if (fileErr.message === 'File not found') {
            content = '';
          } else {
            throw fileErr;
          }
        }
      }
      
      return { content };
    } catch (err) {
      fastify.log.error('Error reading file:', err);
      return reply.code(500).send({ error: 'Failed to read file' });
    }
  });

  fastify.post('/:projectId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const { name, path, content = '', language = 'plaintext' } = request.body;
    const userId = request.session.userId;
    
    if (isNaN(projectId)) {
      return reply.code(400).send({ error: 'Invalid project ID' });
    }
    
    if (!verifyProjectAccess(projectId, userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const userRole = fastify.db.getUserRole(projectId, userId);
    if (userRole === 'viewer') {
      return reply.code(403).send({ error: 'Viewers cannot create files' });
    }

    const normalizedPath = normalizeProjectPath(path || name);
    if (!normalizedPath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const fileName = extractFileNameFromPath(normalizedPath);
    if (!fileName) {
      return reply.code(400).send({ error: 'Invalid file name' });
    }

    const existingFiles = fastify.db.getFiles(projectId);
    if (existingFiles.length >= config.limits.maxFilesPerProject) {
      return reply.code(400).send({ error: `Maximum ${config.limits.maxFilesPerProject} files allowed per project` });
    }

    const contentSize = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length;
    if (contentSize > config.limits.maxFileSize) {
      return reply.code(413).send({ error: `File content too large. Maximum ${Math.floor(config.limits.maxFileSize / 1024 / 1024)}MB allowed` });
    }

    try {
      const encryptionKey = fastify.db.getProjectEncryptionKey(projectId);
      if (!encryptionKey) {
        return reply.code(500).send({ error: 'Project encryption key not found' });
      }

      const media = isMediaFile(fileName);
      const result = fastify.db.createFile(projectId, fileName, normalizedPath, language, contentSize, media);
      const fileId = result.lastInsertRowid;

      await saveFile(projectId, fileId, fileName, content, encryptionKey);
      
      fastify.db.updateProjectTimestamp(projectId);
      
      return { 
        id: fileId, 
        name: fileName, 
        path: normalizedPath, 
        language,
        size: contentSize,
        is_media: media ? 1 : 0
      };
    } catch (err) {
      console.error('Error creating file:', err);
      if (err.message.includes('UNIQUE constraint')) {
        return reply.code(409).send({ error: 'File already exists' });
      }
      return reply.code(500).send({ error: 'Failed to create file' });
    }
  });

  fastify.put('/:projectId/:fileId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const fileId = parseInt(request.params.fileId);
    const { content } = request.body;
    const userId = request.session.userId;
    
    if (isNaN(projectId) || isNaN(fileId)) {
      return reply.code(400).send({ error: 'Invalid IDs' });
    }
    
    if (!verifyProjectAccess(projectId, userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const userRole = fastify.db.getUserRole(projectId, userId);
    if (userRole === 'viewer') {
      return reply.code(403).send({ error: 'Viewers cannot edit files' });
    }

    const file = fastify.db.getFile(fileId, projectId);
    if (!file) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const contentSize = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length;
    if (contentSize > config.limits.maxFileSize) {
      return reply.code(413).send({ error: `File content too large. Maximum ${Math.floor(config.limits.maxFileSize / 1024 / 1024)}MB allowed` });
    }

    try {
      const encryptionKey = fastify.db.getProjectEncryptionKey(projectId);
      if (!encryptionKey) {
        return reply.code(500).send({ error: 'Project encryption key not found' });
      }

      await saveFile(projectId, fileId, file.name, content, encryptionKey);
      
      fastify.db.updateFile(fileId, contentSize);
      fastify.db.updateProjectTimestamp(projectId);
      
      return { success: true };
    } catch (err) {
      console.error('Error updating file:', err);
      return reply.code(500).send({ error: 'Failed to update file' });
    }
  });

  fastify.delete('/:projectId/:fileId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const fileId = parseInt(request.params.fileId);
    const userId = request.session.userId;
    
    if (isNaN(projectId) || isNaN(fileId)) {
      return reply.code(400).send({ error: 'Invalid IDs' });
    }
    
    if (!verifyProjectAccess(projectId, userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const userRole = fastify.db.getUserRole(projectId, userId);
    if (userRole === 'viewer') {
      return reply.code(403).send({ error: 'Viewers cannot delete files' });
    }

    const file = fastify.db.getFile(fileId, projectId);
    if (!file) {
      return reply.code(404).send({ error: 'File not found' });
    }

    try {
      const encryptionKey = fastify.db.getProjectEncryptionKey(projectId);
      if (encryptionKey) {
        await deleteFile(projectId, fileId, encryptionKey);
      }
    } catch (err) {
      console.error('Error deleting file from storage:', err);
    }

    fastify.db.deleteFile(fileId, projectId);
    fastify.db.updateProjectTimestamp(projectId);
    
    return { success: true };
  });
}
