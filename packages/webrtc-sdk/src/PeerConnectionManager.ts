import { SignalingClient } from './SignalingClient';

export interface PeerConnectionConfig {
  iceServers?: RTCIceServer[];
}

export type PeerConnectionCallbacks = {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (peerSocketId: string, stream: MediaStream) => void;
  onPeerLeft?: (peerSocketId: string) => void;
  onIceConnectionStateChange?: (peerSocketId: string, state: RTCIceConnectionState) => void;
  onNetworkQualityReport?: (peerSocketId: string, stats: NetworkQualityStats) => void;
};

export interface NetworkQualityStats {
  peerSocketId: string;
  rttMs: number;
  packetsLost: number;
  bitrateKbps: number;
  quality: 'excellent' | 'good' | 'poor' | 'bad';
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

export class PeerConnectionManager {
  private signalingClient: SignalingClient;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private callbacks: PeerConnectionCallbacks;
  private iceServers: RTCIceServer[];
  private statsIntervalTimer: any = null;
  private prevBytesReport: Map<string, { timestamp: number; bytes: number }> = new Map();

  constructor(signalingClient: SignalingClient, config?: PeerConnectionConfig, callbacks?: PeerConnectionCallbacks) {
    this.signalingClient = signalingClient;
    this.iceServers = config?.iceServers ?? DEFAULT_ICE_SERVERS;
    this.callbacks = callbacks ?? {};

    this.registerSignalingHandlers();
    this.startStatsMonitoring();
  }

  private startStatsMonitoring() {
    if (typeof window === 'undefined') return;
    this.statsIntervalTimer = setInterval(async () => {
      for (const [socketId, pc] of this.peerConnections.entries()) {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          await this.collectPeerStats(socketId, pc);
        }
      }
    }, 2000);
  }

  private async collectPeerStats(socketId: string, pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats();
      let rttMs = 0;
      let packetsLost = 0;
      let currentBytes = 0;

      stats.forEach((report) => {
        if (report.type === 'remote-inbound-rtp' && report.roundTripTime) {
          rttMs = Math.round(report.roundTripTime * 1000);
        }
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsLost = report.packetsLost || 0;
          currentBytes = report.bytesReceived || 0;
        }
      });

      const now = Date.now();
      const prev = this.prevBytesReport.get(socketId);
      let bitrateKbps = 0;

      if (prev) {
        const timeDiffSec = (now - prev.timestamp) / 1000;
        if (timeDiffSec > 0) {
          bitrateKbps = Math.round(((currentBytes - prev.bytes) * 8) / (timeDiffSec * 1024));
        }
      }
      this.prevBytesReport.set(socketId, { timestamp: now, bytes: currentBytes });

      let quality: 'excellent' | 'good' | 'poor' | 'bad' = 'excellent';
      if (rttMs > 300 || packetsLost > 20) {
        quality = 'bad';
      } else if (rttMs > 150 || packetsLost > 5) {
        quality = 'poor';
      } else if (rttMs > 80) {
        quality = 'good';
      }

      // Adaptive Bitrate/Resolution Control based on quality
      if (quality === 'excellent' || quality === 'good') {
        this.setVideoHD(socketId, true).catch(() => {});
      } else {
        this.setVideoHD(socketId, false).catch(() => {});
      }

      this.callbacks.onNetworkQualityReport?.(socketId, {
        peerSocketId: socketId,
        rttMs,
        packetsLost,
        bitrateKbps: Math.max(0, bitrateKbps),
        quality
      });
    } catch (e) {
      // Ignore stats collection errors on closed peers
    }
  }

  public async restartIce(targetSocketId: string) {
    const pc = this.peerConnections.get(targetSocketId);
    if (!pc) return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      this.signalingClient.sendOffer(targetSocketId, offer);
    } catch (err) {
      console.error('Failed to restart ICE for peer', targetSocketId, err);
    }
  }

  private registerSignalingHandlers() {
    this.signalingClient.on('signal:offer', async ({ senderSocketId, sdp }) => {
      await this.handleReceivedOffer(senderSocketId, sdp);
    });

    this.signalingClient.on('signal:answer', async ({ senderSocketId, sdp }) => {
      await this.handleReceivedAnswer(senderSocketId, sdp);
    });

    this.signalingClient.on('signal:ice-candidate', async ({ senderSocketId, candidate }) => {
      await this.handleReceivedIceCandidate(senderSocketId, candidate);
    });

    this.signalingClient.on('room:user-left', ({ socketId }) => {
      this.closePeer(socketId);
    });
  }

  public async acquireLocalMedia(audio = true, video = true): Promise<MediaStream> {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: video ? {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 }
        } : false
      });

      this.callbacks.onLocalStream?.(this.localStream);
      return this.localStream;
    } catch (err) {
      console.error('Failed to get local user media', err);
      throw err;
    }
  }

  public async createPeerConnection(targetSocketId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(targetSocketId)) {
      return this.peerConnections.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    this.peerConnections.set(targetSocketId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.sendIceCandidate(targetSocketId, event.candidate.toJSON());
      }
    };

    // Connection state changes
    pc.oniceconnectionstatechange = () => {
      this.callbacks.onIceConnectionStateChange?.(targetSocketId, pc.iceConnectionState);
    };

    // Remote tracks
    pc.ontrack = (event) => {
      let remoteStream = this.remoteStreams.get(targetSocketId);
      if (!remoteStream) {
        remoteStream = new MediaStream();
        this.remoteStreams.set(targetSocketId, remoteStream);
      }
      event.streams[0].getTracks().forEach((track) => {
        if (!remoteStream!.getTracks().some((t) => t.id === track.id)) {
          remoteStream!.addTrack(track);
        }
      });

      this.callbacks.onRemoteStream?.(targetSocketId, remoteStream);
    };

    if (isInitiator) {
      let offer = await pc.createOffer();
      offer = { type: 'offer', sdp: this.tweakSdp(offer.sdp || '') };
      await pc.setLocalDescription(offer);
      this.signalingClient.sendOffer(targetSocketId, offer);
    }

    return pc;
  }

  private tweakSdp(sdp: string): string {
    return sdp.replace('useinbandfec=1', 'useinbandfec=1;stereo=1;maxptime=20;minptime=10');
  }

  public async setVideoHD(socketId: string, hd: boolean) {
    const pc = this.peerConnections.get(socketId);
    if (!pc) return;
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
      const params = sender.getParameters();
      if (!params.encodings) {
        params.encodings = [{}];
      }
      if (hd) {
        params.encodings[0].scaleResolutionDownBy = 1.0;
        params.encodings[0].maxBitrate = 2500000;
      } else {
        params.encodings[0].scaleResolutionDownBy = 2.0;
        params.encodings[0].maxBitrate = 500000;
      }
      await sender.setParameters(params);
    }
  }

  private async handleReceivedOffer(senderSocketId: string, sdp: RTCSessionDescriptionInit) {
    const pc = await this.createPeerConnection(senderSocketId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    let answer = await pc.createAnswer();
    answer = { type: 'answer', sdp: this.tweakSdp(answer.sdp || '') };
    await pc.setLocalDescription(answer);
    this.signalingClient.sendAnswer(senderSocketId, answer);
  }

  private async handleReceivedAnswer(senderSocketId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(senderSocketId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  private async handleReceivedIceCandidate(senderSocketId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(senderSocketId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    }
  }

  public setAudioMuted(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    for (const pc of this.peerConnections.values()) {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !muted;
        }
      });
    }
  }

  public setVideoMuted(muted: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    for (const pc of this.peerConnections.values()) {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.enabled = !muted;
        }
      });
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const videoTrack = this.screenStream.getVideoTracks()[0];

      // Replace video track in peer connections
      for (const pc of this.peerConnections.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }

      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      return this.screenStream;
    } catch (err) {
      console.error('Screen sharing cancelled or failed', err);
      return null;
    }
  }

  public async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      for (const pc of this.peerConnections.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      }
    }
  }

  public closePeer(peerSocketId: string) {
    const pc = this.peerConnections.get(peerSocketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerSocketId);
    }
    this.remoteStreams.delete(peerSocketId);
    this.callbacks.onPeerLeft?.(peerSocketId);
  }

  public closeAll() {
    if (this.statsIntervalTimer) {
      clearInterval(this.statsIntervalTimer);
      this.statsIntervalTimer = null;
    }
    for (const [socketId] of this.peerConnections) {
      this.closePeer(socketId);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(socketId: string): MediaStream | undefined {
    return this.remoteStreams.get(socketId);
  }
}
