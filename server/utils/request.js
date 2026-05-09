export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
export const WRITE_ROLES = new Set(['owner', 'editor']);

export function requireAuth(request, reply, done) {
  if (!request.session.userId) {
    return reply.code(401).send({ error: 'Not authenticated' });
  }
  done();
}

export function parsePositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parsePositiveIntegerParam(request, name) {
  return parsePositiveInteger(request.params?.[name]);
}

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isValidUsername(username, min = 3, max = 20) {
  return typeof username === 'string'
    && username.length >= min
    && username.length <= max
    && USERNAME_PATTERN.test(username);
}

export function canWriteProject(db, projectId, userId) {
  return WRITE_ROLES.has(db.getUserRole(projectId, userId));
}

export function emitToUser(io, userId, event, payload) {
  if (!io) {
    return;
  }

  for (const socket of io.sockets.sockets.values()) {
    if (socket.userId === userId) {
      socket.emit(event, payload);
    }
  }
}

export function emitToUsers(io, userIds, event, payload) {
  for (const userId of new Set(userIds.filter(Boolean))) {
    emitToUser(io, userId, event, payload);
  }
}