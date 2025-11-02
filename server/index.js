import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Database } from './database.js';
import { authRoutes } from './routes/auth.js';
import { fileRoutes } from './routes/files.js';
import { projectRoutes } from './routes/projects.js';
import { warningRoutes } from './routes/warnings.js';
import { invitationRoutes } from './routes/invitations.js';
import { settingsRoutes } from './routes/settings.js';
import { searchRoutes } from './routes/search.js';
import { initCleanupTasks } from './cleanup.js';
import { initSocket } from './socket.js';
import chalk from 'chalk';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'production',
  trustProxy: true,
  bodyLimit: 50 * 1024 * 1024,
  requestIdLogLabel: 'reqId',
  disableRequestLogging: true
});

console.log(chalk.cyan('⚡ Initializing Code Editor...'));

const db = new Database();

console.log(chalk.green('✓ Database initialized'));

initCleanupTasks(db);

console.log(chalk.green('✓ Cleanup tasks registered'));

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

await fastify.register(fastifyHelmet, {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  hsts: false
});

await fastify.register(fastifyCors, {
  origin: true,
  credentials: true
});

await fastify.register(fastifyCookie);

await fastify.register(fastifySession, {
  secret: sessionSecret,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  saveUninitialized: false,
  rolling: true
});

fastify.addHook('onRequest', (request, reply, done) => {
  if (request.session && !request.session.csrfToken) {
    request.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  done();
});

fastify.addHook('preHandler', (request, reply, done) => {
  const exemptRoutes = ['/api/auth/me', '/api/auth/logout', '/api/settings/'];
  const exemptMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  if (exemptMethods.includes(request.method) || exemptRoutes.includes(request.url)) {
    return done();
  }
  
  if (request.url.startsWith('/api/') && request.session?.userId) {
    const clientToken = request.headers['x-csrf-token'];
    const sessionToken = request.session.csrfToken;
    
    if (!clientToken || clientToken !== sessionToken) {
      return reply.code(403).send({ error: 'Invalid CSRF token' });
    }
  }
  
  done();
});

await fastify.register(fastifyStatic, {
  root: join(__dirname, '..', 'public'),
  prefix: '/'
});

fastify.decorate('db', db);
fastify.decorate('io', null);

fastify.addHook('preHandler', (request, reply, done) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'no-referrer-when-downgrade');
  done();
});

await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(fileRoutes, { prefix: '/api/files' });
await fastify.register(projectRoutes, { prefix: '/api/projects' });
await fastify.register(warningRoutes, { prefix: '/api/warnings' });
await fastify.register(invitationRoutes, { prefix: '/api/invitations' });
await fastify.register(settingsRoutes, { prefix: '/api/settings' });
await fastify.register(searchRoutes, { prefix: '/api/search' });

fastify.get('/editor', (request, reply) => {
  if (!request.session.userId) {
    return reply.redirect('/auth');
  }
  reply.sendFile('editor.html');
});

fastify.get('/auth', (request, reply) => {
  if (request.session.userId) {
    return reply.redirect('/editor');
  }
  reply.sendFile('auth.html');
});

fastify.get('/', (request, reply) => {
  reply.sendFile('index.html');
});

fastify.get('/error', (request, reply) => {
  reply.sendFile('error.html');
});

fastify.setNotFoundHandler((request, reply) => {
  if (request.headers.accept && request.headers.accept.includes('text/html')) {
    reply.redirect('/error?code=404');
  } else {
    reply.status(404).send({ error: 'Not found' });
  }
});

fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    reply.status(400).send({ error: 'Validation error' });
  } else if (error.statusCode === 429) {
    reply.status(429).send({ error: 'Too many requests' });
  } else if (error.statusCode === 403) {
    if (request.headers.accept && request.headers.accept.includes('text/html')) {
      reply.redirect('/error?code=403');
    } else {
      reply.status(403).send({ error: 'Forbidden' });
    }
  } else if (error.statusCode === 401) {
    if (request.headers.accept && request.headers.accept.includes('text/html')) {
      reply.redirect('/error?code=401');
    } else {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  } else {
    fastify.log.error(error);
    if (request.headers.accept && request.headers.accept.includes('text/html')) {
      reply.redirect('/error?code=500');
    } else {
      reply.status(500).send({ error: 'Internal server error' });
    }
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    
    const io = initSocket(fastify.server, db);
    fastify.io = io;
    
    console.log('\n' + chalk.cyan.bold('═'.repeat(50)));
    console.log(chalk.green.bold('  ✓ code-editor Started Successfully'));
    console.log(chalk.cyan.bold('═'.repeat(50)));
    console.log(chalk.white('  🌐 Server:     ') + chalk.yellow.bold('http://localhost:3000'));
    console.log(chalk.white('  🔌 WebSocket:  ') + chalk.green('Initialized'));
    console.log(chalk.white('  🧹 Cleanup:    ') + chalk.blue('Scheduled'));
    console.log(chalk.white('  📊 Database:   ') + chalk.magenta('Connected'));
    console.log(chalk.cyan.bold('═'.repeat(50)) + '\n');
  } catch (err) {
    console.log('\n' + chalk.red.bold('═'.repeat(50)));
    console.log(chalk.red.bold('  ✗ Server Failed to Start'));
    console.log(chalk.red.bold('═'.repeat(50)));
    console.error(chalk.red(err));
    console.log(chalk.red.bold('═'.repeat(50)) + '\n');
    process.exit(1);
  }
};

start();
