const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

let io;
const userSockets = new Map(); // Map to store userId -> [socketIds]

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.sub || socket.user.id || socket.user._id;
    
    if (!userId) {
      console.warn(`⚠️ Socket connection attempt without valid userId: ${socket.id}`);
      return socket.disconnect();
    }

    console.log(`👤 User connected: ${userId} (Socket: ${socket.id})`);

    // Join a room specific to this user
    socket.join(userId.toString());

    // Track user socket
    if (!userSockets.has(userId.toString())) {
      userSockets.set(userId.toString(), new Set());
    }
    userSockets.get(userId.toString()).add(socket.id);

    socket.on('disconnect', () => {
      console.log(`👤 User disconnected: ${userId} (Socket: ${socket.id})`);
      const userSet = userSockets.get(userId.toString());
      if (userSet) {
        userSet.delete(socket.id);
        if (userSet.size === 0) {
          userSockets.delete(userId.toString());
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId.toString()).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser
};
