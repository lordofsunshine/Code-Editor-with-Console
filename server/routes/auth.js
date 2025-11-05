import bcrypt from 'bcrypt';
import rateLimit from '@fastify/rate-limit';
import config from '../config.js';

export async function authRoutes(fastify, options) {
  await fastify.register(rateLimit, {
    max: 5,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1'],
    skipOnError: false
  });
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      if (!username || !password || username.length < 3 || username.length > 20 || password.length < 6 || password.length > 128) {
        return reply.code(400).send({ error: 'Invalid credentials' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      try {
        fastify.db.createUser(username, hashedPassword);
        return { success: true };
      } catch (err) {
        return reply.code(409).send({ error: 'Username already exists' });
      }
    } catch (err) {
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      const user = fastify.db.getUserByUsername(username);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      request.session.userId = user.id;
      request.session.username = user.username;
      
      fastify.db.updateUserLastAccess(user.id);
      
      return { success: true, username: user.username };
    } catch (err) {
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/logout', async (request, reply) => {
    request.session.destroy();
    return { success: true };
  });

  fastify.get('/me', async (request, reply) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    
    fastify.db.updateUserLastAccess(request.session.userId);
    
    const avatarData = fastify.db.getUserAvatar(request.session.userId);
    
    return { 
      userId: request.session.userId,
      username: request.session.username,
      avatar: avatarData?.avatar || null,
      csrfToken: request.session.csrfToken
    };
  });

  fastify.post('/avatar', async (request, reply) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    try {
      const { avatar } = request.body;
      
      if (!avatar || !avatar.startsWith('data:image/')) {
        return reply.code(400).send({ error: 'Invalid avatar data' });
      }

      const maxAvatarSize = config.limits.maxAvatarSize || 2097152;
      if (avatar.length > maxAvatarSize) {
        return reply.code(413).send({ error: 'Avatar too large. Maximum size is 2MB' });
      }

      fastify.db.updateUserAvatar(request.session.userId, avatar);
      
      return { success: true, avatar };
    } catch (err) {
      return reply.code(500).send({ error: 'Server error' });
    }
  });
}

