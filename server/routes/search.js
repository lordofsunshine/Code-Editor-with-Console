export async function searchRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.post('/files', async (request, reply) => {
    const { projectId, query, searchIn = 'names' } = request.body;
    const userId = request.session.userId;

    if (!projectId || !query) {
      return reply.code(400).send({ error: 'Invalid request' });
    }

    if (query.length > 200) {
      return reply.code(400).send({ error: 'Query too long' });
    }

    if (!fastify.db.hasProjectAccess(projectId, userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    try {
      let results;
      if (searchIn === 'content') {
        results = fastify.db.searchFilesByContent(projectId, query);
      } else {
        results = fastify.db.searchFiles(projectId, query);
      }
      return { results };
    } catch (err) {
      return reply.code(500).send({ error: 'Search failed' });
    }
  });
}

