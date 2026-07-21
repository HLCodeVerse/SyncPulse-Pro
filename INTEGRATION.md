# WebRTC Platform Integration Guide (`INTEGRATION.md`)

This guide explains how to drop-in **Voice/Video Calling**, **WhatsApp-Style Chat**, and **Screen Sharing** into any third-party React, Next.js, or HTML/JS web application (e.g. **BJCC**, **Quiki**, etc.) using `@webrtc/sdk` and `@webrtc/ui`.

---

## 🚀 Quick Setup (< 20 Lines of Code)

### 1. Install Workspace Packages or Link Internal Packages
In your target application's `package.json`, include:

```json
{
  "dependencies": {
    "@webrtc/sdk": "file:../path-to-webrtc-platform/packages/webrtc-sdk",
    "@webrtc/ui": "file:../path-to-webrtc-platform/packages/ui",
    "@webrtc/types": "file:../path-to-webrtc-platform/packages/types",
    "lucide-react": "^0.475.0"
  }
}
```

---

### 2. Embed Full WebRTC Calling & Chat using `useWebRTC` Hook

Drop this React component into your project (e.g. `src/pages/VideoCallPage.tsx` or inside **BJCC** / **Quiki**):

```tsx
import React from 'react';
import { useWebRTC } from '@webrtc/sdk';
import { VideoGrid, ControlBar, CallModal, WhatsAppChatWindow, CallWidget } from '@webrtc/ui';

export function CallIntegrationWidget({ currentUser }) {
  const {
    activeRoomId,
    participants,
    localStream,
    remoteStreams,
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
  } = useWebRTC({
    signalingUrl: 'http://localhost:4000',
    user: currentUser // e.g. { id: 'teacher_101', name: 'Dr. Sarah Jenkins' }
  });

  // Active Call Screen
  if (activeRoomId) {
    return (
      <div className="relative h-screen w-screen bg-slate-950 flex">
        <VideoGrid
          localStream={localStream}
          localUser={{ name: currentUser.name }}
          localMediaState={{ audio: !isAudioMuted, video: !isVideoMuted }}
          remoteStreams={remoteStreams}
          participants={participants}
        />
        <ControlBar
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          isScreenSharing={isScreenSharing}
          isChatOpen={false}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleChat={() => {}}
          onEndCall={endCall}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Floating Call Widget on lower-right corner */}
      <CallWidget
        onStartCall={(isVideo) => initiateCall('student_202', isVideo)}
        onOpenChat={() => {}}
        incomingCallFrom={incomingCall?.caller.name}
        onAcceptIncomingCall={acceptCall}
      />

      {/* Incoming Call Dialog Overlay */}
      {incomingCall && (
        <CallModal
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
    </div>
  );
}
```

---

## 💬 Embedding WhatsApp Standalone Chat

To render a full-screen or embedded WhatsApp-style multi-contact messaging interface in your app:

```tsx
import { WhatsAppChatWindow } from '@webrtc/ui';

<WhatsAppChatWindow
  currentUser={{ id: 'user_1', name: 'Alice' }}
  contacts={[
    { id: 'user_2', name: 'Bob', status: 'online' },
    { id: 'user_3', name: 'Charlie', status: 'in-call' }
  ]}
  messages={chatMessages}
  onSendMessage={(roomId, text) => sendChatMessage(roomId, text)}
  onInitiateCall={(targetUser, isVideo) => initiateCall(targetUser.id, isVideo)}
/>
```

---

## 🛠️ Vanilla JavaScript / Non-React Integration

If your project does not use React, you can import `SignalingClient` and `PeerConnectionManager` directly:

```js
import { SignalingClient, PeerConnectionManager } from '@webrtc/sdk';

// 1. Initialize Signaling Connection
const signaling = new SignalingClient({ url: 'http://localhost:4000', autoConnect: true });

signaling.on('connected', () => {
  signaling.register({ id: 'user_123', name: 'John Doe' });
});

// 2. Initialize WebRTC Peer Manager
const peerManager = new PeerConnectionManager(signaling, {}, {
  onLocalStream: (stream) => {
    document.getElementById('localVideo').srcObject = stream;
  },
  onRemoteStream: (peerSocketId, stream) => {
    document.getElementById('remoteVideo').srcObject = stream;
  }
});

// 3. Initiate Call
async function startCall(targetUserId) {
  await peerManager.acquireLocalMedia(true, true);
  signaling.joinRoom('room_abc', true);
  signaling.initiateCall('room_abc', targetUserId, true, '1:1');
}
```

---

## ⚙️ Environment Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SIGNALING_URL` | `http://localhost:4000` | URL of Fastify + Socket.io signaling server |
| `PORT` | `4000` | Port for signaling server |
| `REQUIRE_AUTH` | `false` | Enable strict JWT socket authentication |
| `TURN_SECRET` | `webrtc-production-secret-key` | HMAC secret key for short-lived coturn TURN credentials |
