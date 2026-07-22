# 🚀 SyncPulse Pro — Features & Technical Capabilities

Welcome to **SyncPulse Pro**, an enterprise-grade, single-platform WebRTC real-time video calling, audio studio, messaging, and AI communication network built on **Next.js 14 (App Router)** and **AMOLED Neumorphic UI Design**.

---

## 🌟 Core System Architecture

### 1. 📞 Enterprise WebRTC Calling Engine
- **Direct 1:1 Mesh Calling**: Low-latency P2P video & audio connections negotiated over custom WebSockets & Serverless HTTP signaling.
- **Multi-User Audio & Video Studio Rooms**: Create or join named group rooms (e.g. `engineering-standup`) for multi-participant video conferences.
- **Dynamic Track Sender Toggling**: Toggle Microphone and Camera on/off cleanly during live calls without dropping WebRTC connections.
- **Screen Sharing**: Broadcast high-definition desktop screen streams to all remote peers.
- **Adaptive Network Quality Monitoring**: Real-time RTT latency (ms), Bitrate (Kbps), and Quality badges (`Excellent`, `Good`, `Poor`, `Bad`).
- **In-Call Participant Invites**: Invite active online users directly into your live call room with real-time invitation signals.

---

## 🤝 Social & Friend Network

### 2. 👥 Friend Request System
- **Discover Online Users**: View active users connected across the network in real-time.
- **Send, Accept & Decline Requests**: Instant friend request signals (`friend:request`, `friend:accept`, `friend:reject`).
- **Local Profile Caching**: Accepted friends and user profiles are cached in `localStorage` (`syncpulse_friends_${userId}` and `syncpulse_friend_profiles_${userId}`). Friends appear in your Contacts list permanently, even if they refresh or go offline!
- **Call & Messaging Gating**: 1:1 video calls and direct messages are securely restricted so only confirmed friends (or PulseAI) can communicate.

---

## 💬 Advanced Messaging System

### 3. 💬 Rich Real-Time Chat
- **Swipe & Quote Reply**: Click "Reply" to quote an existing message with sender attribution above the input bar.
- **Inline Message Editing**: Edit sent messages with live update badges `(edited)`.
- **Message Deletion**: Delete messages in real-time (`🚫 This message was deleted`).
- **Emoji Reactions**: Express feelings with hover reaction bars (👍, ❤️, 😂, 😮, 😢, 🔥).
- **Read Receipts & Delivery Status**: Track message states from Sent (✓) to Delivered (✓✓) and Read (blue ✓✓).
- **In-Call Chat Toast Popups**: Receive real-time chat overlay notifications directly on top of active video calls without interrupting video!
- **Voice Notes & File Attachments**: Record audio notes with live second timers or attach local files.

---

## 🤖 Gemini AI Integration & Vector Animated AI Icon

### 4. ✨ PulseAI Assistant & Inline AI Tools
- **Custom Vector Animated AI Icon (`AiSparkleIcon`)**: A dual-ring rotating vector SVG sparkle icon with gradient animations.
- **PulseAI Bot Chat**: Dedicated AI assistant user powered by **Gemini 1.5 Flash**.
- **Inline Input Rephrase Tool**: Click the AI icon inside the chat bar to transform text:
  - 💼 Professional
  - ⚡ Concise
  - 💬 Casual
  - 🌐 Translate to Spanish / French
- **Chat History Summarizer**: Auto-generate bulleted conversation summaries for any long chat thread.
- **AI Studio Workspace**: Dedicated canvas for rephrasing and drafting text.

---

## 🎨 Aesthetics & Themes

### 5. 🖤 AMOLED Black & Matte Finish UI
- **AMOLED Pitch Black Canvas**: `#000000` pitch black background for OLED energy efficiency and visual contrast.
- **Matte Finish Cards**: Subtly elevated matte surfaces (`#13151b`, `#1a1d26`) with crisp `border-white/10` and `backdrop-blur-xl`.
- **Sleek Compact Avatars**: Compact `w-8 h-8` and `w-9 h-9` avatar images with `ring-1 ring-white/10`.
- **Ultra-Sleek Mobile Bottom Nav**: Fixed bottom navigation bar with active red highlight badges.

### 6. 🌈 9 Curated Appearance Themes
1. 🔴 **AMOLED Coral Dark** (Default)
2. 🩵 **Cyan Mint** (`#007CBE` + `#FFF7AE`)
3. 🌅 **Coral Sunset** (`#E57A44` + `#251351`)
4. 💜 **Pastel Lavender** (`#F1FEC6` + `#A882DD`)
5. 🌹 **Rose Mint** (`#DB5375` + `#B3FFB3`)
6. 🌊 **Ocean Blue** (`#02C3BD` + `#4E148C`)
7. 🍋 **Lime Gold** (`#629460` + `#F4D35E`)
8. 🌲 **Forest Sage** (`#414288` + `#B0DB43`)
9. 🍑 **Peach Pink** (`#FFC145` + `#EC368D`)

---

## 🔄 Session Persistence & Sound

### 7. 🔊 Synthetic Audio System & Session Safety
- **Distinct Synthetic Audio Sounds**:
  - `playSound('notification')`: Crisp double-ping for friend requests & alerts.
  - `playSound('message')`: Pop chime for text messages.
  - `playSound('ring')`: Pulsing dual-frequency ringtone for incoming calls.
  - `playSound('dial')`: Outgoing dial tone.
- **Refresh Persistence**: Auto-restores login state, avatar, display name, and friends list on page refresh (`localStorage`).
- **Logout Action**: Purges local session, closes peer connections, and returns to the full-screen native onboarding canvas.

---

## 🚀 Single-Platform Deployment
- **Vercel Serverless Ready**: Integrated dual-layer signaling (Socket.io + HTTP long polling against `/api/signaling`).
- **Zero External Dependencies Required**: Fully self-contained monorepo structure.
