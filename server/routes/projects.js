import config from '../config.js';

export async function projectRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.get('/', async (request, reply) => {
    fastify.db.updateUserLastAccess(request.session.userId);
    const ownProjects = fastify.db.getProjects(request.session.userId);
    const sharedProjects = fastify.db.getSharedProjects(request.session.userId);
    
    const projects = [
      ...ownProjects.map(p => ({ ...p, isOwner: true, isShared: false })),
      ...sharedProjects.map(p => ({ ...p, isOwner: false, isShared: true }))
    ];
    
    return projects;
  });

  fastify.post('/', async (request, reply) => {
    try {
      const { name } = request.body;
      
      if (!name || name.length < 1) {
        return reply.code(400).send({ error: 'Invalid project name' });
      }

      const existingProjects = fastify.db.getProjects(request.session.userId);
      if (existingProjects.length >= config.limits.maxProjects) {
        return reply.code(400).send({ error: `Maximum ${config.limits.maxProjects} projects allowed` });
      }

      const result = fastify.db.createProject(request.session.userId, name);
      
      return { id: result.lastInsertRowid, name };
    } catch (err) {
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    const projectId = parseInt(request.params.id);
    
    if (isNaN(projectId)) {
      return reply.code(400).send({ error: 'Invalid project ID' });
    }
    
    const project = fastify.db.getProject(projectId, request.session.userId);
    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    fastify.db.deleteProject(projectId, request.session.userId);
    return { success: true };
  });

  fastify.get('/:projectId/role/:userId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const userId = parseInt(request.params.userId);
    
    if (isNaN(projectId) || isNaN(userId)) {
      return reply.code(400).send({ error: 'Invalid IDs' });
    }
    
    if (request.session.userId !== userId) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    if (!fastify.db.hasProjectAccess(projectId, userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    const role = fastify.db.getUserRole(projectId, userId);
    return { role };
  });
}

