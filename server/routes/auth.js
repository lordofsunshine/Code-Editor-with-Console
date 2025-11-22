import bcrypt from 'bcrypt';
import rateLimit from '@fastify/rate-limit';
import config from '../config.js';

export async function authRoutes(fastify, options) {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1'],
    skipOnError: false
  });
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return reply.code(400).send({ error: 'Invalid credentials' });
      }

      if (username.length < 3 || username.length > 20) {
        return reply.code(400).send({ error: 'Username must be 3-20 characters' });
      }

      if (password.length < 6 || password.length > 128) {
        return reply.code(400).send({ error: 'Password must be 6-128 characters' });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return reply.code(400).send({ error: 'Username can only contain letters, numbers, and underscores' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      
      try {
        fastify.db.createUser(username, hashedPassword);
        return { success: true };
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return reply.code(409).send({ error: 'Username already exists' });
        }
        throw err;
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return reply.code(400).send({ error: 'Invalid credentials' });
      }

      if (username.length > 100 || password.length > 200) {
        return reply.code(400).send({ error: 'Invalid credentials' });
      }

      const user = fastify.db.getUserByUsername(username);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      request.session.userId = user.id;
      request.session.username = user.username;
      
      fastify.db.updateUserLastAccess(user.id);
      
      return { success: true, username: user.username };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/logout', async (request, reply) => {
    try {
      await new Promise((resolve, reject) => {
        request.session.destroy((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Logout failed' });
    }
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
      
      if (!avatar || typeof avatar !== 'string') {
        return reply.code(400).send({ error: 'Invalid avatar data' });
      }

      if (!avatar.startsWith('data:image/')) {
        return reply.code(400).send({ error: 'Invalid image format' });
      }

      const allowedTypes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];
      const isValidType = allowedTypes.some(type => avatar.startsWith(type));
      
      if (!isValidType) {
        return reply.code(400).send({ error: 'Only JPG, PNG, and WebP images are allowed' });
      }

      const maxAvatarSize = config.limits.maxAvatarSize || 5242880;
      if (avatar.length > maxAvatarSize) {
        return reply.code(413).send({ error: `Avatar too large. Maximum ${Math.floor(maxAvatarSize / 1024 / 1024)}MB` });
      }

      fastify.db.updateUserAvatar(request.session.userId, avatar);
      
      return { success: true, avatar };
    } catch (err) {
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.put('/username', async (request, reply) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    try {
      const { username } = request.body;
      
      if (!username || typeof username !== 'string') {
        return reply.code(400).send({ error: 'Invalid username' });
      }

      if (username.length < 3 || username.length > 20) {
        return reply.code(400).send({ error: 'Username must be 3-20 characters' });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return reply.code(400).send({ error: 'Username can only contain letters, numbers, and underscores' });
      }

      const existingUser = fastify.db.getUserByUsername(username);
      if (existingUser && existingUser.id !== request.session.userId) {
        return reply.code(409).send({ error: 'Username already taken' });
      }

      fastify.db.updateUsername(request.session.userId, username);
      request.session.username = username;
      
      return { success: true, username };
    } catch (err) {
      return reply.code(500).send({ error: 'Server error' });
    }
  });
}

