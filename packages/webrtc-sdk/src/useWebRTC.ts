import { useState, useEffect, useRef } from 'react';
import { SignalingClient } from './SignalingClient';
import { PeerConnectionManager, NetworkQualityStats } from './PeerConnectionManager';
import { User, Participant, ChatMessage, CallType } from '@webrtc/types';

export interface UseWebRTCOptions {
  signalingUrl: string;
  user: { id: string; name: string; avatar?: string } | null;
}

export function useWebRTC({ signalingUrl, user }: UseWebRTCOptions) {
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [networkQuality, setNetworkQuality] = useState<NetworkQualityStats>({
    peerSocketId: '',
    rttMs: 0,
    packetsLost: 0,
    bitrateKbps: 0,
    quality: 'excellent'
  });

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    caller: User;
    isVideo: boolean;
    callType: CallType;
  } | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const signaling = new SignalingClient({ url: signalingUrl, autoConnect: true });
    signalingRef.current = signaling;

    const peerManager = new PeerConnectionManager(signaling, {}, {
      onLocalStream: (stream) => setLocalStream(stream),
      onRemoteStream: (peerSocketId, stream) => {
        setRemoteStreams((prev: Map<string, MediaStream>) => new Map(prev).set(peerSocketId, stream));
      },
      onPeerLeft: (peerSocketId) => {
        setRemoteStreams((prev: Map<string, MediaStream>) => {
          const next = new Map(prev);
          next.delete(peerSocketId);
          return next;
        });
      },
      onNetworkQualityReport: (_, stats) => setNetworkQuality(stats)
    });
    peerManagerRef.current = peerManager;

    signaling.on('connected', () => {
      signaling.register(user);
    });

    signaling.on('registered', (u: User) => setRegisteredUser(u));
    signaling.on('presence:update', (users: User[]) => setOnlineUsers(users));
    signaling.on('room:state', (roomState) => {
      setActiveRoomId(roomState.roomId);
      setParticipants(roomState.participants.filter((p) => p.socketId !== signaling.socketId));
    });
    signaling.on('room:user-joined', async (participant) => {
      setParticipants((prev: Participant[]) => [...prev.filter((p: Participant) => p.socketId !== participant.socketId), participant]);
      await peerManagerRef.current?.createPeerConnection(participant.socketId, true);
    });
    signaling.on('room:user-left', ({ socketId }) => {
      setParticipants((prev: Participant[]) => prev.filter((p: Participant) => p.socketId !== socketId));
    });
    signaling.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev: ChatMessage[]) => [...prev, msg]);
    });
    signaling.on('call:incoming', (payload) => setIncomingCall(payload));
    signaling.on('call:ended', () => endCall());

    return () => {
      peerManager.closeAll();
      signaling.disconnect();
    };
  }, [signalingUrl, user?.id]);

  const initiateCall = async (targetUserId: string, isVideo = true) => {
    const roomId = `room_${Date.now()}`;
    if (!signalingRef.current || !peerManagerRef.current) return;

    await peerManagerRef.current.acquireLocalMedia(true, isVideo);
    signalingRef.current.joinRoom(roomId, isVideo);
    signalingRef.current.initiateCall(roomId, targetUserId, isVideo, '1:1');
    setActiveRoomId(roomId);
  };

  const acceptCall = async () => {
    if (!incomingCall || !signalingRef.current || !peerManagerRef.current) return;
    const { roomId, isVideo } = incomingCall;

    await peerManagerRef.current.acquireLocalMedia(true, isVideo);
    signalingRef.current.joinRoom(roomId, isVideo);
    signalingRef.current.acceptCall(roomId);
    setActiveRoomId(roomId);
    setIncomingCall(null);
  };

  const declineCall = () => {
    if (!incomingCall || !signalingRef.current) return;
    signalingRef.current.declineCall(incomingCall.roomId);
    setIncomingCall(null);
  };

  const endCall = () => {
    if (activeRoomId && signalingRef.current) {
      signalingRef.current.endCall(activeRoomId);
      signalingRef.current.leaveRoom(activeRoomId);
    }
    peerManagerRef.current?.closeAll();
    setActiveRoomId(null);
    setParticipants([]);
    setRemoteStreams(new Map());
    setLocalStream(null);
    setIsScreenSharing(false);
  };

  const toggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    peerManagerRef.current?.setAudioMuted(next);
    if (activeRoomId) signalingRef.current?.toggleMedia(activeRoomId, { audio: !next });
  };

  const toggleVideo = () => {
    const next = !isVideoMuted;
    setIsVideoMuted(next);
    peerManagerRef.current?.setVideoMuted(next);
    if (activeRoomId) signalingRef.current?.toggleMedia(activeRoomId, { video: !next });
  };

  const toggleScreenShare = async () => {
    const pm = peerManagerRef.current;
    if (!pm) return;
    if (!isScreenSharing) {
      const s = await pm.startScreenShare();
      if (s) setIsScreenSharing(true);
    } else {
      await pm.stopScreenShare();
      setIsScreenSharing(false);
    }
  };

  const sendChatMessage = (roomId: string, text: string) => {
    signalingRef.current?.sendChatMessage(roomId, text);
  };

  return {
    registeredUser,
    onlineUsers,
    activeRoomId,
    participants,
    localStream,
    remoteStreams,
    networkQuality,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    incomingCall,
    chatMessages,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage
  };
}
