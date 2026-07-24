import { io, Socket } from 'socket.io-client';
import {
  User,
  RoomState,
  Participant,
  ChatMessage,
  MediaState,
  CallType,
  ClientToServerEvents,
  ServerToClientEvents
} from '@webrtc/types';

export interface SignalingClientOptions {
  url: string;
  autoConnect?: boolean;
}

export type EventMap = {
  'registered': (user: User) => void;
  'room:state': (state: RoomState) => void;
  'room:user-joined': (participant: Participant) => void;
  'room:user-left': (payload: { socketId: string; userId: string }) => void;
  'signal:offer': (payload: { senderSocketId: string; sdp: RTCSessionDescriptionInit }) => void;
  'signal:answer': (payload: { senderSocketId: string; sdp: RTCSessionDescriptionInit }) => void;
  'signal:ice-candidate': (payload: { senderSocketId: string; candidate: RTCIceCandidateInit }) => void;
  'media:updated': (payload: { socketId: string; mediaState: MediaState }) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:updated': (payload: { messageId: string; message: ChatMessage }) => void;
  'chat:read_status': (payload: { messageIds: string[]; readByUserId: string }) => void;
  'chat:typing': (payload: { senderId: string; isTyping: boolean }) => void;
  'call:incoming': (payload: { roomId: string; caller: User; isVideo: boolean; callType: CallType }) => void;
  'call:accepted': (payload: { roomId: string; callee: User }) => void;
  'call:declined': (payload: { roomId: string; calleeId: string }) => void;
  'call:ended': (payload: { roomId: string; endedBy: string }) => void;
  'call:busy': (payload: { targetUserId: string; targetUserName: string; message: string }) => void;
  'call:missed': (payload: { caller: User; timestamp: number }) => void;
  'presence:update': (users: User[]) => void;
  'friend:request': (payload: { from: User }) => void;
  'friend:accept': (payload: { from: User }) => void;
  'friend:reject': (payload: { fromUserId: string }) => void;
  'call:invite': (payload: { roomId: string; inviter: User; isVideo: boolean }) => void;
  'connected': () => void;
  'disconnected': (reason: string) => void;
};

export class SignalingClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private listeners: Map<keyof EventMap, Set<Function>> = new Map();
  public currentUser: User | null = null;
  private pollInterval: any = null;
  private lastPollTime = 0;
  private processedEventIds = new Set<string>();

  constructor(options: SignalingClientOptions) {
    this.socket = io(options.url, {
      autoConnect: options.autoConnect ?? false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 200,
      reconnectionDelayMax: 1000,
      timeout: 3000
    });

    this.setupListeners();
    this.startHttpFallbackPolling();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      this.emitLocal('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.emitLocal('disconnected', reason);
    });

    this.socket.on('registered', (user) => {
      this.currentUser = user;
      this.emitLocal('registered', user);
    });

    this.socket.on('room:state', (state) => this.emitLocal('room:state', state));
    this.socket.on('room:user-joined', (p) => this.emitLocal('room:user-joined', p));
    this.socket.on('room:user-left', (p) => this.emitLocal('room:user-left', p));
    this.socket.on('signal:offer', (payload) => this.emitLocal('signal:offer', payload));
    this.socket.on('signal:answer', (payload) => this.emitLocal('signal:answer', payload));
    this.socket.on('signal:ice-candidate', (payload) => this.emitLocal('signal:ice-candidate', payload));
    this.socket.on('media:updated', (payload) => this.emitLocal('media:updated', payload));
    this.socket.on('chat:message', (msg) => this.emitLocal('chat:message', msg));
    this.socket.on('chat:updated', (payload) => this.emitLocal('chat:updated', payload));
    this.socket.on('chat:read_status', (payload) => this.emitLocal('chat:read_status', payload));
    this.socket.on('chat:typing', (payload) => this.emitLocal('chat:typing', payload));
    this.socket.on('call:incoming', (payload) => this.emitLocal('call:incoming', payload));
    this.socket.on('call:accepted', (payload) => this.emitLocal('call:accepted', payload));
    this.socket.on('call:declined', (payload) => this.emitLocal('call:declined', payload));
    this.socket.on('call:ended', (payload) => this.emitLocal('call:ended', payload));
    this.socket.on('call:busy', (payload) => this.emitLocal('call:busy', payload));
    this.socket.on('call:missed', (payload) => this.emitLocal('call:missed', payload));
    this.socket.on('presence:update', (users) => this.emitLocal('presence:update', users));
  }

  private startHttpFallbackPolling() {
    if (typeof window === 'undefined') return;
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(async () => {
      if (!this.currentUser) return;
      try {
        const url = `/api/signaling?userId=${encodeURIComponent(this.currentUser.id)}&since=${this.lastPollTime}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.timestamp) this.lastPollTime = data.timestamp - 100;
          if (Array.isArray(data.activeUsers)) {
            this.emitLocal('presence:update', data.activeUsers);
          }
          if (Array.isArray(data.events)) {
            for (const evt of data.events) {
              if (this.processedEventIds.has(evt.id)) continue;
              this.processedEventIds.add(evt.id);
              if (this.processedEventIds.size > 1000) {
                const first = Array.from(this.processedEventIds)[0];
                this.processedEventIds.delete(first);
              }
              this.handleServerlessEvent(evt);
            }
          }
        }
      } catch (e) { }
    }, 1500);
  }

  private handleServerlessEvent(evt: { type: string; payload: any; senderId?: string }) {
    switch (evt.type) {
      case 'call:incoming':
        this.emitLocal('call:incoming', evt.payload);
        break;
      case 'call:accepted':
        this.emitLocal('call:accepted', evt.payload);
        break;
      case 'call:declined':
        this.emitLocal('call:declined', evt.payload);
        break;
      case 'call:ended':
        this.emitLocal('call:ended', evt.payload);
        break;
      case 'call:busy':
        this.emitLocal('call:busy', evt.payload);
        break;
      case 'signal:offer':
        this.emitLocal('signal:offer', { senderSocketId: evt.senderId || 'http_peer', sdp: evt.payload.sdp });
        break;
      case 'signal:answer':
        this.emitLocal('signal:answer', { senderSocketId: evt.senderId || 'http_peer', sdp: evt.payload.sdp });
        break;
      case 'signal:ice-candidate':
        this.emitLocal('signal:ice-candidate', { senderSocketId: evt.senderId || 'http_peer', candidate: evt.payload.candidate });
        break;
      case 'chat:message':
        this.emitLocal('chat:message', evt.payload);
        break;
      case 'chat:updated':
        this.emitLocal('chat:updated', evt.payload);
        break;
      case 'room:state':
        this.emitLocal('room:state', evt.payload);
        break;
      case 'room:user-joined':
        this.emitLocal('room:user-joined', evt.payload);
        break;
      case 'room:user-left':
        this.emitLocal('room:user-left', evt.payload);
        break;
      case 'friend:request':
        this.emitLocal('friend:request', evt.payload);
        break;
      case 'friend:accept':
        this.emitLocal('friend:accept', evt.payload);
        break;
      case 'friend:reject':
        this.emitLocal('friend:reject', evt.payload);
        break;
      case 'call:invite':
        this.emitLocal('call:invite', evt.payload);
        break;
    }
  }

  private async postServerlessSignal(type: string, targetUserId?: string, roomId?: string, payload?: any) {
    if (typeof window === 'undefined' || !this.currentUser) return;
    try {
      await fetch('/api/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signal',
          event: {
            type,
            targetUserId,
            roomId,
            senderId: this.currentUser.id,
            payload
          }
        })
      });
    } catch (e) { }
  }

  public connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public register(user: { id: string; name: string; avatar?: string }) {
    this.currentUser = { ...user, status: 'online' };
    this.socket.emit('user:register', user);
    if (typeof window !== 'undefined') {
      fetch('/api/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', user: this.currentUser })
      }).catch(() => { });
    }
  }

  public joinRoom(roomId: string, isVideo = true) {
    this.socket.emit('room:join', { roomId, isVideo });
    this.postServerlessSignal('room:user-joined', undefined, roomId, {
      socketId: this.currentUser?.id || 'http_peer',
      user: this.currentUser,
      mediaState: { audio: true, video: isVideo, screen: false },
      joinedAt: Date.now()
    });
  }

  public leaveRoom(roomId: string) {
    this.socket.emit('room:leave', { roomId });
    this.postServerlessSignal('room:user-left', undefined, roomId, {
      socketId: this.currentUser?.id || 'http_peer',
      userId: this.currentUser?.id
    });
  }

  public sendOffer(targetSocketId: string, sdp: RTCSessionDescriptionInit) {
    this.socket.emit('signal:offer', { targetSocketId, sdp });
    this.postServerlessSignal('signal:offer', targetSocketId, undefined, { sdp });
  }

  public sendAnswer(targetSocketId: string, sdp: RTCSessionDescriptionInit) {
    this.socket.emit('signal:answer', { targetSocketId, sdp });
    this.postServerlessSignal('signal:answer', targetSocketId, undefined, { sdp });
  }

  public sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit) {
    this.socket.emit('signal:ice-candidate', { targetSocketId, candidate });
    this.postServerlessSignal('signal:ice-candidate', targetSocketId, undefined, { candidate });
  }

  public toggleMedia(roomId: string, mediaState: Partial<MediaState>) {
    this.socket.emit('media:toggle', { roomId, mediaState });
  }

  public sendChatMessage(roomId: string, text: string) {
    this.socket.emit('chat:send', { roomId, text });
  }

  public sendDirectMessage(targetUserId: string, text: string, id?: string, mediaUrl?: string) {
    this.socket.emit('chat:dm', { targetUserId, text, id, mediaUrl });
    if (this.currentUser) {
      const msg: ChatMessage = {
        id: id || `msg_${Date.now()}`,
        roomId: [this.currentUser.id, targetUserId].sort().join('_chat_'),
        sender: { id: this.currentUser.id, name: this.currentUser.name, avatar: this.currentUser.avatar },
        text,
        mediaUrl,
        timestamp: Date.now(),
        status: 'delivered'
      };
      this.postServerlessSignal('chat:message', targetUserId, undefined, msg);
    }
  }

  public sendTypingStatus(targetUserId: string, isTyping: boolean) {
    this.socket.emit('chat:typing', { targetUserId, isTyping });
  }

  public reactToMessage(messageId: string, targetUserId: string, emoji: string) {
    this.socket.emit('chat:react', { messageId, targetUserId, emoji });
    if (this.currentUser) {
      this.postServerlessSignal('chat:updated', targetUserId, undefined, {
        messageId,
        message: { reactions: [{ emoji, userId: this.currentUser.id, userName: this.currentUser.name }] }
      });
    }
  }

  public editMessage(messageId: string, targetUserId: string, newText: string) {
    this.socket.emit('chat:edit', { messageId, targetUserId, newText });
    this.postServerlessSignal('chat:updated', targetUserId, undefined, {
      messageId,
      message: { text: newText, isEdited: true }
    });
  }

  public deleteMessage(messageId: string, targetUserId: string) {
    this.postServerlessSignal('chat:updated', targetUserId, undefined, {
      messageId,
      message: { text: '🚫 This message was deleted', isDeleted: true }
    });
  }

  public markMessagesRead(targetUserId: string, messageIds: string[]) {
    this.socket.emit('chat:read', { targetUserId, messageIds });
  }

  public initiateCall(roomId: string, targetUserId: string, isVideo: boolean, callType: CallType = '1:1') {
    this.socket.emit('call:initiate', { roomId, targetUserId, isVideo, callType });
    if (this.currentUser) {
      this.postServerlessSignal('call:incoming', targetUserId, roomId, {
        roomId,
        caller: this.currentUser,
        isVideo,
        callType
      });
    }
  }

  public acceptCall(roomId: string) {
    this.socket.emit('call:accept', { roomId });
    if (this.currentUser) {
      this.postServerlessSignal('call:accepted', undefined, roomId, {
        roomId,
        callee: this.currentUser
      });
    }
  }

  public declineCall(roomId: string) {
    this.socket.emit('call:decline', { roomId });
    if (this.currentUser) {
      this.postServerlessSignal('call:declined', undefined, roomId, {
        roomId,
        calleeId: this.currentUser.id
      });
    }
  }

  public endCall(roomId: string) {
    this.socket.emit('call:end', { roomId });
    if (this.currentUser) {
      this.postServerlessSignal('call:ended', undefined, roomId, {
        roomId,
        endedBy: this.currentUser.id
      });
    }
  }

  public sendFriendRequest(targetUserId: string) {
    if (this.currentUser) {
      this.postServerlessSignal('friend:request', targetUserId, undefined, { from: this.currentUser });
    }
  }

  public acceptFriendRequest(targetUserId: string) {
    if (this.currentUser) {
      this.postServerlessSignal('friend:accept', targetUserId, undefined, { from: this.currentUser });
    }
  }

  public rejectFriendRequest(targetUserId: string) {
    if (this.currentUser) {
      this.postServerlessSignal('friend:reject', targetUserId, undefined, { fromUserId: this.currentUser.id });
    }
  }

  public inviteToCall(targetUserId: string, roomId: string, isVideo: boolean) {
    if (this.currentUser) {
      this.postServerlessSignal('call:invite', targetUserId, roomId, {
        roomId,
        inviter: this.currentUser,
        isVideo
      });
    }
  }

  public on<K extends keyof EventMap>(event: K, listener: EventMap[K]) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  public off<K extends keyof EventMap>(event: K, listener: EventMap[K]) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  private emitLocal(event: keyof EventMap, ...args: any[]) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((fn) => fn(...args));
    }
  }

  public get socketId(): string | undefined {
    return this.socket.id || this.currentUser?.id || 'http_peer';
  }
}
