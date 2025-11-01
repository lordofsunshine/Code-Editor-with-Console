import config from '../config.js';

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
    
    if (!verifyProjectAccess(projectId, request.session.userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    fastify.db.updateProjectLastAccess(projectId);
    fastify.db.updateUserLastAccess(request.session.userId);
    
    const files = fastify.db.getFiles(projectId);
    return files;
  });

  fastify.post('/:projectId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const { name, path, content = '', language = 'plaintext', isMedia = false } = request.body;
    
    if (!verifyProjectAccess(projectId, request.session.userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    if (!name || !path) {
      return reply.code(400).send({ error: 'Invalid file data' });
    }

    const existingFiles = fastify.db.getFiles(projectId);
    if (existingFiles.length >= config.limits.maxFilesPerProject) {
      return reply.code(400).send({ error: `Maximum ${config.limits.maxFilesPerProject} files allowed per project` });
    }

    const maxContentSize = config.limits.maxFileSize || 10485760;
    if (content.length > maxContentSize) {
      return reply.code(413).send({ error: 'File content too large. Maximum 10MB allowed' });
    }

    try {
      const result = fastify.db.createFile(projectId, name, path, content, language, isMedia);
      fastify.db.updateProjectTimestamp(projectId);
      
      return { id: result.lastInsertRowid, name, path, content, language };
    } catch (err) {
      return reply.code(409).send({ error: 'File already exists' });
    }
  });

  fastify.put('/:projectId/:fileId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const fileId = parseInt(request.params.fileId);
    const { content } = request.body;
    
    if (!verifyProjectAccess(projectId, request.session.userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const file = fastify.db.getFile(fileId, projectId);
    if (!file) {
      return reply.code(404).send({ error: 'File not found' });
    }

    fastify.db.updateFile(fileId, content);
    fastify.db.updateProjectTimestamp(projectId);
    
    return { success: true };
  });

  fastify.delete('/:projectId/:fileId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const fileId = parseInt(request.params.fileId);
    
    if (!verifyProjectAccess(projectId, request.session.userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    fastify.db.deleteFile(fileId, projectId);
    fastify.db.updateProjectTimestamp(projectId);
    
    return { success: true };
  });
}

