# 100% Free 1-Click Deployment Guide (`FREE_DEPLOYMENT.md`)

This guide shows you how to deploy the entire **WebRTC Production Platform** for **$0/month forever with NO credit card required**, using:
- **Render.com**: 100% Free Node.js Hosting for Fastify + Socket.io Signaling Server
- **Vercel**: 100% Free Next.js Hosting for Web Client & WhatsApp Chat UI

---

## ⚡ Step 1: Deploy Signaling Server to Render.com ($0/Month)

1. **Push your code to GitHub** (create a private or public repository).
2. Go to [https://render.com](https://render.com) and sign up for a **Free Account** using GitHub.
3. Click **"New +"** in the top navigation bar and select **"Blueprint"**.
4. Connect your GitHub repository.
5. Render will automatically detect [`render.yaml`](file:///d:/Projects/WebRTC/render.yaml) and display:
   - **Service Name**: `webrtc-signaling-server`
   - **Plan**: Free ($0/month)
6. Click **"Apply"**.
7. In ~2 minutes, your free signaling server will be live at:
   `https://webrtc-signaling-server-xxxx.onrender.com`

---

## 🌐 Step 2: Deploy Web Client to Vercel ($0/Month)

1. Go to [https://vercel.com](https://vercel.com) and sign up for a **Free Hobby Account** using GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - **Name**: `NEXT_PUBLIC_SIGNALING_URL`
   - **Value**: `https://webrtc-signaling-server-xxxx.onrender.com` *(Use your Render URL from Step 1)*
5. Click **"Deploy"**.
6. In ~1 minute, your WebRTC App will be live at:
   `https://your-project.vercel.app`

---

## 🚀 Step 3: Connecting External Apps (BJCC, Quiki, etc.)

Now any third-party app can connect to your free live signaling server for **100% free unlimited video/voice calls & chat**:

```tsx
import { useWebRTC } from '@webrtc/sdk';
import { VideoGrid, ControlBar, CallModal, WhatsAppChatWindow, CallWidget } from '@webrtc/ui';

export function ExternalAppCalling({ user }) {
  const { activeRoomId, participants, initiateCall, acceptCall } = useWebRTC({
    signalingUrl: 'https://webrtc-signaling-server-xxxx.onrender.com', // Your Free Render URL
    user
  });

  return (
    <div>
      <CallWidget onStartCall={(isVideo) => initiateCall('target_id', isVideo)} />
    </div>
  );
}
```

---

## 📊 Summary of Free Resources

| Service | Hosting Provider | Cost | Setup Time |
|---|---|---|---|
| **Signaling Server** (`apps/signaling`) | Render.com | **$0/month** | 2 minutes |
| **Web App & WhatsApp Chat** (`apps/web`) | Vercel | **$0/month** | 1 minute |
| **STUN NAT Traversal** | Google Public STUN | **$0/month** | Built-in |
| **SSL Certificates** | Automatic TLS | **$0/month** | Built-in |
