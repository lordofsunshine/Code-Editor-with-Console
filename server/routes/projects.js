import config from '../config.js';
import { generateProjectKey } from '../utils/encryption.js';
import { createProjectStorage, deleteProject as deleteProjectFiles } from '../utils/fileManager.js';

export async function projectRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.get('/', async (request, reply) => {
    try {
      fastify.db.updateUserLastAccess(request.session.userId);
      const ownProjects = fastify.db.getProjects(request.session.userId);
      const sharedProjects = fastify.db.getSharedProjects(request.session.userId);
      const currentUser = fastify.db.getUserById(request.session.userId);
      
      const projects = [
        ...ownProjects.map(p => ({ ...p, isOwner: true, isShared: false, owner_username: currentUser?.username || null })),
        ...sharedProjects.map(p => ({ ...p, isOwner: false, isShared: true }))
      ];
      
      return projects;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const { name } = request.body;
      
      if (!name || typeof name !== 'string') {
        return reply.code(400).send({ error: 'Invalid project name' });
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 1 || trimmedName.length > 100) {
        return reply.code(400).send({ error: 'Project name must be 1-100 characters' });
      }

      const existingProjects = fastify.db.getProjects(request.session.userId);
      if (existingProjects.length >= config.limits.maxProjects) {
        return reply.code(400).send({ error: `Maximum ${config.limits.maxProjects} projects allowed` });
      }

      const encryptionKey = generateProjectKey();
      const result = fastify.db.createProject(request.session.userId, trimmedName, encryptionKey);
      const projectId = result.lastInsertRowid;
      
      await createProjectStorage(projectId);
      
      return { id: projectId, name: trimmedName };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const projectId = parseInt(request.params.id, 10);
      
      if (isNaN(projectId) || projectId <= 0) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }
      
      const project = fastify.db.getProject(projectId, request.session.userId);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      try {
        await deleteProjectFiles(projectId);
      } catch (err) {
        fastify.log.error('Error deleting project files:', err);
      }

      const result = fastify.db.deleteProject(projectId, request.session.userId);
      if (!result || result.changes === 0) {
        return reply.code(500).send({ error: 'Failed to delete project' });
      }

      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.get('/:projectId/role/:userId', async (request, reply) => {
    try {
      const projectId = parseInt(request.params.projectId, 10);
      const userId = parseInt(request.params.userId, 10);
      
      if (isNaN(projectId) || projectId <= 0 || isNaN(userId) || userId <= 0) {
        return reply.code(400).send({ error: 'Invalid IDs' });
      }
      
      if (request.session.userId !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      if (!fastify.db.hasProjectAccess(projectId, userId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      const role = fastify.db.getUserRole(projectId, userId);
      if (!role) {
        return reply.code(404).send({ error: 'Role not found' });
      }
      
      return { role };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });
}

