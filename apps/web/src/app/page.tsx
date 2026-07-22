'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SignalingClient,
  PeerConnectionManager,
  User,
  Participant,
  ChatMessage,
  CallType
} from '@webrtc/sdk';
import {
  VideoGrid,
  ControlBar,
  CallModal,
  NetworkQualityBadge,
  CallLogItem,
  ThemeKey
} from '@webrtc/ui';
import {
  Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Monitor, MessageSquare,
  Search, Send, CheckCheck, Check, ArrowLeft, Settings, LogOut, Users, Zap,
  X, Camera, Volume2, Sparkles, Hash, Edit2, Bot, Wand2, Globe2, ShieldCheck,
  Pin, File, PhoneCall, User as UserIcon
} from 'lucide-react';
import { askGemini, generateSmartReplies, summarizeChatHistory, rephraseText, translateText } from '../lib/aiService';

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
];

const AI_BOT_USER: User = {
  id: 'pulse_ai_bot',
  name: 'PulseAI Assistant',
  avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  status: 'online',
  lastSeen: 'Active Now'
};

const THEMES: { key: ThemeKey; label: string; dot: string }[] = [
  { key: 'slate', label: 'Slate Enterprise', dot: '#3b82f6' },
  { key: 'indigo', label: 'Indigo Night', dot: '#6366f1' },
  { key: 'mineral', label: 'Mineral Green', dot: '#10b981' },
  { key: 'graphite', label: 'Graphite Dark', dot: '#e4e4e7' },
];

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🚀', '🔥'];

function isOnlyEmoji(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]){1,3}$/gi;
  return emojiRegex.test(clean);
}

function playSound(type: 'message' | 'ring' | 'dial') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'message') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'ring') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'dial') {
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
}

export default function Home() {
  const [userName, setUserName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [userBio, setUserBio] = useState('Senior Product Engineer & WebRTC specialist.');
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  type Screen = 'chats' | 'calls' | 'ai-studio' | 'profile' | 'settings';
  const [screen, setScreen] = useState<Screen>('chats');
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [theme, setTheme] = useState<ThemeKey>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('pulse_theme') as ThemeKey) || 'slate';
    return 'slate';
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Call state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [groupRoomInput, setGroupRoomInput] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [networkQuality, setNetworkQuality] = useState<{ quality: 'excellent' | 'good' | 'poor' | 'bad'; rttMs: number; bitrateKbps: number }>({ quality: 'excellent', rttMs: 0, bitrateKbps: 0 });
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Calling & Dialing States
  const [incomingCall, setIncomingCall] = useState<{ roomId: string; caller: User; isVideo: boolean; callType: CallType } | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<{ target: User; isVideo: boolean; roomId: string } | null>(null);
  const [busyNotice, setBusyNotice] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showAiEnhancerMenu, setShowAiEnhancerMenu] = useState(false);

  // Attachment & Voice Note State
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [summaryModalText, setSummaryModalText] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Studio State
  const [aiPolishInput, setAiPolishInput] = useState('');
  const [aiPolishOutput, setAiPolishOutput] = useState('');
  const [aiPolishStyle, setAiPolishStyle] = useState<'professional' | 'casual' | 'fluent' | 'concise'>('professional');

  const sigRef = useRef<SignalingClient | null>(null);
  const pmRef = useRef<PeerConnectionManager | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pulse_theme', theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedContact, smartReplies]);

  // Voice recording timer
  useEffect(() => {
    let interval: any = null;
    if (isVoiceRecording) {
      interval = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isVoiceRecording]);

  /* ── Signaling Handlers ─────────────────────────────────────────────── */
  useEffect(() => {
    const sig = new SignalingClient({ url: SIGNALING_URL, autoConnect: false });
    sigRef.current = sig;
    const pm = new PeerConnectionManager(sig, {}, {
      onLocalStream: (s) => setLocalStream(s),
      onRemoteStream: (id, s) => setRemoteStreams((p) => new Map(p).set(id, s)),
      onPeerLeft: (id) => setRemoteStreams((p) => { const n = new Map(p); n.delete(id); return n; }),
      onNetworkQualityReport: (_, st) => setNetworkQuality({ quality: st.quality, rttMs: st.rttMs, bitrateKbps: st.bitrateKbps }),
    });
    pmRef.current = pm;

    sig.on('registered', (u) => setRegisteredUser(u));
    sig.on('presence:update', (u) => setOnlineUsers(u));
    sig.on('room:state', (rs) => {
      setActiveRoomId(rs.roomId);
      setParticipants(rs.participants.filter((p) => p.socketId !== sig.socketId));
    });
    sig.on('room:user-joined', async (p) => {
      setParticipants((prev) => [...prev.filter((x) => x.socketId !== p.socketId), p]);
      await pm.createPeerConnection(p.socketId, true);
    });
    sig.on('room:user-left', ({ socketId }) => setParticipants((prev) => prev.filter((p) => p.socketId !== socketId)));

    sig.on('chat:message', (msg) => {
      setChatMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, status: 'delivered' }];
      });
      if (soundEnabled) playSound('message');
    });

    sig.on('chat:updated', ({ messageId, message }) => {
      setChatMessages((prev) => prev.map(m => {
        if (m.id === messageId) {
          const updatedReactions = message.reactions
            ? [...(m.reactions || []).filter(r => r.userId !== message.reactions![0].userId), message.reactions[0]]
            : m.reactions;
          return {
            ...m,
            text: message.text || m.text,
            isEdited: message.isEdited !== undefined ? message.isEdited : m.isEdited,
            reactions: updatedReactions,
          };
        }
        return m;
      }));
    });

    sig.on('chat:read_status', ({ messageIds }) => {
      setChatMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, status: 'read' } : m));
    });

    // 🔔 Calling Listeners
    sig.on('call:incoming', (payload) => {
      setIncomingCall(payload);
      if (soundEnabled) playSound('ring');
    });

    sig.on('call:accepted', ({ roomId }) => {
      setOutgoingCall(null);
      setActiveRoomId(roomId);
    });

    sig.on('call:declined', () => {
      setOutgoingCall(null);
      leaveCall();
      setBusyNotice("Call was declined.");
      setTimeout(() => setBusyNotice(null), 4000);
    });

    sig.on('call:ended', () => leaveCall());
    sig.on('call:busy', ({ message }) => {
      setOutgoingCall(null);
      setBusyNotice(message);
      setTimeout(() => setBusyNotice(null), 4000);
    });
    sig.on('call:missed', (m) => setCallLogs((p) => [{ id: `l${Date.now()}`, contact: m.caller, type: 'missed' as const, isVideo: true, timestamp: m.timestamp }, ...p]));

    return () => { pm.closeAll(); sig.disconnect(); };
  }, [soundEnabled, notificationsEnabled]);

  useEffect(() => {
    if (!selectedContact || !registeredUser) return;
    const dmId = selectedContact.id === AI_BOT_USER.id ? 'pulse_ai_bot' : [registeredUser.id, selectedContact.id].sort().join('_chat_');
    const unreadIds = chatMessages
      .filter(m => m.roomId === dmId && m.sender.id === selectedContact.id && m.status !== 'read')
      .map(m => m.id);

    if (unreadIds.length > 0) {
      setChatMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m));
      if (selectedContact.id !== AI_BOT_USER.id) {
        sigRef.current?.markMessagesRead(selectedContact.id, unreadIds);
      }
    }

    const activeMsgs = chatMessages.filter(m => m.roomId === dmId);
    const lastMsg = activeMsgs[activeMsgs.length - 1];
    if (lastMsg && lastMsg.sender.id !== registeredUser.id && selectedContact.id !== AI_BOT_USER.id) {
      generateSmartReplies(lastMsg.text).then(replies => setSmartReplies(replies));
    } else {
      setSmartReplies([]);
    }
  }, [selectedContact, chatMessages, registeredUser]);

  /* ── User Auth Registration ─────────────────────────────────────────── */
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    const id = `u_${Math.random().toString(36).substring(2, 9)}`;
    sigRef.current?.connect();
    sigRef.current?.register({ id, name: userName.trim(), avatar: selectedAvatar });
  };

  /* ── WebRTC Calling Actions ──────────────────────────────────────────── */
  const startCall = async (target: User, isVideo: boolean) => {
    if (target.id === AI_BOT_USER.id) {
      alert("PulseAI Assistant cannot join direct voice calls.");
      return;
    }
    const roomId = `room_${Date.now()}`;
    setOutgoingCall({ target, isVideo, roomId });
    if (soundEnabled) playSound('dial');
    await pmRef.current?.acquireLocalMedia(true, isVideo);
    sigRef.current?.joinRoom(roomId, isVideo);
    sigRef.current?.initiateCall(roomId, target.id, isVideo, '1:1');
    setActiveRoomId(roomId);
    setCallLogs((p) => [{ id: `l${Date.now()}`, contact: target, type: 'outgoing', isVideo, timestamp: Date.now() }, ...p]);
  };

  const joinGroup = async (isVideo = true) => {
    if (!groupRoomInput.trim()) return;
    await pmRef.current?.acquireLocalMedia(true, isVideo);
    sigRef.current?.joinRoom(groupRoomInput.trim(), isVideo);
    setActiveRoomId(groupRoomInput.trim());
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    await pmRef.current?.acquireLocalMedia(true, incomingCall.isVideo);
    sigRef.current?.joinRoom(incomingCall.roomId, incomingCall.isVideo);
    sigRef.current?.acceptCall(incomingCall.roomId);
    setActiveRoomId(incomingCall.roomId);
    setCallLogs((p) => [{ id: `l${Date.now()}`, contact: incomingCall.caller, type: 'incoming', isVideo: incomingCall.isVideo, timestamp: Date.now() }, ...p]);
    setIncomingCall(null);
  };

  const declineCall = () => {
    if (incomingCall) {
      sigRef.current?.declineCall(incomingCall.roomId);
      setIncomingCall(null);
    }
  };

  const leaveCall = () => {
    if (activeRoomId) {
      sigRef.current?.endCall(activeRoomId);
      sigRef.current?.leaveRoom(activeRoomId);
    }
    pmRef.current?.closeAll();
    setActiveRoomId(null);
    setOutgoingCall(null);
    setParticipants([]);
    setRemoteStreams(new Map());
    setLocalStream(null);
    setScreenStream(null);
    setIsScreenSharing(false);
  };

  const toggleAudio = () => { setIsAudioMuted((v) => { pmRef.current?.setAudioMuted(!v); if (activeRoomId) sigRef.current?.toggleMedia(activeRoomId, { audio: v }); return !v; }); };
  const toggleVideo = () => { setIsVideoMuted((v) => { pmRef.current?.setVideoMuted(!v); if (activeRoomId) sigRef.current?.toggleMedia(activeRoomId, { video: v }); return !v; }); };
  const toggleScreen = async () => {
    if (!isScreenSharing) { const s = await pmRef.current?.startScreenShare(); if (s) { setIsScreenSharing(true); setScreenStream(s); } }
    else { await pmRef.current?.stopScreenShare(); setIsScreenSharing(false); setScreenStream(null); }
  };

  /* ── Chat Messages ──────────────────────────────────────────────────── */
  const handleSendMessage = async (textToSend?: string) => {
    const rawContent = textToSend || inputText;
    let content = rawContent.trim();
    if (selectedFile) {
      content = `📎 File Attachment: ${selectedFile.name} (${selectedFile.size})\n${content}`;
      setSelectedFile(null);
    }

    if (!content || !selectedContact || !registeredUser) return;

    if (editingMessage) {
      sigRef.current?.editMessage(editingMessage.id, selectedContact.id, content);
      setChatMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, text: content, isEdited: true } : m));
      setEditingMessage(null);
      setInputText('');
      return;
    }

    const isAi = selectedContact.id === AI_BOT_USER.id;
    const roomId = isAi ? 'pulse_ai_bot' : [registeredUser.id, selectedContact.id].sort().join('_chat_');
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const msg: ChatMessage = {
      id: msgId,
      roomId,
      sender: { id: registeredUser.id, name: registeredUser.name, avatar: registeredUser.avatar },
      text: content,
      timestamp: Date.now(),
      status: 'sent'
    };

    setChatMessages((prev) => [...prev, msg]);
    setInputText('');

    if (isAi) {
      setIsAiThinking(true);
      const aiReplyText = await askGemini(content, "You are PulseAI Assistant inside SyncPulse Pro.");
      setIsAiThinking(false);

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        roomId: 'pulse_ai_bot',
        sender: { id: AI_BOT_USER.id, name: AI_BOT_USER.name, avatar: AI_BOT_USER.avatar },
        text: aiReplyText,
        timestamp: Date.now(),
        status: 'read'
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } else {
      sigRef.current?.sendDirectMessage(selectedContact.id, content, msgId);
    }
  };

  const handleSendVoiceNote = () => {
    setIsVoiceRecording(false);
    handleSendMessage(`🎵 Voice Note (${recordingSeconds}s)`);
  };

  const handleInlineEnhance = async (mode: 'polish' | 'professional' | 'concise' | 'translate') => {
    if (!inputText.trim()) return;
    setShowAiEnhancerMenu(false);
    setIsAiThinking(true);

    let enhanced = '';
    if (mode === 'polish') enhanced = await rephraseText(inputText.trim(), 'fluent');
    else if (mode === 'professional') enhanced = await rephraseText(inputText.trim(), 'professional');
    else if (mode === 'concise') enhanced = await rephraseText(inputText.trim(), 'concise');
    else if (mode === 'translate') enhanced = await translateText(inputText.trim(), 'Spanish');

    setIsAiThinking(false);
    if (enhanced) setInputText(enhanced);
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!selectedContact || !registeredUser) return;
    setChatMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const existing = m.reactions || [];
        const filtered = existing.filter(r => r.userId !== registeredUser.id);
        return { ...m, reactions: [...filtered, { emoji, userId: registeredUser.id, userName: registeredUser.name }] };
      }
      return m;
    }));

    if (selectedContact.id !== AI_BOT_USER.id) {
      sigRef.current?.reactToMessage(messageId, selectedContact.id, emoji);
    }
  };

  const handleSummarizeChat = async () => {
    if (!selectedContact || !registeredUser) return;
    const dmId = selectedContact.id === AI_BOT_USER.id ? 'pulse_ai_bot' : [registeredUser.id, selectedContact.id].sort().join('_chat_');
    const msgs = chatMessages.filter(m => m.roomId === dmId).map(m => ({ sender: m.sender.name, text: m.text }));
    setIsAiThinking(true);
    const summary = await summarizeChatHistory(msgs);
    setIsAiThinking(false);
    setSummaryModalText(summary);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setSelectedFile({ name: file.name, size: `${sizeMb} MB` });
    }
  };

  const others = onlineUsers.filter((u) => u.id !== registeredUser?.id);
  const contactsList = [AI_BOT_USER, ...others];
  const filteredContacts = contactsList.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const dmRoomId = selectedContact && registeredUser
    ? (selectedContact.id === AI_BOT_USER.id ? 'pulse_ai_bot' : [registeredUser.id, selectedContact.id].sort().join('_chat_'))
    : '';
  const activeChat = chatMessages.filter((m) => m.roomId === dmRoomId);

  const getLastMsg = (c: User) => {
    if (!registeredUser) return undefined;
    const rid = c.id === AI_BOT_USER.id ? 'pulse_ai_bot' : [registeredUser.id, c.id].sort().join('_chat_');
    const msgs = chatMessages.filter((m) => m.roomId === rid);
    return msgs[msgs.length - 1];
  };

  const getUnreadCount = (c: User) => {
    if (!registeredUser) return 0;
    const rid = c.id === AI_BOT_USER.id ? 'pulse_ai_bot' : [registeredUser.id, c.id].sort().join('_chat_');
    return chatMessages.filter((m) => m.roomId === rid && m.sender.id === c.id && m.status !== 'read').length;
  };

  /* ════════════════════════════════════════════════════════════════════════
     LOGIN PAGE — Enterprise SaaS Style
     ════════════════════════════════════════════════════════════════════════ */
  if (!registeredUser) {
    return (
      <div className="h-full w-full flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-app)' }}>
        <form onSubmit={handleRegister} className="relative z-10 w-full max-w-md mx-4 anim-scale" style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, boxShadow: 'var(--shadow)' }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
              <Zap size={28} style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>SyncPulse Pro</h1>
            <p className="text-xs mt-1 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Enterprise WebRTC Calling & AI Communications</p>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Select Avatar Profile</label>
            <div className="flex justify-center gap-3">
              {AVATAR_PRESETS.map((url, i) => (
                <img key={i} src={url} alt="" onClick={() => setSelectedAvatar(url)} className="w-12 h-12 rounded-full object-cover cursor-pointer transition-transform hover:scale-110" style={{ border: selectedAvatar === url ? '3px solid var(--accent)' : '2px solid var(--border)' }} />
              ))}
            </div>
          </div>

          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Display Name</label>
          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Alex Rivera" className="app-input mb-5" required autoFocus />
          <button type="submit" className="app-btn app-btn-primary w-full py-3.5 text-xs font-bold shadow-lg">
            Sign In to Workspace
          </button>
        </form>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     MAIN APP LAYOUT
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="h-full w-full flex flex-col md:flex-row relative overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* 🔔 INCOMING CALL MODAL */}
      {incomingCall && (
        <CallModal
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* 📞 OUTGOING CALL RINGING MODAL */}
      {outgoingCall && !activeRoomId && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute -inset-3 rounded-full bg-indigo-500/30 animate-ping" />
              <img
                src={outgoingCall.target.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`}
                alt={outgoingCall.target.name}
                className="relative w-24 h-24 rounded-full border-4 border-indigo-500/50 shadow-2xl object-cover"
              />
            </div>
            <h3 className="text-xl font-bold text-slate-100">{outgoingCall.target.name}</h3>
            <p className="text-xs text-indigo-400 mt-2 font-semibold flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Calling ({outgoingCall.isVideo ? 'Video' : 'Voice'})...
            </p>

            <button
              onClick={leaveCall}
              className="mt-8 flex flex-col items-center gap-1.5 group"
            >
              <div className="p-4 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 group-hover:bg-red-600 group-hover:text-white transition-all duration-200 group-hover:scale-110 shadow-lg">
                <PhoneOff size={24} />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-200">End Call</span>
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ BUSY NOTICE TOAST */}
      {busyNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 backdrop-blur-md text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <PhoneOff size={16} /> {busyNotice}
        </div>
      )}

      {/* 🎥 ACTIVE CALL STUDIO SCREEN */}
      {activeRoomId ? (
        <div className="h-full w-full flex flex-col relative z-40" style={{ background: 'var(--bg-app)' }}>
          {/* Header Bar */}
          <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl" style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <span className="w-2.5 h-2.5 rounded-full anim-pulse" style={{ background: 'var(--green)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{activeRoomId}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {participants.length + 1} connected</span>
            </div>
            <div className="pointer-events-auto">
              <NetworkQualityBadge quality={networkQuality.quality} rttMs={networkQuality.rttMs} bitrateKbps={networkQuality.bitrateKbps} />
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-24">
            <VideoGrid
              localStream={localStream}
              localUser={{ name: registeredUser.name, avatar: registeredUser.avatar }}
              localMediaState={{ audio: !isAudioMuted, video: !isVideoMuted }}
              remoteStreams={remoteStreams}
              participants={participants}
              screenStream={screenStream}
            />
          </div>

          {/* Floating Control Bar */}
          <ControlBar
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            isScreenSharing={isScreenSharing}
            isChatOpen={isChatOpen}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreen}
            onToggleChat={() => setIsChatOpen((v) => !v)}
            onEndCall={leaveCall}
          />
        </div>
      ) : (
        <>
          {/* ─── DESKTOP LEFT SIDEBAR ─────────────────────────────────────── */}
          <aside className="hidden md:flex w-[72px] shrink-0 flex-col items-center py-4 gap-1" style={{ background: 'var(--bg-app)', borderRight: '1px solid var(--border)' }}>
            <div className="mb-4 relative">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg" style={{ background: 'var(--accent)' }}>
                <Zap size={22} />
              </div>
            </div>

            {([
              { key: 'chats' as Screen, icon: MessageSquare, label: 'Chats' },
              { key: 'calls' as Screen, icon: PhoneCall, label: 'Calls' },
              { key: 'ai-studio' as Screen, icon: Wand2, label: 'AI Studio' },
              { key: 'profile' as Screen, icon: UserIcon, label: 'Profile' },
              { key: 'settings' as Screen, icon: Settings, label: 'Settings' },
            ]).map((nav) => {
              const active = screen === nav.key;
              return (
                <button key={nav.key} onClick={() => { setScreen(nav.key); if (nav.key !== 'chats') setSelectedContact(null); }}
                  className="relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
                  title={nav.label}
                  style={{
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />}
                  <nav.icon size={19} />
                  <span className="text-[9px] font-medium">{nav.label}</span>
                </button>
              );
            })}

            <div className="flex-1" />

            <div className="relative mb-2 cursor-pointer" onClick={() => setScreen('profile')}>
              <img src={registeredUser.avatar} alt="" className="w-9 h-9 rounded-full object-cover" style={{ border: '2px solid var(--border)' }} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: 'var(--green)', border: '2px solid var(--bg-app)' }} />
            </div>

            <button onClick={() => window.location.reload()} className="app-btn app-btn-ghost w-10 h-10 rounded-xl" title="Logout" style={{ color: 'var(--text-muted)' }}>
              <LogOut size={16} />
            </button>
          </aside>

          {/* ─── SUB-PAGE 1: CHATS ────────────────────────────────────────── */}
          {screen === 'chats' && (
            <div className="flex-1 flex h-full overflow-hidden">
              <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col shrink-0 h-full`} style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}>
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Messages</h2>
                  </div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="app-input pl-9 !rounded-full !py-2 text-[13px]" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredContacts.map((c) => {
                    const isSel = selectedContact?.id === c.id;
                    const last = getLastMsg(c);
                    const unread = getUnreadCount(c);
                    const isAi = c.id === AI_BOT_USER.id;

                    return (
                      <div key={c.id} onClick={() => setSelectedContact(c)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b"
                        style={{ background: isSel ? 'var(--bg-active)' : 'transparent', borderColor: 'var(--border)' }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                        <div className="relative shrink-0">
                          <img src={c.avatar} alt="" className="w-11 h-11 rounded-full object-cover" style={{ border: isAi ? '2px solid var(--accent)' : '2px solid var(--border)' }} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{
                            background: isAi ? 'var(--accent)' : (c.status === 'online' ? 'var(--green)' : 'var(--text-muted)'),
                            border: '2px solid var(--bg-sidebar)'
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold truncate flex items-center gap-1" style={{ color: isAi ? 'var(--accent)' : 'var(--text-primary)' }}>
                              {c.name} {isAi && <Sparkles size={12} />}
                            </span>
                            {last && <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[12px] truncate pr-2" style={{ color: 'var(--text-muted)' }}>
                              {last ? (last.isEdited ? `${last.text} (edited)` : last.text) : (isAi ? 'Ask PulseAI anything...' : 'Tap to open chat')}
                            </p>
                            {unread > 0 && (
                              <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white shrink-0" style={{ background: 'var(--accent)' }}>
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedContact ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 md:px-5 h-16 shrink-0" style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedContact(null)} className="md:hidden app-btn app-btn-ghost w-8 h-8 rounded-full p-0 flex items-center justify-center">
                        <ArrowLeft size={18} />
                      </button>
                      <img src={selectedContact.avatar} alt="" className="w-9 h-9 rounded-full object-cover" style={{ border: '2px solid var(--border)' }} />
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                          {selectedContact.name}
                        </h4>
                        <span className="text-[11px]" style={{ color: 'var(--green)' }}>Online</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={handleSummarizeChat} className="app-btn app-btn-ghost text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <Bot size={15} /> <span className="hidden sm:inline">Summarize</span>
                      </button>
                      {selectedContact.id !== AI_BOT_USER.id && (
                        <>
                          <button onClick={() => startCall(selectedContact, false)} className="app-btn app-btn-ghost w-9 h-9 rounded-full" title="Voice Call"><Phone size={17} style={{ color: 'var(--green)' }} /></button>
                          <button onClick={() => startCall(selectedContact, true)} className="app-btn app-btn-ghost w-9 h-9 rounded-full" style={{ color: 'var(--accent)' }} title="Video Call"><Video size={17} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pinned Message Banner */}
                  {pinnedMessage && (
                    <div className="px-4 py-2 flex items-center justify-between text-xs shrink-0" style={{ background: 'var(--accent-dim)', borderBottom: '1px solid var(--accent)' }}>
                      <div className="flex items-center gap-2 truncate" style={{ color: 'var(--accent)' }}>
                        <Pin size={13} /> Pinned: <span className="truncate">{pinnedMessage.text}</span>
                      </div>
                      <button onClick={() => setPinnedMessage(null)} className="p-0.5 rounded-full hover:bg-black/20"><X size={13} /></button>
                    </div>
                  )}

                  {/* Chat Thread */}
                  <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-2">
                    {activeChat.map((msg) => {
                      const isMe = msg.sender.id === registeredUser.id;
                      const emojiOnly = isOnlyEmoji(msg.text);

                      return (
                        <div key={msg.id} className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'} anim-slide-up my-1`}>
                          <div className={`absolute -top-3 ${isMe ? 'right-2' : 'left-2'} hidden group-hover:flex items-center gap-1 z-30 px-2 py-0.5 rounded-full shadow-md`} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                            {EMOJI_REACTIONS.slice(0, 4).map(emoji => (
                              <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="text-xs hover:scale-125 transition-transform px-0.5">
                                {emoji}
                              </button>
                            ))}
                            <button onClick={() => setPinnedMessage(msg)} className="p-0.5 rounded-full text-xs ml-1" style={{ color: 'var(--text-muted)' }} title="Pin Message">
                              <Pin size={11} />
                            </button>
                            {isMe && (
                              <button onClick={() => { setEditingMessage(msg); setInputText(msg.text); }} className="p-0.5 rounded-full text-xs ml-1" style={{ color: 'var(--accent)' }} title="Edit">
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>

                          {emojiOnly ? (
                            <div className="text-5xl py-1 my-1 select-none anim-scale">{msg.text}</div>
                          ) : (
                            <div className="max-w-[80%] md:max-w-[70%] px-3.5 py-2 text-[13px] leading-relaxed relative" style={{
                              background: isMe ? 'var(--bubble-out)' : 'var(--bubble-in)',
                              color: 'var(--text-primary)',
                              borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            }}>
                              <p className="break-words whitespace-pre-line">{msg.text}</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {msg.isEdited && <span className="italic mr-1">(edited)</span>}
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && (
                                  <span style={{ color: msg.status === 'read' ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    {msg.status === 'read' ? <CheckCheck size={13} /> : <Check size={13} />}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isAiThinking && (
                      <div className="flex justify-start anim-fade">
                        <div className="px-4 py-2 rounded-2xl text-xs flex items-center gap-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
                          <Sparkles size={15} className="animate-spin" /> PulseAI is thinking...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* File Attachment Preview Bar */}
                  {selectedFile && (
                    <div className="px-4 py-2 flex items-center justify-between text-xs shrink-0" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                        <File size={14} /> Attached: {selectedFile.name} ({selectedFile.size})
                      </div>
                      <button onClick={() => setSelectedFile(null)} className="p-0.5 rounded-full hover:bg-white/10"><X size={14} /></button>
                    </div>
                  )}

                  {/* Smart Quick Replies */}
                  {smartReplies.length > 0 && !editingMessage && (
                    <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0" style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)' }}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <Sparkles size={11} /> Quick
                      </span>
                      {smartReplies.map((reply, i) => (
                        <button key={i} onClick={() => handleSendMessage(reply)} className="text-[11px] px-3 py-1 rounded-full shrink-0 transition-all hover:scale-105" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Floating AI Input Enhancer Popup */}
                  {showAiEnhancerMenu && (
                    <div className="mx-4 mb-2 p-2 rounded-2xl flex flex-wrap items-center gap-2 anim-slide-up shadow-xl z-30" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <Sparkles size={13} /> AI Enhancer
                      </span>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInlineEnhance('polish'); }} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 transition-all" style={{ color: 'var(--text-primary)' }}>
                        <Wand2 size={13} style={{ color: 'var(--accent)' }} /> Fix Grammar
                      </button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInlineEnhance('professional'); }} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 transition-all" style={{ color: 'var(--text-primary)' }}>
                        <ShieldCheck size={13} style={{ color: 'var(--green)' }} /> Professional
                      </button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInlineEnhance('concise'); }} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 transition-all" style={{ color: 'var(--text-primary)' }}>
                        <Zap size={13} style={{ color: 'var(--orange)' }} /> Make Short
                      </button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInlineEnhance('translate'); }} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 transition-all" style={{ color: 'var(--text-primary)' }}>
                        <Globe2 size={13} style={{ color: 'var(--purple)' }} /> Translate (ES)
                      </button>
                      <button type="button" onClick={() => setShowAiEnhancerMenu(false)} className="ml-auto p-1 rounded-full text-xs hover:bg-white/10"><X size={14} /></button>
                    </div>
                  )}

                  {/* Input Bar */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="px-3 md:px-4 py-3 flex items-center gap-2 shrink-0" style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)' }}>
                    {isVoiceRecording ? (
                      <div className="flex-1 flex items-center justify-between px-4 py-2 rounded-full anim-fade" style={{ background: 'var(--red-dim)', border: '1px solid var(--red)' }}>
                        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--red)' }}>
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 anim-pulse" /> Recording Voice Note... {recordingSeconds}s
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setIsVoiceRecording(false)} className="text-xs text-muted-foreground px-2 py-1">Cancel</button>
                          <button type="button" onClick={handleSendVoiceNote} className="app-btn px-3 py-1 text-xs text-white" style={{ background: 'var(--red)' }}>Send</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="app-btn app-btn-ghost w-9 h-9 rounded-full shrink-0 p-0 flex items-center justify-center" title="Attach File">
                          <File size={18} />
                        </button>

                        <button type="button" onClick={() => setShowAiEnhancerMenu(!showAiEnhancerMenu)} className="app-btn app-btn-ghost w-9 h-9 rounded-full shrink-0 p-0 flex items-center justify-center" style={{ color: 'var(--accent)', background: showAiEnhancerMenu ? 'var(--accent-dim)' : 'transparent' }} title="✨ AI Input Enhancer">
                          <Sparkles size={18} />
                        </button>

                        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Message ${selectedContact.name}...`} className="app-input !rounded-full flex-1" autoComplete="off" />

                        <button type="button" onClick={() => setIsVoiceRecording(true)} className="app-btn app-btn-ghost w-9 h-9 rounded-full shrink-0 p-0 flex items-center justify-center" title="Record Voice Note">
                          <Mic size={18} />
                        </button>

                        <button type="submit" disabled={!inputText.trim() && !selectedFile} className="app-btn app-btn-primary w-9 h-9 rounded-full shrink-0 disabled:opacity-30 p-0 flex items-center justify-center">
                          <Send size={16} />
                        </button>
                      </>
                    )}
                  </form>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center anim-fade" style={{ background: 'var(--bg-main)' }}>
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
                    <MessageSquare size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>SyncPulse Pro Workspace</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Select a contact or PulseAI to start chatting</p>
                </div>
              )}
            </div>
          )}

          {/* SUB-PAGE 2: CALLS */}
          {screen === 'calls' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <PhoneCall size={18} style={{ color: 'var(--accent)' }} /> WebRTC Video Calling Studio
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <div className="p-6 rounded-3xl space-y-4 shadow-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <label className="text-[11px] font-bold uppercase tracking-widest block flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                    <Hash size={14} /> Join Instant Group Room
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={groupRoomInput} onChange={(e) => setGroupRoomInput(e.target.value)} placeholder="e.g. engineering-sync" className="app-input flex-1 !rounded-2xl" />
                    <button onClick={() => joinGroup(true)} disabled={!groupRoomInput.trim()} className="app-btn app-btn-primary px-6 py-3 !rounded-2xl text-xs font-bold disabled:opacity-30">
                      <Video size={16} /> Join Video Studio
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Users size={14} style={{ color: 'var(--accent)' }} /> Online Users Ready to Call ({others.length})
                  </h3>
                  {others.length === 0 ? (
                    <div className="p-8 rounded-2xl text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <Users size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>No other users online right now</p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Open another browser tab or share the URL to call a peer!</p>
                    </div>
                  ) : (
                    others.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl mb-3 shadow-md transition-all hover:scale-[1.01]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-3">
                          <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid var(--accent)' }} />
                          <div>
                            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.name}</h4>
                            <span className="text-[11px] font-medium" style={{ color: 'var(--green)' }}>● Active Online</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startCall(u, false)} className="app-btn app-btn-ghost px-4 py-2.5 rounded-xl border" style={{ color: 'var(--green)', borderColor: 'var(--green-dim)' }} title="Voice Call">
                            <Phone size={16} /> <span className="hidden sm:inline text-xs">Voice Call</span>
                          </button>
                          <button onClick={() => startCall(u, true)} className="app-btn app-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold" title="Video Call">
                            <Video size={16} /> <span className="hidden sm:inline text-xs">Video Call</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-PAGE 3: AI STUDIO */}
          {screen === 'ai-studio' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Wand2 size={18} style={{ color: 'var(--accent)' }} /> AI Studio Workspace
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="p-6 rounded-3xl space-y-4 shadow-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Wand2 size={16} style={{ color: 'var(--accent)' }} /> Magic Message Polisher
                    </h3>
                    <textarea rows={3} value={aiPolishInput} onChange={(e) => setAiPolishInput(e.target.value)} placeholder="Draft rough text here..." className="app-input text-xs resize-none" />
                    <button onClick={async () => {
                      if (!aiPolishInput.trim()) return;
                      setIsAiThinking(true);
                      const res = await rephraseText(aiPolishInput, aiPolishStyle);
                      setIsAiThinking(false);
                      setAiPolishOutput(res);
                    }} disabled={!aiPolishInput.trim()} className="app-btn app-btn-primary px-5 py-2.5 text-xs font-bold">
                      Rephrase Text
                    </button>
                    {aiPolishOutput && (
                      <div className="p-4 rounded-2xl text-xs leading-relaxed" style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)', border: '1px solid var(--accent)' }}>
                        {aiPolishOutput}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-PAGE 4: PROFILE */}
          {screen === 'profile' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <UserIcon size={18} style={{ color: 'var(--accent)' }} /> User Profile
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl mx-auto p-8 rounded-3xl flex items-center gap-6 shadow-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <img src={registeredUser.avatar} alt="" className="w-24 h-24 rounded-full object-cover" style={{ border: '4px solid var(--accent)' }} />
                  <div>
                    <h3 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{registeredUser.name}</h3>
                    <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{userBio}</p>
                    <span className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--accent)' }}>
                      WebRTC Pro Member
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-PAGE 5: SETTINGS */}
          {screen === 'settings' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Settings size={18} style={{ color: 'var(--accent)' }} /> Settings & Preferences
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-2xl mx-auto w-full">
                <div className="p-6 rounded-3xl space-y-4 shadow-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Appearance Theme</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {THEMES.map((t) => (
                      <button key={t.key} onClick={() => setTheme(t.key)} className="flex flex-col items-center gap-2 p-3.5 rounded-2xl transition-all hover:scale-105" style={{ background: theme === t.key ? 'var(--accent-dim)' : 'var(--bg-elevated)', border: `2px solid ${theme === t.key ? 'var(--accent)' : 'transparent'}` }}>
                        <div className="w-7 h-7 rounded-full shadow-md" style={{ background: t.dot }} />
                        <span className="text-[11px] font-bold" style={{ color: theme === t.key ? 'var(--accent)' : 'var(--text-muted)' }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MOBILE NAV */}
          <nav className="md:hidden flex items-center justify-around h-14 shrink-0" style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)' }}>
            {([
              { key: 'chats' as Screen, icon: MessageSquare, label: 'Chats' },
              { key: 'calls' as Screen, icon: PhoneCall, label: 'Calls' },
              { key: 'ai-studio' as Screen, icon: Wand2, label: 'AI Studio' },
              { key: 'profile' as Screen, icon: UserIcon, label: 'Profile' },
              { key: 'settings' as Screen, icon: Settings, label: 'Settings' },
            ]).map((nav) => {
              const active = screen === nav.key;
              return (
                <button key={nav.key} onClick={() => { setScreen(nav.key); if (nav.key !== 'chats') setSelectedContact(null); }} className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <nav.icon size={18} />
                  <span className="text-[9px] font-semibold">{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
