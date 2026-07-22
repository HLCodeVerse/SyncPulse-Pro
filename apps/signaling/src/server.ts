import Fastify from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import {
  User,
  RoomState,
  Participant,
  ChatMessage,
  MediaState,
  ClientToServerEvents,
  ServerToClientEvents
} from '@webrtc/types';

const fastify = Fastify({ logger: true });

const PORT = parseInt(process.env.PORT || '4000', 10);

// In-Memory Storage
const activeUsers = new Map<string, User>(); // userId -> User
const userSockets = new Map<string, string>(); // socketId -> userId
const socketUserMap = new Map<string, User>(); // socketId -> User
const rooms = new Map<string, RoomState>(); // roomId -> RoomState

// Initialize Socket.io attached to Fastify server
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(fastify.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  // Verify token or allow dev sessions
  if (process.env.REQUIRE_AUTH === 'true' && !token) {
    return next(new Error('Authentication failed: missing JWT token'));
  }
  next();
});

function broadcastPresence() {
  const usersList = Array.from(activeUsers.values());
  io.emit('presence:update', usersList);
}

io.on('connection', (socket) => {
  fastify.log.info(`Socket connected: ${socket.id}`);

  // Register user
  socket.on('user:register', (userData) => {
    const user: User = {
      id: userData.id,
      name: userData.name,
      avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData.id}`,
      status: 'online'
    };

    activeUsers.set(user.id, user);
    userSockets.set(socket.id, user.id);
    socketUserMap.set(socket.id, user);

    socket.emit('registered', user);
    broadcastPresence();
  });

  // Join Room
  socket.on('room:join', ({ roomId, isVideo = true }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    socket.join(roomId);

    let room = rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        type: '1:1',
        participants: [],
        createdAt: Date.now()
      };
      rooms.set(roomId, room);
    }

    const defaultMediaState: MediaState = { audio: true, video: isVideo, screen: false };
    const participant: Participant = {
      user,
      socketId: socket.id,
      mediaState: defaultMediaState,
      joinedAt: Date.now()
    };

    // Remove old participant entry if present
    room.participants = room.participants.filter((p) => p.socketId !== socket.id);
    room.participants.push(participant);
    room.type = room.participants.length > 2 ? 'group' : '1:1';

    // Notify others in room
    socket.to(roomId).emit('room:user-joined', participant);

    // Send full room state to joining client
    socket.emit('room:state', room);

    // Update user status
    user.status = 'in-call';
    activeUsers.set(user.id, user);
    broadcastPresence();
  });

  // Leave Room
  socket.on('room:leave', ({ roomId }) => {
    handleUserLeavingRoom(socket.id, roomId);
  });

  // Signal: SDP Offer
  socket.on('signal:offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('signal:offer', {
      senderSocketId: socket.id,
      sdp
    });
  });

  // Signal: SDP Answer
  socket.on('signal:answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('signal:answer', {
      senderSocketId: socket.id,
      sdp
    });
  });

  // Signal: ICE Candidate
  socket.on('signal:ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('signal:ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // Media Toggle
  socket.on('media:toggle', ({ roomId, mediaState }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const p = room.participants.find((part) => part.socketId === socket.id);
    if (p) {
      p.mediaState = { ...p.mediaState, ...mediaState };
      io.to(roomId).emit('media:updated', {
        socketId: socket.id,
        mediaState: p.mediaState
      });
    }
  });

  // Chat message
  socket.on('chat:send', ({ roomId, text }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      sender: {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      },
      text,
      timestamp: Date.now()
    };

    io.to(roomId).emit('chat:message', message);
  });

  // Direct Message (DM) — routes to target user socket without requiring room:join
  socket.on('chat:dm', ({ targetUserId, text, id, mediaUrl }) => {
    const sender = socketUserMap.get(socket.id);
    if (!sender) return;

    const roomId = [sender.id, targetUserId].sort().join('_chat_');

    const message: ChatMessage = {
      id: id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      sender: {
        id: sender.id,
        name: sender.name,
        avatar: sender.avatar
      },
      text,
      mediaUrl,
      timestamp: Date.now()
    };

    // Send to sender
    socket.emit('chat:message', message);

    // Send to target user's socket(s)
    for (const [sId, uId] of userSockets.entries()) {
      if (uId === targetUserId && sId !== socket.id) {
        io.to(sId).emit('chat:message', message);
      }
    }
  });

  // Chat Reaction
  socket.on('chat:react', ({ messageId, targetUserId, emoji }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    for (const [sId, uId] of userSockets.entries()) {
      if (uId === targetUserId || sId === socket.id) {
        io.to(sId).emit('chat:updated', {
          messageId,
          message: {
            id: messageId,
            roomId: '',
            sender: { id: '', name: '' },
            text: '',
            timestamp: 0,
            reactions: [{ emoji, userId: user.id, userName: user.name }]
          }
        });
      }
    }
  });

  // Chat Edit
  socket.on('chat:edit', ({ messageId, targetUserId, newText }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    for (const [sId, uId] of userSockets.entries()) {
      if (uId === targetUserId || sId === socket.id) {
        io.to(sId).emit('chat:updated', {
          messageId,
          message: {
            id: messageId,
            roomId: '',
            sender: { id: user.id, name: user.name },
            text: newText,
            timestamp: Date.now(),
            isEdited: true,
            editedAt: Date.now()
          }
        });
      }
    }
  });

  // Chat Read Receipts
  socket.on('chat:read', ({ targetUserId, messageIds }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    for (const [sId, uId] of userSockets.entries()) {
      if (uId === targetUserId) {
        io.to(sId).emit('chat:read_status', { messageIds, readByUserId: user.id });
      }
    }
  });

  // Call Initiation
  socket.on('call:initiate', ({ roomId, targetUserId, isVideo, callType }) => {
    const caller = socketUserMap.get(socket.id);
    if (!caller) return;

    const targetUser = activeUsers.get(targetUserId);

    // If target user is busy on another call
    if (targetUser && targetUser.status === 'in-call') {
      socket.emit('call:busy', {
        targetUserId,
        targetUserName: targetUser.name,
        message: `${targetUser.name} is currently busy on another call.`
      });

      // Find socket for target user to send missed call log
      let targetSocketId: string | undefined;
      for (const [sId, uId] of userSockets.entries()) {
        if (uId === targetUserId) {
          targetSocketId = sId;
          break;
        }
      }

      if (targetSocketId) {
        io.to(targetSocketId).emit('call:missed', { caller, timestamp: Date.now() });
      }
      return;
    }

    // Find socket for target user
    let targetSocketId: string | undefined;
    for (const [sId, uId] of userSockets.entries()) {
      if (uId === targetUserId && sId !== socket.id) {
        targetSocketId = sId;
        break;
      }
    }

    if (targetSocketId) {
      io.to(targetSocketId).emit('call:incoming', {
        roomId,
        caller,
        isVideo,
        callType
      });
    }
  });

  // Accept Call
  socket.on('call:accept', ({ roomId }) => {
    const callee = socketUserMap.get(socket.id);
    if (!callee) return;

    io.to(roomId).emit('call:accepted', { roomId, callee });
  });

  // Decline Call
  socket.on('call:decline', ({ roomId }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    io.to(roomId).emit('call:declined', { roomId, calleeId: user.id });
  });

  // End Call
  socket.on('call:end', ({ roomId }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;

    io.to(roomId).emit('call:ended', { roomId, endedBy: user.id });
    handleUserLeavingRoom(socket.id, roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    fastify.log.info(`Socket disconnected: ${socket.id}`);
    const user = socketUserMap.get(socket.id);

    // Leave all rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants.some((p) => p.socketId === socket.id)) {
        handleUserLeavingRoom(socket.id, roomId);
      }
    }

    if (user) {
      user.status = 'offline';
      user.lastSeen = new Date().toISOString();
      activeUsers.set(user.id, user);
      broadcastPresence();
    }

    userSockets.delete(socket.id);
    socketUserMap.delete(socket.id);
  });
});

function handleUserLeavingRoom(socketId: string, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const leavingUser = socketUserMap.get(socketId);
  room.participants = room.participants.filter((p) => p.socketId !== socketId);

  io.to(roomId).emit('room:user-left', { socketId, userId: leavingUser?.id || '' });
  io.sockets.sockets.get(socketId)?.leave(roomId);

  if (room.participants.length === 0) {
    rooms.delete(roomId);
  } else {
    room.type = room.participants.length > 2 ? 'group' : '1:1';
  }

  if (leavingUser) {
    leavingUser.status = 'online';
    activeUsers.set(leavingUser.id, leavingUser);
    broadcastPresence();
  }
}

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    activeUsers: activeUsers.size,
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  };
});

// Prometheus Metrics Endpoint
fastify.get('/metrics', async (request, reply) => {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  const activeRoomsCount = rooms.size;
  const activeUsersCount = activeUsers.size;

  const metrics = `
# HELP webrtc_active_users Current number of active registered users
# TYPE webrtc_active_users gauge
webrtc_active_users ${activeUsersCount}

# HELP webrtc_active_rooms Current number of active call rooms
# TYPE webrtc_active_rooms gauge
webrtc_active_rooms ${activeRoomsCount}

# HELP webrtc_uptime_seconds Server uptime in seconds
# TYPE webrtc_uptime_seconds counter
webrtc_uptime_seconds ${Math.floor(uptime)}

# HELP webrtc_memory_heap_used_bytes Memory heap used
# TYPE webrtc_memory_heap_used_bytes gauge
webrtc_memory_heap_used_bytes ${memory.heapUsed}
`.trim();

  reply.header('Content-Type', 'text/plain; version=0.0.4');
  return metrics;
});

// Start Server
async function start() {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Signaling server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
