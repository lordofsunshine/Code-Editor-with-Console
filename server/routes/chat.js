const userMessageTimestamps = new Map();
const MESSAGE_RATE_LIMIT = 500;

export async function chatRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  const verifyProjectAccess = (projectId, userId) => {
    return fastify.db.hasProjectAccess(projectId, userId);
  };

  const checkRateLimit = (userId) => {
    const now = Date.now();
    const lastMessageTime = userMessageTimestamps.get(userId) || 0;
    
    if (now - lastMessageTime < MESSAGE_RATE_LIMIT) {
      return false;
    }
    
    userMessageTimestamps.set(userId, now);
    return true;
  };

  fastify.get('/:projectId', async (request, reply) => {
    try {
      const projectId = parseInt(request.params.projectId, 10);
      
      if (isNaN(projectId) || projectId <= 0) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }
      
      if (!verifyProjectAccess(projectId, request.session.userId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const messages = fastify.db.getChatMessages(projectId);
      return { messages };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/:projectId', async (request, reply) => {
    try {
      const projectId = parseInt(request.params.projectId, 10);
      const { message } = request.body;
      const userId = request.session.userId;
      
      if (isNaN(projectId) || projectId <= 0) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }
      
      if (!verifyProjectAccess(projectId, userId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      if (!message || typeof message !== 'string') {
        return reply.code(400).send({ error: 'Message is required' });
      }

      const trimmedMessage = message.trim();
      
      if (trimmedMessage.length === 0) {
        return reply.code(400).send({ error: 'Message cannot be empty' });
      }

      if (trimmedMessage.length > 2000) {
        return reply.code(400).send({ error: 'Message too long. Maximum 2000 characters' });
      }

      if (!checkRateLimit(userId)) {
        return reply.code(429).send({ error: 'Too many messages. Please wait a moment.' });
      }

      const sanitizedMessage = trimmedMessage
        .replace(/[<>]/g, '')
        .substring(0, 2000);

      const startTime = Date.now();
      const result = fastify.db.createChatMessage(projectId, userId, sanitizedMessage);
      const responseTime = Date.now() - startTime;

      const user = fastify.db.getUserById(userId);
      if (!user) {
        return reply.code(500).send({ error: 'User not found' });
      }

      const newMessage = {
        id: result.lastInsertRowid,
        project_id: projectId,
        user_id: userId,
        username: user.username,
        avatar: user.avatar,
        message: sanitizedMessage,
        created_at: new Date().toISOString()
      };

      if (fastify.io) {
        fastify.io.to(`project:${projectId}`).emit('chat-message', {
          message: newMessage,
          responseTime
        });
      }

      return { 
        id: newMessage.id,
        message: newMessage,
        responseTime
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to send message' });
    }
  });
}

