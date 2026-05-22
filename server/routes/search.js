import config from '../config.js';
import { readFile } from '../utils/fileManager.js';
import { parsePositiveInteger, requireAuth } from '../utils/request.js';

const MAX_CONTENT_SEARCH_FILE_SIZE = Math.min(config.limits?.contentSearchMaxFileSize || 1048576, config.limits?.maxFileSize || 52428800);
const MAX_CONTENT_SEARCH_TOTAL_SIZE = Math.min(config.limits?.contentSearchMaxTotalSize || 2097152, config.limits?.maxFileSize || 52428800);
const MAX_CONTENT_SEARCH_FILES = Math.min(config.limits?.contentSearchMaxFiles || 20, config.limits?.maxFilesPerProject || 32);
const MAX_CONTENT_SEARCH_RESULTS = 50;
const CONTENT_PREVIEW_CONTEXT = 80;

function createContentPreview(content, query) {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  if (index === -1) {
    return '';
  }
  const start = Math.max(0, index - CONTENT_PREVIEW_CONTEXT);
  const end = Math.min(content.length, index + query.length + CONTENT_PREVIEW_CONTEXT);
  return content.substring(start, end);
}

export async function searchRoutes(fastify, options) {
  fastify.addHook('preHandler', requireAuth);

  fastify.post('/files', async (request, reply) => {
    try {
      const { projectId, query, searchIn = 'names' } = request.body;
      const userId = request.session.userId;

      if (!projectId || !query || typeof query !== 'string') {
        return reply.code(400).send({ error: 'Invalid request' });
      }

      const normalizedProjectId = parsePositiveInteger(projectId);
      if (!normalizedProjectId) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      if (query.length === 0 || query.length > 200) {
        return reply.code(400).send({ error: 'Query must be 1-200 characters' });
      }

      if (!['names', 'content'].includes(searchIn)) {
        return reply.code(400).send({ error: 'Invalid search type' });
      }

      if (!fastify.db.hasProjectAccess(normalizedProjectId, userId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const searchStorage = async () => {
        const files = fastify.db.getFiles(normalizedProjectId);
        const encryptionKey = fastify.db.getProjectEncryptionKey(normalizedProjectId);
        if (!encryptionKey) {
          return { error: 'Project encryption key not found' };
        }
        const queryLower = query.toLowerCase();
        const results = [];
        let checkedFiles = 0;
        let bytesRead = 0;
        for (const file of files) {
          if (file.is_media === 1) {
            continue;
          }
          if (results.length >= MAX_CONTENT_SEARCH_RESULTS || checkedFiles >= MAX_CONTENT_SEARCH_FILES) {
            break;
          }
          if (!Number.isInteger(file.size) || file.size < 0 || file.size > MAX_CONTENT_SEARCH_FILE_SIZE) {
            continue;
          }
          if (bytesRead + file.size > MAX_CONTENT_SEARCH_TOTAL_SIZE) {
            continue;
          }
          checkedFiles++;
          let content;
          try {
            content = await readFile(normalizedProjectId, file.id, file.name, encryptionKey);
          } catch (err) {
            continue;
          }
          if (typeof content !== 'string') {
            continue;
          }
          const contentSize = Buffer.byteLength(content, 'utf8');
          if (contentSize > MAX_CONTENT_SEARCH_FILE_SIZE || bytesRead + contentSize > MAX_CONTENT_SEARCH_TOTAL_SIZE) {
            continue;
          }
          bytesRead += contentSize;
          if (content.toLowerCase().includes(queryLower)) {
            results.push({ ...file, content: createContentPreview(content, query) });
          }
        }
        return { results };
      };

      let results;
      if (searchIn === 'content') {
        if (fastify.db.hasFileContentColumn()) {
          results = fastify.db.searchFilesByContent(normalizedProjectId, query, {
            maxContentSize: MAX_CONTENT_SEARCH_FILE_SIZE,
            maxResults: MAX_CONTENT_SEARCH_RESULTS,
            previewContext: CONTENT_PREVIEW_CONTEXT
          });
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
        results = fastify.db.searchFiles(normalizedProjectId, query);
      }
      return { results };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Search failed' });
    }
  });
}

