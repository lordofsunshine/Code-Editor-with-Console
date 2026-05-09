import { fastify } from '../server/index.js';

const ready = fastify.ready();

export default async function handler(request, response) {
  await ready;
  fastify.server.emit('request', request, response);
}
