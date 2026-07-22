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
  X, Sparkles, Hash, Edit2, Bot, Wand2, Globe2, ShieldCheck,
  Pin, File, PhoneCall, User as UserIcon, UserPlus, UserCheck, UserX, UserSearch,
  Plus, Radio, Activity, Volume2
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
  { key: 'slate', label: 'Slate Dark', dot: '#3b82f6' },
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
  const [userBio, setUserBio] = useState('Senior WebRTC & Full-Stack Engineer.');
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  type Screen = 'chats' | 'calls' | 'friends' | 'ai-studio' | 'profile' | 'settings';
  const [screen, setScreen] = useState<Screen>('chats');
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Friend Request State
  const [friends, setFriends] = useState<string[]>([]); // Array of friend user IDs
  const [friendRequests, setFriendRequests] = useState<User[]>([]); // Incoming pending friend requests
  const [sentRequests, setSentRequests] = useState<string[]>([]); // Sent request user IDs
  const [friendsTab, setFriendsTab] = useState<'friends' | 'requests' | 'find'>('friends');

  const [theme, setTheme] = useState<ThemeKey>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('pulse_theme') as ThemeKey) || 'slate';
    return 'slate';
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

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
  const [showInviteModal, setShowInviteModal] = useState(false);

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

  // File & Voice Note State
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [summaryModalText, setSummaryModalText] = useState<string | null>(null);
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

    // 🤝 Friend Request Listeners
    sig.on('friend:request', ({ from }) => {
      setFriendRequests((prev) => {
        if (prev.some(u => u.id === from.id)) return prev;
        return [...prev, from];
      });
      if (soundEnabled) playSound('message');
    });

    sig.on('friend:accept', ({ from }) => {
      setFriends((prev) => Array.from(new Set([...prev, from.id])));
      setSentRequests((prev) => prev.filter(id => id !== from.id));
      setBusyNotice(`${from.name} accepted your friend request!`);
      setTimeout(() => setBusyNotice(null), 4000);
    });

    sig.on('friend:reject', ({ fromUserId }) => {
      setSentRequests((prev) => prev.filter(id => id !== fromUserId));
    });

    // 📞 In-call Invite Listener
    sig.on('call:invite', ({ roomId, inviter, isVideo }) => {
      setIncomingCall({ roomId, caller: inviter, isVideo, callType: 'group' });
      if (soundEnabled) playSound('ring');
    });

    return () => { pm.closeAll(); sig.disconnect(); };
  }, [soundEnabled]);

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

  /* ── User Registration ─────────────────────────────────────────── */
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    const id = `u_${Math.random().toString(36).substring(2, 9)}`;
    sigRef.current?.connect();
    sigRef.current?.register({ id, name: userName.trim(), avatar: selectedAvatar });
  };

  /* ── Friend Request Actions ───────────────────────────────────────── */
  const sendFriendRequest = (targetUser: User) => {
    sigRef.current?.sendFriendRequest(targetUser.id);
    setSentRequests((prev) => Array.from(new Set([...prev, targetUser.id])));
    setBusyNotice(`Friend request sent to ${targetUser.name}!`);
    setTimeout(() => setBusyNotice(null), 3500);
  };

  const acceptFriendRequest = (targetUser: User) => {
    sigRef.current?.acceptFriendRequest(targetUser.id);
    setFriends((prev) => Array.from(new Set([...prev, targetUser.id])));
    setFriendRequests((prev) => prev.filter((u) => u.id !== targetUser.id));
    setBusyNotice(`You are now friends with ${targetUser.name}!`);
    setTimeout(() => setBusyNotice(null), 3500);
  };

  const rejectFriendRequest = (targetUser: User) => {
    sigRef.current?.rejectFriendRequest(targetUser.id);
    setFriendRequests((prev) => prev.filter((u) => u.id !== targetUser.id));
  };

  const isFriend = (userId: string) => userId === AI_BOT_USER.id || friends.includes(userId);

  /* ── WebRTC Calling Actions ──────────────────────────────────────────── */
  const startCall = async (target: User, isVideo: boolean) => {
    if (target.id === AI_BOT_USER.id) {
      alert("PulseAI Assistant cannot join direct voice calls.");
      return;
    }
    if (!isFriend(target.id)) {
      alert(`You must be friends with ${target.name} before initiating a call.`);
      return;
    }
    const roomId = `room_${Date.now()}`;
    setOutgoingCall({ target, isVideo, roomId });
    if (soundEnabled) playSound('dial');
    await pmRef.current?.acquireLocalMedia(true, isVideo);
    sigRef.current?.joinRoom(roomId, isVideo);
    sigRef.current?.initiateCall(roomId, target.id, isVideo, '1:1');
    setActiveRoomId(roomId);
  };

  const joinGroup = async (isVideo = true) => {
    if (!groupRoomInput.trim()) return;
    await pmRef.current?.acquireLocalMedia(true, isVideo);
    sigRef.current?.joinRoom(groupRoomInput.trim(), isVideo);
    setActiveRoomId(groupRoomInput.trim());
  };

  const inviteUserToCall = (targetUser: User) => {
    if (!activeRoomId) return;
    sigRef.current?.inviteToCall(targetUser.id, activeRoomId, true);
    setBusyNotice(`Call invitation sent to ${targetUser.name}!`);
    setTimeout(() => setBusyNotice(null), 3500);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    await pmRef.current?.acquireLocalMedia(true, incomingCall.isVideo);
    sigRef.current?.joinRoom(incomingCall.roomId, incomingCall.isVideo);
    sigRef.current?.acceptCall(incomingCall.roomId);
    setActiveRoomId(incomingCall.roomId);
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
    setShowInviteModal(false);
  };

  /* FIXED MIC & CAMERA TOGGLES */
  const toggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    pmRef.current?.setAudioMuted(nextMuted);
    if (activeRoomId) {
      sigRef.current?.toggleMedia(activeRoomId, { audio: !nextMuted });
    }
  };

  const toggleVideo = () => {
    const nextMuted = !isVideoMuted;
    setIsVideoMuted(nextMuted);
    pmRef.current?.setVideoMuted(nextMuted);
    if (activeRoomId) {
      sigRef.current?.toggleMedia(activeRoomId, { video: !nextMuted });
    }
  };

  const toggleScreen = async () => {
    if (!isScreenSharing) {
      const s = await pmRef.current?.startScreenShare();
      if (s) {
        setIsScreenSharing(true);
        setScreenStream(s);
      }
    } else {
      await pmRef.current?.stopScreenShare();
      setIsScreenSharing(false);
      setScreenStream(null);
    }
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

    if (selectedContact.id !== AI_BOT_USER.id && !isFriend(selectedContact.id)) {
      alert(`Send a friend request to ${selectedContact.name} to start messaging.`);
      return;
    }

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
  const friendObjects = others.filter((u) => friends.includes(u.id));
  const contactsList = [AI_BOT_USER, ...friendObjects];
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
     SIGN IN PAGE
     ════════════════════════════════════════════════════════════════════════ */
  if (!registeredUser) {
    return (
      <div className="h-full w-full flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-app)' }}>
        {/* Ambient Glow Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'var(--accent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'var(--purple)' }} />

        <form onSubmit={handleRegister} className="relative z-10 w-full max-w-md mx-4 anim-scale glass-panel rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-2xl anim-glow" style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
              <Zap size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>SyncPulse Pro</h1>
            <p className="text-xs mt-1 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Enterprise WebRTC Video Calling & AI Network</p>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-3 text-center" style={{ color: 'var(--text-muted)' }}>Choose Profile Avatar</label>
            <div className="flex justify-center gap-3">
              {AVATAR_PRESETS.map((url, i) => (
                <img key={i} src={url} alt="" onClick={() => setSelectedAvatar(url)} className="w-12 h-12 rounded-full object-cover cursor-pointer transition-all hover:scale-115 shadow-md" style={{ border: selectedAvatar === url ? '3px solid var(--accent)' : '2px solid var(--border)' }} />
              ))}
            </div>
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Your Display Name</label>
          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Alex Rivera" className="app-input mb-6 !rounded-2xl !py-3.5" required autoFocus />
          <button type="submit" className="app-btn app-btn-primary w-full py-4 text-xs font-bold shadow-xl !rounded-2xl">
            Enter Workspace
          </button>
        </form>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     MAIN APPLICATION SHELL
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

      {/* 📞 OUTGOING RINGING MODAL */}
      {outgoingCall && !activeRoomId && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-indigo-500/30 animate-ping" />
              <img
                src={outgoingCall.target.avatar || AVATAR_PRESETS[0]}
                alt={outgoingCall.target.name}
                className="relative w-24 h-24 rounded-full border-4 border-indigo-500/60 shadow-2xl object-cover"
              />
            </div>
            <h3 className="text-xl font-bold text-slate-100">{outgoingCall.target.name}</h3>
            <p className="text-xs text-indigo-400 mt-2 font-semibold flex items-center gap-2 justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
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

      {/* ⚠️ NOTIFICATION TOAST BANNER */}
      {busyNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 backdrop-blur-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <Activity size={16} className="text-indigo-400 animate-pulse" /> {busyNotice}
        </div>
      )}

      {/* 🎥 ACTIVE CALL STUDIO SCREEN */}
      {activeRoomId ? (
        <div className="h-full w-full flex flex-col relative z-40" style={{ background: 'var(--bg-app)' }}>
          {/* Header Bar */}
          <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-2xl" style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <span className="w-3 h-3 rounded-full anim-pulse" style={{ background: 'var(--green)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{activeRoomId}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>· {participants.length + 1} connected</span>

              {/* In-Call Invite Button */}
              <button onClick={() => setShowInviteModal(true)} className="ml-2 app-btn app-btn-primary px-3 py-1 text-[11px] font-bold !rounded-full">
                <UserPlus size={13} /> Invite Online User
              </button>
            </div>
            <div className="pointer-events-auto">
              <NetworkQualityBadge quality={networkQuality.quality} rttMs={networkQuality.rttMs} bitrateKbps={networkQuality.bitrateKbps} />
            </div>
          </div>

          {/* In-Call Invite Users Modal Overlay */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserPlus size={18} className="text-indigo-400" /> Invite Users to Active Call
                  </h3>
                  <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-800"><X size={18} /></button>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {others.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No other users online right now.</p>
                  ) : (
                    others.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                          <span className="text-xs font-semibold text-white">{u.name}</span>
                        </div>
                        <button onClick={() => inviteUserToCall(u)} className="app-btn app-btn-primary px-3 py-1.5 text-xs">
                          Invite
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

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
          <aside className="hidden md:flex w-20 shrink-0 flex-col items-center py-5 gap-2" style={{ background: 'var(--bg-app)', borderRight: '1px solid var(--border)' }}>
            <div className="mb-6 relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl anim-glow" style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
                <Zap size={24} />
              </div>
            </div>

            {([
              { key: 'chats' as Screen, icon: MessageSquare, label: 'Chats' },
              { key: 'calls' as Screen, icon: PhoneCall, label: 'Calls' },
              { key: 'friends' as Screen, icon: Users, label: 'Friends' },
              { key: 'ai-studio' as Screen, icon: Wand2, label: 'AI Studio' },
              { key: 'profile' as Screen, icon: UserIcon, label: 'Profile' },
              { key: 'settings' as Screen, icon: Settings, label: 'Settings' },
            ]).map((nav) => {
              const active = screen === nav.key;
              return (
                <button key={nav.key} onClick={() => { setScreen(nav.key); if (nav.key !== 'chats') setSelectedContact(null); }}
                  className="relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
                  title={nav.label}
                  style={{
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 rounded-r-full" style={{ background: 'var(--accent)' }} />}
                  <nav.icon size={21} />
                  <span className="text-[9px] font-bold">{nav.label}</span>
                </button>
              );
            })}

            <div className="flex-1" />

            <div className="relative mb-3 cursor-pointer" onClick={() => setScreen('profile')}>
              <img src={registeredUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid var(--accent)' }} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" style={{ background: 'var(--green)', border: '2px solid var(--bg-app)' }} />
            </div>

            <button onClick={() => window.location.reload()} className="app-btn app-btn-ghost w-10 h-10 rounded-xl" title="Logout" style={{ color: 'var(--text-muted)' }}>
              <LogOut size={18} />
            </button>
          </aside>

          {/* ─── SUB-PAGE 1: CHATS ────────────────────────────────────────── */}
          {screen === 'chats' && (
            <div className="flex-1 flex h-full overflow-hidden">
              <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-84 flex-col shrink-0 h-full`} style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}>
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Messages</h2>
                  </div>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="app-input pl-10 !rounded-full !py-2.5 text-[13px]" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-0.5 px-2">
                  {filteredContacts.map((c) => {
                    const isSel = selectedContact?.id === c.id;
                    const last = getLastMsg(c);
                    const unread = getUnreadCount(c);
                    const isAi = c.id === AI_BOT_USER.id;

                    return (
                      <div key={c.id} onClick={() => setSelectedContact(c)}
                        className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl cursor-pointer transition-all my-0.5"
                        style={{ background: isSel ? 'var(--bg-active)' : 'transparent' }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                        <div className="relative shrink-0">
                          <img src={c.avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: isAi ? '2px solid var(--accent)' : '2px solid var(--border)' }} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" style={{
                            background: isAi ? 'var(--accent)' : 'var(--green)',
                            border: '2px solid var(--bg-sidebar)'
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold truncate flex items-center gap-1" style={{ color: isAi ? 'var(--accent)' : 'var(--text-primary)' }}>
                              {c.name} {isAi && <Sparkles size={13} />}
                            </span>
                            {last && <span className="text-[10px] shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>{new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[12px] truncate pr-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                              {last ? (last.isEdited ? `${last.text} (edited)` : last.text) : (isAi ? 'Ask PulseAI anything...' : 'Tap to open chat')}
                            </p>
                            {unread > 0 && (
                              <span className="w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center text-white shrink-0 shadow-md" style={{ background: 'var(--accent)' }}>
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
                  <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedContact(null)} className="md:hidden app-btn app-btn-ghost w-8 h-8 rounded-full p-0 flex items-center justify-center">
                        <ArrowLeft size={18} />
                      </button>
                      <img src={selectedContact.avatar} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid var(--border)' }} />
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                          {selectedContact.name}
                        </h4>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--green)' }}>Active Online</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={handleSummarizeChat} className="app-btn app-btn-ghost text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                        <Bot size={15} /> <span className="hidden sm:inline">Summarize</span>
                      </button>
                      {selectedContact.id !== AI_BOT_USER.id && (
                        <>
                          <button onClick={() => startCall(selectedContact, false)} className="app-btn app-btn-ghost w-9 h-9 rounded-full" title="Voice Call"><Phone size={18} style={{ color: 'var(--green)' }} /></button>
                          <button onClick={() => startCall(selectedContact, true)} className="app-btn app-btn-ghost w-9 h-9 rounded-full" style={{ color: 'var(--accent)' }} title="Video Call"><Video size={18} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pinned Message Banner */}
                  {pinnedMessage && (
                    <div className="px-5 py-2.5 flex items-center justify-between text-xs shrink-0" style={{ background: 'var(--accent-dim)', borderBottom: '1px solid var(--accent)' }}>
                      <div className="flex items-center gap-2 truncate font-medium" style={{ color: 'var(--accent)' }}>
                        <Pin size={14} /> Pinned: <span className="truncate">{pinnedMessage.text}</span>
                      </div>
                      <button onClick={() => setPinnedMessage(null)} className="p-1 rounded-full hover:bg-black/20"><X size={14} /></button>
                    </div>
                  )}

                  {/* Chat Thread */}
                  <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
                    {activeChat.map((msg) => {
                      const isMe = msg.sender.id === registeredUser.id;
                      const emojiOnly = isOnlyEmoji(msg.text);

                      return (
                        <div key={msg.id} className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'} anim-slide-up my-1`}>
                          <div className={`absolute -top-4 ${isMe ? 'right-2' : 'left-2'} hidden group-hover:flex items-center gap-1 z-30 px-2 py-1 rounded-full shadow-lg`} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            {EMOJI_REACTIONS.slice(0, 4).map(emoji => (
                              <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="text-xs hover:scale-130 transition-transform px-0.5">
                                {emoji}
                              </button>
                            ))}
                            <button onClick={() => setPinnedMessage(msg)} className="p-0.5 rounded-full text-xs ml-1" style={{ color: 'var(--text-muted)' }} title="Pin">
                              <Pin size={12} />
                            </button>
                            {isMe && (
                              <button onClick={() => { setEditingMessage(msg); setInputText(msg.text); }} className="p-0.5 rounded-full text-xs ml-1" style={{ color: 'var(--accent)' }} title="Edit">
                                <Edit2 size={12} />
                              </button>
                            )}
                          </div>

                          {emojiOnly ? (
                            <div className="text-5xl py-1 my-1 select-none anim-scale">{msg.text}</div>
                          ) : (
                            <div className="max-w-[80%] md:max-w-[70%] px-4 py-2.5 text-[13px] leading-relaxed relative shadow-md" style={{
                              background: isMe ? 'var(--bubble-out)' : 'var(--bubble-in)',
                              color: 'var(--text-primary)',
                              borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            }}>
                              <p className="break-words whitespace-pre-line font-normal">{msg.text}</p>
                              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                                {msg.isEdited && <span className="italic mr-1">(edited)</span>}
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && (
                                  <span style={{ color: msg.status === 'read' ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    {msg.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />}
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
                        <div className="px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 font-semibold shadow-md" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
                          <Sparkles size={16} className="animate-spin" /> PulseAI is processing...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Bar */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="px-4 py-3 flex items-center gap-2 shrink-0" style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)' }}>
                    {isVoiceRecording ? (
                      <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-full anim-fade" style={{ background: 'var(--red-dim)', border: '1px solid var(--red)' }}>
                        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--red)' }}>
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 anim-pulse" /> Recording Voice Note... {recordingSeconds}s
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setIsVoiceRecording(false)} className="text-xs text-muted-foreground px-2 py-1 font-semibold">Cancel</button>
                          <button type="button" onClick={handleSendVoiceNote} className="app-btn px-4 py-1.5 text-xs text-white shadow-md" style={{ background: 'var(--red)' }}>Send</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="app-btn app-btn-ghost w-10 h-10 rounded-full shrink-0 p-0 flex items-center justify-center" title="Attach File">
                          <File size={19} />
                        </button>

                        <button type="button" onClick={() => setShowAiEnhancerMenu(!showAiEnhancerMenu)} className="app-btn app-btn-ghost w-10 h-10 rounded-full shrink-0 p-0 flex items-center justify-center" style={{ color: 'var(--accent)', background: showAiEnhancerMenu ? 'var(--accent-dim)' : 'transparent' }} title="✨ AI Input Enhancer">
                          <Sparkles size={19} />
                        </button>

                        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Message ${selectedContact.name}...`} className="app-input !rounded-full flex-1" autoComplete="off" />

                        <button type="button" onClick={() => setIsVoiceRecording(true)} className="app-btn app-btn-ghost w-10 h-10 rounded-full shrink-0 p-0 flex items-center justify-center" title="Record Voice Note">
                          <Mic size={19} />
                        </button>

                        <button type="submit" disabled={!inputText.trim() && !selectedFile} className="app-btn app-btn-primary w-10 h-10 !rounded-full shrink-0 disabled:opacity-30 p-0 flex items-center justify-center shadow-lg">
                          <Send size={17} />
                        </button>
                      </>
                    )}
                  </form>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center anim-fade" style={{ background: 'var(--bg-main)' }}>
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-2xl anim-glow" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
                    <MessageSquare size={36} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>SyncPulse Pro Network</h3>
                  <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>Select a friend or PulseAI to start chatting & calling</p>
                </div>
              )}
            </div>
          )}

          {/* ─── SUB-PAGE 2: CALLS STUDIO ────────────────────────────────────── */}
          {screen === 'calls' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-lg font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                  <PhoneCall size={20} style={{ color: 'var(--accent)' }} /> WebRTC Video Calling Studio
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <div className="p-6 rounded-3xl space-y-4 shadow-2xl glass-panel">
                  <label className="text-[11px] font-extrabold uppercase tracking-widest block flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                    <Hash size={15} /> Join Instant Multi-User Group Room
                  </label>
                  <div className="flex gap-3">
                    <input type="text" value={groupRoomInput} onChange={(e) => setGroupRoomInput(e.target.value)} placeholder="e.g. engineering-standup" className="app-input flex-1 !rounded-2xl !py-3" />
                    <button onClick={() => joinGroup(true)} disabled={!groupRoomInput.trim()} className="app-btn app-btn-primary px-6 py-3 !rounded-2xl text-xs font-bold disabled:opacity-30 shadow-lg">
                      <Video size={17} /> Join Video Studio
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Users size={15} style={{ color: 'var(--accent)' }} /> Active Friends ({friendObjects.length})
                  </h3>
                  {friendObjects.length === 0 ? (
                    <div className="p-10 rounded-3xl text-center glass-panel">
                      <Users size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No friends online to call</p>
                      <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>Go to the Friends tab to send friend requests to online users!</p>
                    </div>
                  ) : (
                    friendObjects.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl mb-3 shadow-lg glass-panel transition-all hover:scale-[1.01]">
                        <div className="flex items-center gap-3.5">
                          <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid var(--accent)' }} />
                          <div>
                            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.name}</h4>
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--green)' }}>● Active Online</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startCall(u, false)} className="app-btn app-btn-ghost px-4 py-2.5 rounded-xl border" style={{ color: 'var(--green)', borderColor: 'var(--green-dim)' }} title="Voice Call">
                            <Phone size={17} /> <span className="hidden sm:inline text-xs font-bold">Voice Call</span>
                          </button>
                          <button onClick={() => startCall(u, true)} className="app-btn app-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg" title="Video Call">
                            <Video size={17} /> <span className="hidden sm:inline text-xs font-bold">Video Call</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── SUB-PAGE 3: FRIENDS SYSTEM ─────────────────────────────────── */}
          {screen === 'friends' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-lg font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                  <Users size={20} style={{ color: 'var(--accent)' }} /> Friends & Network
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setFriendsTab('friends')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${friendsTab === 'friends' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                    Friends ({friends.length})
                  </button>
                  <button onClick={() => setFriendsTab('requests')} className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all ${friendsTab === 'requests' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                    Requests {friendRequests.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">{friendRequests.length}</span>}
                  </button>
                  <button onClick={() => setFriendsTab('find')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${friendsTab === 'find' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                    Online Users ({others.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                {/* SUB-TAB 1: CONFIRMED FRIENDS */}
                {friendsTab === 'friends' && (
                  <div>
                    {friendObjects.length === 0 ? (
                      <div className="p-10 rounded-3xl text-center glass-panel">
                        <UserCheck size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No friends added yet</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click "Online Users" tab to send friend requests!</p>
                      </div>
                    ) : (
                      friendObjects.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl mb-3 glass-panel shadow-md">
                          <div className="flex items-center gap-3.5">
                            <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid var(--accent)' }} />
                            <div>
                              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.name}</h4>
                              <span className="text-[11px] font-semibold" style={{ color: 'var(--green)' }}>● Active Online</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setSelectedContact(u); setScreen('chats'); }} className="app-btn app-btn-ghost px-4 py-2 text-xs font-bold border" style={{ borderColor: 'var(--border)' }}>
                              <MessageSquare size={15} /> Chat
                            </button>
                            <button onClick={() => startCall(u, true)} className="app-btn app-btn-primary px-4 py-2 text-xs font-bold shadow-md">
                              <Video size={15} /> Call
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SUB-TAB 2: PENDING FRIEND REQUESTS */}
                {friendsTab === 'requests' && (
                  <div>
                    {friendRequests.length === 0 ? (
                      <div className="p-10 rounded-3xl text-center glass-panel">
                        <UserPlus size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No pending friend requests</p>
                      </div>
                    ) : (
                      friendRequests.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl mb-3 glass-panel shadow-md">
                          <div className="flex items-center gap-3.5">
                            <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid var(--accent)' }} />
                            <div>
                              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.name}</h4>
                              <span className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>Sent you a friend request</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => rejectFriendRequest(u)} className="app-btn px-4 py-2 text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600 hover:text-white">
                              Decline
                            </button>
                            <button onClick={() => acceptFriendRequest(u)} className="app-btn app-btn-primary px-4 py-2 text-xs font-bold shadow-md">
                              Accept
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SUB-TAB 3: FIND ONLINE USERS */}
                {friendsTab === 'find' && (
                  <div>
                    {others.length === 0 ? (
                      <div className="p-10 rounded-3xl text-center glass-panel">
                        <UserSearch size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No other users online right now</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Open another browser tab or share your link!</p>
                      </div>
                    ) : (
                      others.map((u) => {
                        const isAlreadyFriend = isFriend(u.id);
                        const isSent = sentRequests.includes(u.id);

                        return (
                          <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl mb-3 glass-panel shadow-md">
                            <div className="flex items-center gap-3.5">
                              <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid var(--border)' }} />
                              <div>
                                <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.name}</h4>
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--green)' }}>● Active Online</span>
                              </div>
                            </div>

                            {isAlreadyFriend ? (
                              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                                <UserCheck size={14} /> Friends
                              </span>
                            ) : isSent ? (
                              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Request Sent
                              </span>
                            ) : (
                              <button onClick={() => sendFriendRequest(u)} className="app-btn app-btn-primary px-4 py-2 text-xs font-bold shadow-md">
                                <UserPlus size={15} /> Add Friend
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── SUB-PAGE 4: AI STUDIO ────────────────────────────────────── */}
          {screen === 'ai-studio' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-lg font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                  <Wand2 size={20} style={{ color: 'var(--accent)' }} /> AI Studio Workspace
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="p-6 rounded-3xl space-y-4 shadow-2xl glass-panel">
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Wand2 size={17} style={{ color: 'var(--accent)' }} /> Magic Message Polisher
                    </h3>
                    <textarea rows={3} value={aiPolishInput} onChange={(e) => setAiPolishInput(e.target.value)} placeholder="Draft rough text here..." className="app-input text-xs resize-none" />
                    <button onClick={async () => {
                      if (!aiPolishInput.trim()) return;
                      setIsAiThinking(true);
                      const res = await rephraseText(aiPolishInput, aiPolishStyle);
                      setIsAiThinking(false);
                      setAiPolishOutput(res);
                    }} disabled={!aiPolishInput.trim()} className="app-btn app-btn-primary px-6 py-3 text-xs font-bold shadow-lg">
                      Rephrase Text
                    </button>
                    {aiPolishOutput && (
                      <div className="p-5 rounded-2xl text-xs leading-relaxed font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--text-primary)', border: '1px solid var(--accent)' }}>
                        {aiPolishOutput}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── SUB-PAGE 5: PROFILE ────────────────────────────────────── */}
          {screen === 'profile' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-lg font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                  <UserIcon size={20} style={{ color: 'var(--accent)' }} /> User Profile
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl mx-auto p-8 rounded-3xl flex items-center gap-6 shadow-2xl glass-panel">
                  <img src={registeredUser.avatar} alt="" className="w-24 h-24 rounded-full object-cover shadow-2xl" style={{ border: '4px solid var(--accent)' }} />
                  <div>
                    <h3 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{registeredUser.name}</h3>
                    <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{userBio}</p>
                    <span className="inline-block mt-3 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md" style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
                      WebRTC Pro Member
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── SUB-PAGE 6: SETTINGS ────────────────────────────────────── */}
          {screen === 'settings' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-main)' }}>
              <div className="px-6 h-16 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                <h2 className="text-lg font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                  <Settings size={20} style={{ color: 'var(--accent)' }} /> Settings & Preferences
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-2xl mx-auto w-full">
                <div className="p-6 rounded-3xl space-y-4 shadow-2xl glass-panel">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Appearance Theme</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {THEMES.map((t) => (
                      <button key={t.key} onClick={() => setTheme(t.key)} className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105" style={{ background: theme === t.key ? 'var(--accent-dim)' : 'var(--bg-surface)', border: `2px solid ${theme === t.key ? 'var(--accent)' : 'transparent'}` }}>
                        <div className="w-8 h-8 rounded-full shadow-lg" style={{ background: t.dot }} />
                        <span className="text-[11px] font-bold" style={{ color: theme === t.key ? 'var(--accent)' : 'var(--text-muted)' }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MOBILE NAVIGATION BAR */}
          <nav className="md:hidden flex items-center justify-around h-16 shrink-0 z-40" style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)' }}>
            {([
              { key: 'chats' as Screen, icon: MessageSquare, label: 'Chats' },
              { key: 'calls' as Screen, icon: PhoneCall, label: 'Calls' },
              { key: 'friends' as Screen, icon: Users, label: 'Friends' },
              { key: 'ai-studio' as Screen, icon: Wand2, label: 'AI Studio' },
              { key: 'profile' as Screen, icon: UserIcon, label: 'Profile' },
              { key: 'settings' as Screen, icon: Settings, label: 'Settings' },
            ]).map((nav) => {
              const active = screen === nav.key;
              return (
                <button key={nav.key} onClick={() => { setScreen(nav.key); if (nav.key !== 'chats') setSelectedContact(null); }} className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <nav.icon size={20} />
                  <span className="text-[9px] font-bold">{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
