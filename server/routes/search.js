import config from '../config.js';
import { readFile } from '../utils/fileManager.js';

const MAX_CONTENT_SEARCH_SIZE = config.limits?.maxFileSize || 52428800;

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

      const searchStorage = async () => {
        const files = fastify.db.getFiles(projectId);
        const encryptionKey = fastify.db.getProjectEncryptionKey(projectId);
        if (!encryptionKey) {
          return { error: 'Project encryption key not found' };
        }
        const queryLower = query.toLowerCase();
        const results = [];
        for (const file of files) {
          if (file.is_media === 1) {
            continue;
          }
          if (Number.isInteger(file.size) && file.size > MAX_CONTENT_SEARCH_SIZE) {
            continue;
          }
          let content;
          try {
            content = await readFile(projectId, file.id, file.name, encryptionKey);
          } catch (err) {
            continue;
          }
          if (typeof content !== 'string') {
            continue;
          }
          if (content.toLowerCase().includes(queryLower)) {
            results.push({ ...file, content });
          }
        }
        return { results };
      };

      let results;
      if (searchIn === 'content') {
        if (fastify.db.hasFileContentColumn()) {
          results = fastify.db.searchFilesByContent(projectId, query);
          if (!results.length) {
            const storageResults = await searchStorage();
            if (storageResults.error) {
              return reply.code(500).send({ error: storageResults.error });
            }
            results = storageResults.results;
          }
        } else {
          const storageResults = await searchStorage();
          if (storageResults.error) {
            return reply.code(500).send({ error: storageResults.error });
          }
          results = storageResults.results;
        }
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

