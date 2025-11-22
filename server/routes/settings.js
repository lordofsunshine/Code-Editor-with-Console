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
    try {
      const userId = request.session.userId;
      const { settings } = request.body;

      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        return reply.code(400).send({ error: 'Invalid settings data' });
      }

      const settingsString = JSON.stringify(settings);
      if (settingsString.length > 1048576) {
        return reply.code(400).send({ error: 'Settings too large' });
      }

      fastify.db.saveEditorSettings(userId, settings);
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to save settings' });
    }
  });
}

