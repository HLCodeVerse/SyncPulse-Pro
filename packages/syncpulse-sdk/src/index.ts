/* SyncPulse SDK — Framework-Agnostic WebRTC Calling & Messaging Engine */

import { SignalingClient } from '@webrtc/sdk';
import { PeerConnectionManager } from '@webrtc/sdk';
import { User, ChatMessage } from '@webrtc/types';

export interface SyncPulseSDKConfig {
  userId: string;
  userName: string;
  avatar?: string;
  signalingUrl?: string;
}

export type SDKEvent = 'incoming-call' | 'message' | 'presence-change' | 'call-ended';

export class SyncPulseSDK {
  private sig: SignalingClient | null = null;
  private pm: PeerConnectionManager | null = null;
  private config: SyncPulseSDKConfig | null = null;
  private eventHandlers: Map<SDKEvent, Set<Function>> = new Map();

  public init(config: SyncPulseSDKConfig) {
    this.config = config;
    const url = config.signalingUrl || 'http://localhost:4000';

    this.sig = new SignalingClient({ url, autoConnect: true });
    this.pm = new PeerConnectionManager(this.sig, {}, {});

    this.sig.register({ id: config.userId, name: config.userName, avatar: config.avatar });

    this.sig.on('call:incoming', (payload) => this.emit('incoming-call', payload));
    this.sig.on('chat:message', (msg) => this.emit('message', msg));
    this.sig.on('presence:update', (users) => this.emit('presence-change', users));
    this.sig.on('call:ended', (payload) => this.emit('call-ended', payload));
  }

  public call(targetUserId: string, isVideo = true) {
    if (!this.sig || !this.config) throw new Error('SyncPulse SDK not initialized');
    const roomId = `room_${Date.now()}`;
    this.sig.joinRoom(roomId, isVideo);
    this.sig.initiateCall(roomId, targetUserId, isVideo, '1:1');
    return roomId;
  }

  public joinRoom(roomId: string, isVideo = true) {
    if (!this.sig) throw new Error('SyncPulse SDK not initialized');
    this.sig.joinRoom(roomId, isVideo);
  }

  public sendMessage(targetUserId: string, text: string) {
    if (!this.sig) throw new Error('SyncPulse SDK not initialized');
    this.sig.sendDirectMessage(targetUserId, text);
  }

  public on(event: SDKEvent, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  public off(event: SDKEvent, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: SDKEvent, ...args: any[]) {
    this.eventHandlers.get(event)?.forEach(fn => fn(...args));
  }
}

export const syncpulse = new SyncPulseSDK();
