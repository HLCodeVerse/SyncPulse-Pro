# 🚀 SyncPulse Pro — Enterprise WebRTC Integration Guide

This guide explains how to integrate the **SyncPulse Pro WebRTC SDK** (`@webrtc/sdk`), signaling protocol, and video UI components into any web application (React, Next.js, Vue, or Vanilla JavaScript).

---

## 📦 1. Installation

Install the core SDK and UI packages:

```bash
# Using npm
npm install @webrtc/sdk @webrtc/types @webrtc/ui socket.io-client lucide-react

# Using yarn / pnpm
pnpm add @webrtc/sdk @webrtc/types @webrtc/ui socket.io-client lucide-react
```

---

## ⚡ 2. Quickstart Integration (React / Next.js)

### Step A: Initialize Signaling Client & Peer Manager

```typescript
import { useEffect, useRef, useState } from 'react';
import { SignalingClient, PeerConnectionManager, User, Participant } from '@webrtc/sdk';
import { VideoGrid } from '@webrtc/ui';

const SIGNALING_URL = 'https://your-signaling-server.com';

export function WebRTCStudio() {
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [participants, setParticipants] = useState<Participant[]>([]);

  const sigRef = useRef<SignalingClient | null>(null);
  const pmRef = useRef<PeerConnectionManager | null>(null);

  useEffect(() => {
    // 1. Initialize Signaling Socket Client
    const sig = new SignalingClient({ url: SIGNALING_URL, autoConnect: true });
    sigRef.current = sig;

    // 2. Initialize WebRTC Peer Connection Manager
    const pm = new PeerConnectionManager(
      sig,
      {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      },
      {
        onLocalStream: (stream) => setLocalStream(stream),
        onRemoteStream: (socketId, stream) => {
          setRemoteStreams((prev) => new Map(prev).set(socketId, stream));
        },
        onPeerLeft: (socketId) => {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(socketId);
            return next;
          });
        }
      }
    );
    pmRef.current = pm;

    // 3. Listen to Signaling Events
    sig.on('registered', (user) => setRegisteredUser(user));
    sig.on('room:state', (roomState) => setParticipants(roomState.participants));
    sig.on('room:user-joined', async (participant) => {
      setParticipants((prev) => [...prev, participant]);
      await pm.createPeerConnection(participant.socketId, true);
    });

    return () => {
      pm.closeAll();
      sig.disconnect();
    };
  }, []);

  // Register Current User
  const handleLogin = (name: string) => {
    sigRef.current?.register({
      id: `u_${Date.now()}`,
      name,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
    });
  };

  // Join Call Room
  const handleJoinRoom = async (roomId: string) => {
    await pmRef.current?.acquireLocalMedia(true, true);
    sigRef.current?.joinRoom(roomId, true);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col">
      <VideoGrid
        localStream={localStream}
        localUser={{ name: registeredUser?.name || 'Local User' }}
        localMediaState={{ audio: true, video: true }}
        remoteStreams={remoteStreams}
        participants={participants}
      />
    </div>
  );
}
```

---

## 💬 3. Direct Messaging & AI Chat Protocol

### Sending Direct Messages

```typescript
// Send DM to target user
sigRef.current?.sendDirectMessage(targetUserId, "Hello from app!", messageId);

// Listen for incoming messages
sigRef.on('chat:message', (msg) => {
  console.log('New message received:', msg);
});
```

### Adding Reactions & Inline Edits

```typescript
// React to a message
sigRef.current?.reactToMessage(messageId, targetUserId, '👍');

// Edit a sent message
sigRef.current?.editMessage(messageId, targetUserId, 'Updated message text');
```

---

## 🛠️ 4. Deploying the Signaling Server

The signaling server handles room state, SDP offers/answers, and Socket.io message routing.

### Running with Docker

```bash
docker run -d -p 4000:4000 --name syncpulse-signaling hlcodeverse/syncpulse-signaling:latest
```

### Running with Node.js

```bash
cd apps/signaling
npm install
npm run build
node dist/server.js
```

---

## 🔒 5. Production Security & Encryption

- **Media Encryption**: All WebRTC streams automatically negotiate **DTLS-SRTP** using AES-128 GCM. Media is strictly P2P and never touches the signaling server.
- **TURN Server Setup**: For enterprise NAT traversal, provide custom TURN credentials:

```typescript
const pm = new PeerConnectionManager(sig, {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.yourdomain.com:3478',
      username: 'webrtc_user',
      credential: 'secret_password'
    }
  ]
});
```
