export interface User {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'in-call';
  lastSeen?: string;
}

export type CallType = '1:1' | 'group';

export interface MediaState {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

export interface Participant {
  user: User;
  socketId: string;
  mediaState: MediaState;
  joinedAt: number;
}

export interface RoomState {
  roomId: string;
  type: CallType;
  participants: Participant[];
  createdAt: number;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  text: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  isEdited?: boolean;
  isDeleted?: boolean;
  editedAt?: number;
}

export interface SDPSignal {
  targetSocketId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface ICESignal {
  targetSocketId: string;
  candidate: RTCIceCandidateInit;
}

export interface CallInitiatePayload {
  roomId: string;
  targetUserId: string;
  callType: CallType;
  isVideo: boolean;
}

export interface CallResponsePayload {
  roomId: string;
  accepted: boolean;
}

// Client to Server Events
export interface ClientToServerEvents {
  'user:register': (user: { id: string; name: string; avatar?: string }) => void;
  'room:join': (payload: { roomId: string; isVideo?: boolean }) => void;
  'room:leave': (payload: { roomId: string }) => void;
  'signal:offer': (payload: { targetSocketId: string; sdp: RTCSessionDescriptionInit }) => void;
  'signal:answer': (payload: { targetSocketId: string; sdp: RTCSessionDescriptionInit }) => void;
  'signal:ice-candidate': (payload: { targetSocketId: string; candidate: RTCIceCandidateInit }) => void;
  'media:toggle': (payload: { roomId: string; mediaState: Partial<MediaState> }) => void;
  'chat:send': (payload: { roomId: string; text: string }) => void;
  'chat:dm': (payload: { targetUserId: string; text: string; id?: string }) => void;
  'chat:react': (payload: { messageId: string; targetUserId: string; emoji: string }) => void;
  'chat:edit': (payload: { messageId: string; targetUserId: string; newText: string }) => void;
  'chat:read': (payload: { targetUserId: string; messageIds: string[] }) => void;
  'call:initiate': (payload: CallInitiatePayload) => void;
  'call:accept': (payload: { roomId: string }) => void;
  'call:decline': (payload: { roomId: string }) => void;
  'call:end': (payload: { roomId: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
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
}
