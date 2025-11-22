export async function searchRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.post('/files', async (request, reply) => {
    try {
      const { projectId, query, searchIn = 'names' } = request.body;
      const userId = request.session.userId;

      if (!projectId || typeof projectId !== 'number' || !query || typeof query !== 'string') {
        return reply.code(400).send({ error: 'Invalid request' });
      }

      if (!Number.isInteger(projectId) || projectId <= 0) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      if (query.length === 0 || query.length > 200) {
        return reply.code(400).send({ error: 'Query must be 1-200 characters' });
      }

      if (!['names', 'content'].includes(searchIn)) {
        return reply.code(400).send({ error: 'Invalid search type' });
      }

      if (!fastify.db.hasProjectAccess(projectId, userId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      let results;
      if (searchIn === 'content') {
        results = fastify.db.searchFilesByContent(projectId, query);
      } else {
        results = fastify.db.searchFiles(projectId, query);
      }
      return { results };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Search failed' });
    }
  });
}

