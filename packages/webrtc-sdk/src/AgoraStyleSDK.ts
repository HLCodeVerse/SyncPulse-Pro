import { SignalingClient } from './SignalingClient';
import { PeerConnectionManager } from './PeerConnectionManager';

export interface AgoraStyleConfig {
  serverUrl: string;
}

export class AgoraStyleClient {
  public signaling: SignalingClient;
  public peerManager: PeerConnectionManager;

  constructor(config: AgoraStyleConfig) {
    this.signaling = new SignalingClient({ url: config.serverUrl, autoConnect: true });
    this.peerManager = new PeerConnectionManager(this.signaling);
  }

  public async join(roomId: string, userId: string, userName?: string): Promise<void> {
    this.signaling.register({ id: userId, name: userName || userId });
    this.signaling.joinRoom(roomId);
  }

  public async publishTracks(audio = true, video = true): Promise<MediaStream> {
    return await this.peerManager.acquireLocalMedia(audio, video);
  }

  public async leave(roomId: string): Promise<void> {
    this.signaling.leaveRoom(roomId);
    this.peerManager.closeAll();
  }

  public toggleMuteAudio(muted: boolean) {
    this.peerManager.setAudioMuted(muted);
  }

  public toggleMuteVideo(muted: boolean) {
    this.peerManager.setVideoMuted(muted);
  }
}

export class WebRTCPlatform {
  public static createClient(config: AgoraStyleConfig): AgoraStyleClient {
    return new AgoraStyleClient(config);
  }
}
