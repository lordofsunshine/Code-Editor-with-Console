import { Server } from 'socket.io';

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

  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth?.userId;
      const username = socket.handshake.auth?.username;

      if (!userId || !username || typeof userId !== 'number' || typeof username !== 'string') {
        return next(new Error('Authentication error'));
      }

      if (!Number.isInteger(userId) || userId <= 0 || username.length > 100) {
        return next(new Error('Authentication error'));
      }

      const user = db.getUserById(userId);
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

  io.on('connection', (socket) => {
    const activeRooms = new Set();

    socket.on('join-project', (projectId) => {
      if (!projectId || typeof projectId !== 'number' || !Number.isInteger(projectId) || projectId <= 0) {
        socket.emit('error', { message: 'Invalid project ID' });
        return;
      }

      if (!db.hasProjectAccess(projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(`project:${projectId}`);
      activeRooms.add(projectId);
      
      if (!projectRooms.has(projectId)) {
        projectRooms.set(projectId, new Set());
      }
      projectRooms.get(projectId).add(socket.userId);

      const collaborators = Array.from(projectRooms.get(projectId));
      io.to(`project:${projectId}`).emit('collaborators-update', { 
        collaborators,
        projectId 
      });

      socket.emit('joined-project', { projectId });
    });

    socket.on('leave-project', (projectId) => {
      if (!projectId || typeof projectId !== 'number' || !Number.isInteger(projectId) || projectId <= 0) {
        return;
      }

      socket.leave(`project:${projectId}`);
      
      if (projectRooms.has(projectId)) {
        projectRooms.get(projectId).delete(socket.userId);
        
        const collaborators = Array.from(projectRooms.get(projectId));
        io.to(`project:${projectId}`).emit('collaborators-update', { 
          collaborators,
          projectId 
        });
      }
    });

    socket.on('file-change', ({ projectId, fileId, content, cursorPosition, isTyping }) => {
      if (!projectId || !fileId || typeof projectId !== 'number' || typeof fileId !== 'number') {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!db.hasProjectAccess(projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (typeof content !== 'string' || content.length > 10485760) {
        socket.emit('error', { message: 'Invalid content' });
        return;
      }

      socket.to(`project:${projectId}`).emit('file-updated', {
        fileId,
        content,
        userId: socket.userId,
        username: socket.username,
        cursorPosition,
        isTyping: !!isTyping
      });
    });

    socket.on('file-created', ({ projectId, file }) => {
      if (!projectId || typeof projectId !== 'number' || !Number.isInteger(projectId) || projectId <= 0) {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!db.hasProjectAccess(projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (!file || typeof file !== 'object' || typeof file.name !== 'string' || file.name.length > 255) {
        socket.emit('error', { message: 'Invalid file data' });
        return;
      }

      socket.to(`project:${projectId}`).emit('file-added', {
        file,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('file-deleted', ({ projectId, fileId }) => {
      if (!projectId || !fileId || typeof projectId !== 'number' || typeof fileId !== 'number') {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
        socket.emit('error', { message: 'Invalid data' });
        return;
      }

      if (!db.hasProjectAccess(projectId, socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.to(`project:${projectId}`).emit('file-removed', {
        fileId,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('cursor-move', ({ projectId, fileId, position }) => {
      if (!projectId || !fileId || typeof projectId !== 'number' || typeof fileId !== 'number') {
        return;
      }

      if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
        return;
      }

      if (!db.hasProjectAccess(projectId, socket.userId)) {
        return;
      }

      socket.to(`project:${projectId}`).emit('cursor-position', {
        fileId,
        userId: socket.userId,
        username: socket.username,
        position
      });
    });

    socket.on('disconnect', () => {
      projectRooms.forEach((users, projectId) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          const collaborators = Array.from(users);
          io.to(`project:${projectId}`).emit('collaborators-update', { 
            collaborators,
            projectId 
          });
        }
      });
    });
  });

  return io;
}

