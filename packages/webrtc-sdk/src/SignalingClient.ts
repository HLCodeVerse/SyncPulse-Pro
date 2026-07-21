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
  'call:incoming': (payload: { roomId: string; caller: User; isVideo: boolean; callType: CallType }) => void;
  'call:accepted': (payload: { roomId: string; callee: User }) => void;
  'call:declined': (payload: { roomId: string; calleeId: string }) => void;
  'call:ended': (payload: { roomId: string; endedBy: string }) => void;
  'call:busy': (payload: { targetUserId: string; targetUserName: string; message: string }) => void;
  'call:missed': (payload: { caller: User; timestamp: number }) => void;
  'presence:update': (users: User[]) => void;
  'connected': () => void;
  'disconnected': (reason: string) => void;
};

export class SignalingClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private listeners: Map<keyof EventMap, Set<Function>> = new Map();
  public currentUser: User | null = null;

  constructor(options: SignalingClientOptions) {
    this.socket = io(options.url, {
      autoConnect: options.autoConnect ?? false,
      transports: ['websocket', 'polling']
    });

    this.setupListeners();
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
    this.socket.on('call:incoming', (payload) => this.emitLocal('call:incoming', payload));
    this.socket.on('call:accepted', (payload) => this.emitLocal('call:accepted', payload));
    this.socket.on('call:declined', (payload) => this.emitLocal('call:declined', payload));
    this.socket.on('call:ended', (payload) => this.emitLocal('call:ended', payload));
    this.socket.on('call:busy', (payload) => this.emitLocal('call:busy', payload));
    this.socket.on('call:missed', (payload) => this.emitLocal('call:missed', payload));
    this.socket.on('presence:update', (users) => this.emitLocal('presence:update', users));
  }

  public connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public register(user: { id: string; name: string; avatar?: string }) {
    this.socket.emit('user:register', user);
  }

  public joinRoom(roomId: string, isVideo = true) {
    this.socket.emit('room:join', { roomId, isVideo });
  }

  public leaveRoom(roomId: string) {
    this.socket.emit('room:leave', { roomId });
  }

  public sendOffer(targetSocketId: string, sdp: RTCSessionDescriptionInit) {
    this.socket.emit('signal:offer', { targetSocketId, sdp });
  }

  public sendAnswer(targetSocketId: string, sdp: RTCSessionDescriptionInit) {
    this.socket.emit('signal:answer', { targetSocketId, sdp });
  }

  public sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit) {
    this.socket.emit('signal:ice-candidate', { targetSocketId, candidate });
  }

  public toggleMedia(roomId: string, mediaState: Partial<MediaState>) {
    this.socket.emit('media:toggle', { roomId, mediaState });
  }

  public sendChatMessage(roomId: string, text: string) {
    this.socket.emit('chat:send', { roomId, text });
  }

  public sendDirectMessage(targetUserId: string, text: string, id?: string) {
    this.socket.emit('chat:dm', { targetUserId, text, id });
  }

  public reactToMessage(messageId: string, targetUserId: string, emoji: string) {
    this.socket.emit('chat:react', { messageId, targetUserId, emoji });
  }

  public editMessage(messageId: string, targetUserId: string, newText: string) {
    this.socket.emit('chat:edit', { messageId, targetUserId, newText });
  }

  public markMessagesRead(targetUserId: string, messageIds: string[]) {
    this.socket.emit('chat:read', { targetUserId, messageIds });
  }

  public initiateCall(roomId: string, targetUserId: string, isVideo: boolean, callType: CallType = '1:1') {
    this.socket.emit('call:initiate', { roomId, targetUserId, isVideo, callType });
  }

  public acceptCall(roomId: string) {
    this.socket.emit('call:accept', { roomId });
  }

  public declineCall(roomId: string) {
    this.socket.emit('call:decline', { roomId });
  }

  public endCall(roomId: string) {
    this.socket.emit('call:end', { roomId });
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
    return this.socket.id;
  }
}
