import config from '../config.js';

export async function warningRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.get('/expiring-projects', async (request, reply) => {
    try {
      const warningDays = config.cleanup.warningDays || 60;
      const expiringProjects = fastify.db.getExpiringProjects(request.session.userId, warningDays);
      return { projects: expiringProjects };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.get('/account-status', async (request, reply) => {
    try {
      const warningDays = config.cleanup.warningDays || 60;
      const inactiveDays = config.cleanup.inactiveDays || 90;
      const accountInfo = fastify.db.getAccountExpirationInfo(request.session.userId, warningDays);
      
      if (accountInfo) {
        const daysUntilDeletion = Math.max(0, inactiveDays - Math.floor(accountInfo.days_inactive));
        return {
          warning: true,
          daysUntilDeletion,
          lastAccessed: accountInfo.last_accessed_at
        };
      }
      
      return { warning: false };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });
}

