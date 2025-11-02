export async function settingsRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.get('/', async (request, reply) => {
    const userId = request.session.userId;
    const settings = fastify.db.getEditorSettings(userId);
    return settings || {};
  });

  fastify.post('/', async (request, reply) => {
    const userId = request.session.userId;
    const { settings } = request.body;

    if (!settings || typeof settings !== 'object') {
      return reply.code(400).send({ error: 'Invalid settings data' });
    }

    try {
      fastify.db.saveEditorSettings(userId, settings);
      return { success: true };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to save settings' });
    }
  });
}

