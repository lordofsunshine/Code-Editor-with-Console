import { Server } from 'socket.io';
import { WRITE_ROLES, parsePositiveInteger } from './utils/request.js';

export function initSocket(server, db) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  const getProjectId = (projectId) => parsePositiveInteger(projectId);
  const getProjectFileIds = (projectId, fileId) => {
    const normalizedProjectId = parsePositiveInteger(projectId);
    const normalizedFileId = parsePositiveInteger(fileId);
    return normalizedProjectId && normalizedFileId
      ? { projectId: normalizedProjectId, fileId: normalizedFileId }
      : null;
  };
  const canWrite = (projectId, userId) => WRITE_ROLES.has(db.getUserRole(projectId, userId));

  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth?.userId;
      const username = socket.handshake.auth?.username;

      if (!userId || !username || typeof username !== 'string') {
        return next(new Error('Authentication error'));
      }

      const normalizedUserId = parsePositiveInteger(userId);
      if (!normalizedUserId || username.length > 100) {
        return next(new Error('Authentication error'));
      }

      const user = db.getUserById(normalizedUserId);
      if (!user || user.username !== username) {
        return next(new Error('Authentication error'));
      }

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  const projectRooms = new Map();

  const addProjectUser = (projectId, userId) => {
    if (!projectRooms.has(projectId)) {
      projectRooms.set(projectId, new Map());
    }

    const users = projectRooms.get(projectId);
    users.set(userId, (users.get(userId) || 0) + 1);
  };

  const removeProjectUser = (projectId, userId) => {
    const users = projectRooms.get(projectId);
    if (!users) {
      return;
    }

    const count = users.get(userId) || 0;
    if (count <= 1) {
      users.delete(userId);
    } else {
      users.set(userId, count - 1);
    }

    if (users.size === 0) {
      projectRooms.delete(projectId);
    }
  };

  const emitCollaboratorsUpdate = (projectId) => {
    const users = projectRooms.get(projectId);
    const collaborators = users ? Array.from(users.keys()) : [];
    io.to(`project:${projectId}`).emit('collaborators-update', {
      collaborators,
      projectId
    });
  };

  io.on('connection', (socket) => {
    const activeRooms = new Set();

    socket.on('join-project', (projectId) => {
      const normalizedProjectId = getProjectId(projectId);
      if (!normalizedProjectId) {
        socket.emit('error', { message: 'Invalid project ID' });
        return;
      }

      if (!db.hasProjectAccess(normalizedProjectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(`project:${normalizedProjectId}`);

      if (!activeRooms.has(normalizedProjectId)) {
        activeRooms.add(normalizedProjectId);
        addProjectUser(normalizedProjectId, socket.userId);
      }

      emitCollaboratorsUpdate(normalizedProjectId);

      socket.emit('joined-project', { projectId: normalizedProjectId });
    });

    socket.on('leave-project', (projectId) => {
      const normalizedProjectId = getProjectId(projectId);
      if (!normalizedProjectId) {
        return;
      }

      socket.leave(`project:${normalizedProjectId}`);

      if (activeRooms.delete(normalizedProjectId)) {
        removeProjectUser(normalizedProjectId, socket.userId);
        emitCollaboratorsUpdate(normalizedProjectId);
      }
    });

    socket.on('file-change', ({ projectId, fileId, content, cursorPosition, isTyping }) => {
      const ids = getProjectFileIds(projectId, fileId);
      if (!ids) {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!db.hasProjectAccess(ids.projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (!canWrite(ids.projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (typeof content !== 'string' || content.length > 10485760) {
        socket.emit('error', { message: 'Invalid content' });
        return;
      }

      socket.to(`project:${ids.projectId}`).emit('file-updated', {
        fileId: ids.fileId,
        content,
        userId: socket.userId,
        username: socket.username,
        cursorPosition,
        isTyping: !!isTyping
      });
    });

    socket.on('file-created', ({ projectId, file }) => {
      const normalizedProjectId = getProjectId(projectId);
      if (!normalizedProjectId) {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!db.hasProjectAccess(normalizedProjectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (!canWrite(normalizedProjectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (!file || typeof file !== 'object' || typeof file.name !== 'string' || file.name.length > 255) {
        socket.emit('error', { message: 'Invalid file data' });
        return;
      }

      socket.to(`project:${normalizedProjectId}`).emit('file-added', {
        file,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('file-deleted', ({ projectId, fileId }) => {
      const ids = getProjectFileIds(projectId, fileId);
      if (!ids) {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!db.hasProjectAccess(ids.projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (!canWrite(ids.projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.to(`project:${ids.projectId}`).emit('file-removed', {
        fileId: ids.fileId,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('cursor-move', ({ projectId, fileId, position }) => {
      const ids = getProjectFileIds(projectId, fileId);
      if (!ids) {
        return;
      }

      if (!db.hasProjectAccess(ids.projectId, socket.userId)) {
        return;
      }

      socket.to(`project:${ids.projectId}`).emit('cursor-position', {
        fileId: ids.fileId,
        userId: socket.userId,
        username: socket.username,
        position
      });
    });

    socket.on('disconnect', () => {
      activeRooms.forEach((projectId) => {
        removeProjectUser(projectId, socket.userId);
        emitCollaboratorsUpdate(projectId);
      });
    });
  });

  return io;
}

