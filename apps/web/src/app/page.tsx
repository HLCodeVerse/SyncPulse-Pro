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
  Pin, File, PhoneCall, User as UserIcon, UserPlus, UserCheck, UserSearch,
  Activity, Plus, Camera, Smile, Paperclip, Lock, Radio
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

const THEMES: { key: string; label: string; dot: string; grad: string }[] = [
  { key: 'coral-dark', label: 'AMOLED Coral Dark', dot: '#ff453a', grad: 'linear-gradient(135deg, #000000, #13151b)' },
  { key: 'cyan-mint', label: 'Cyan Mint', dot: '#007cbe', grad: 'linear-gradient(135deg, #007cbe, #fff7ae)' },
  { key: 'coral-sunset', label: 'Coral Sunset', dot: '#e57a44', grad: 'linear-gradient(135deg, #e57a44, #251351)' },
  { key: 'pastel-lavender', label: 'Pastel Lavender', dot: '#a882dd', grad: 'linear-gradient(135deg, #f1fec6, #a882dd)' },
  { key: 'rose-mint', label: 'Rose Mint', dot: '#db5375', grad: 'linear-gradient(135deg, #db5375, #b3ffb3)' },
  { key: 'ocean-blue', label: 'Ocean Blue', dot: '#02c3bd', grad: 'linear-gradient(135deg, #02c3bd, #4e148c)' },
  { key: 'lime-gold', label: 'Lime Gold', dot: '#f4d35e', grad: 'linear-gradient(135deg, #629460, #f4d35e)' },
  { key: 'forest-sage', label: 'Forest Sage', dot: '#b0db43', grad: 'linear-gradient(135deg, #414288, #b0db43)' },
  { key: 'peach-pink', label: 'Peach Pink', dot: '#ec368d', grad: 'linear-gradient(135deg, #ffc145, #ec368d)' },
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
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(30);
  const [userName, setUserName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [userBio, setUserBio] = useState('Senior Full-Stack & WebRTC Engineer.');
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  type Screen = 'chats' | 'calls' | 'friends' | 'ai-studio' | 'profile' | 'settings';
  const [screen, setScreen] = useState<Screen>('chats');
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [friends, setFriends] = useState<string[]>([]);
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [friendsTab, setFriendsTab] = useState<'find' | 'friends' | 'requests'>('find');

  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pulse_theme') || 'coral-dark';
    return 'coral-dark';
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

  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [summaryModalText, setSummaryModalText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiPolishInput, setAiPolishInput] = useState('');
  const [aiPolishOutput, setAiPolishOutput] = useState('');
  const [aiPolishStyle, setAiPolishStyle] = useState<'professional' | 'casual' | 'fluent' | 'concise'>('professional');

  const sigRef = useRef<SignalingClient | null>(null);
  const pmRef = useRef<PeerConnectionManager | null>(null);

  /* Splash Loader */
  useEffect(() => {
    const t1 = setTimeout(() => setSplashProgress(80), 200);
    const t2 = setTimeout(() => setSplashProgress(100), 500);
    const t3 = setTimeout(() => setShowSplash(false), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* Restore Session */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('syncpulse_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          setUserName(parsed.name);
          if (parsed.avatar) setSelectedAvatar(parsed.avatar);
          if (parsed.bio) setUserBio(parsed.bio);

          const savedFriends = localStorage.getItem(`syncpulse_friends_${parsed.id}`);
          if (savedFriends) {
            try { setFriends(JSON.parse(savedFriends)); } catch (e) {}
          }

          const userObj: User = { id: parsed.id, name: parsed.name, avatar: parsed.avatar, status: 'online' };
          setRegisteredUser(userObj);
          sigRef.current?.connect();
          sigRef.current?.register(userObj);
        }
      } catch (e) {}
    }
  }, []);

  /* Save Friends */
  useEffect(() => {
    if (registeredUser && typeof window !== 'undefined') {
      localStorage.setItem(`syncpulse_friends_${registeredUser.id}`, JSON.stringify(friends));
    }
  }, [friends, registeredUser]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pulse_theme', theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedContact, smartReplies]);

  useEffect(() => {
    let interval: any = null;
    if (isVoiceRecording) {
      interval = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isVoiceRecording]);

  /* Signaling */
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

  /* Actions */
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    const id = `u_${Math.random().toString(36).substring(2, 9)}`;
    const sessionObj = { id, name: userName.trim(), avatar: selectedAvatar, bio: userBio };

    if (typeof window !== 'undefined') {
      localStorage.setItem('syncpulse_session', JSON.stringify(sessionObj));
    }

    const userObj: User = { id, name: userName.trim(), avatar: selectedAvatar, status: 'online' };
    setRegisteredUser(userObj);
    sigRef.current?.connect();
    sigRef.current?.register(userObj);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('syncpulse_session');
    }
    leaveCall();
    sigRef.current?.disconnect();
    setRegisteredUser(null);
    setSelectedContact(null);
    setChatMessages([]);
  };

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

  /* Splash Screen */
  if (showSplash) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center relative overflow-hidden anim-fade z-50 bg-black">
        <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500 mb-4 shadow-lg">
            <Zap size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
            SyncPulse <span className="text-red-500">Pro</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium mb-6">AMOLED Matte Finish Network</p>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/10 mb-2">
            <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${splashProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  /* Full Screen Matte Login Screen */
  if (!registeredUser) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col lg:flex-row overflow-hidden z-50 bg-black">
        <div className="hidden lg:flex w-1/2 h-full flex-col justify-between p-12 relative border-r border-white/10 bg-[#07080b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold">
              <Zap size={20} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">SyncPulse <span className="text-red-500">Pro</span></h2>
          </div>

          <div className="space-y-4 max-w-md">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30 inline-flex items-center gap-1.5">
              <Radio size={13} className="animate-pulse" /> AMOLED Matte WebRTC
            </span>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Enterprise WebRTC Calling & AI Workspace
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Ultra low-latency P2P video calls, real-time messaging, multi-user audio studio, and AI chat assistants.
            </p>
          </div>

          <div className="text-[11px] text-slate-600 font-medium">
            © 2026 SyncPulse Pro · AMOLED Matte Architecture
          </div>
        </div>

        <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-black">
          <form onSubmit={handleRegister} className="w-full max-w-sm space-y-5">
            <div className="lg:hidden flex flex-col items-center mb-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500 flex items-center justify-center text-white mb-2 shadow-lg">
                <Zap size={28} />
              </div>
              <h1 className="text-xl font-extrabold text-white">SyncPulse Pro</h1>
            </div>

            <div className="matte-card p-6 md:p-8 space-y-5">
              <h2 className="text-lg font-bold text-white tracking-tight">Sign In to Workspace</h2>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">Choose Profile Avatar</label>
                <div className="flex justify-between gap-2">
                  {AVATAR_PRESETS.map((url, i) => (
                    <img key={i} src={url} alt="" onClick={() => setSelectedAvatar(url)} className="w-10 h-10 rounded-full object-cover cursor-pointer transition-all hover:scale-110" style={{ border: selectedAvatar === url ? '2px solid #ff453a' : '2px solid transparent' }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Display Name</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Sara Sanders" className="matte-input" required autoFocus />
              </div>

              <button type="submit" className="app-btn app-btn-primary w-full py-3 text-xs font-bold shadow-md">
                <Sparkles size={15} /> Enter Workspace
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* Main Workspace */
  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-black">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {incomingCall && (
        <CallModal
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {outgoingCall && !activeRoomId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="matte-card p-6 max-w-xs w-full text-center flex flex-col items-center">
            <img src={outgoingCall.target.avatar || AVATAR_PRESETS[0]} alt="" className="w-16 h-16 rounded-full ring-2 ring-red-500 mb-3 object-cover" />
            <h3 className="text-base font-bold text-white">{outgoingCall.target.name}</h3>
            <p className="text-xs text-red-400 mt-1 font-medium">Calling ({outgoingCall.isVideo ? 'Video' : 'Voice'})...</p>
            <button onClick={leaveCall} className="mt-6 app-btn p-3 rounded-full bg-red-600 text-white">
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}

      {busyNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl matte-card text-white text-xs font-medium shadow-2xl flex items-center gap-2">
          <Activity size={14} className="text-red-400 animate-pulse" /> {busyNotice}
        </div>
      )}

      {activeRoomId ? (
        <div className="h-full w-full flex flex-col relative z-40 bg-black">
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl matte-card">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-white">{activeRoomId}</span>
              <button onClick={() => setShowInviteModal(true)} className="ml-2 app-btn app-btn-primary px-2.5 py-1 text-[10px] font-bold">
                <UserPlus size={12} /> Invite
              </button>
            </div>
            <div className="pointer-events-auto">
              <NetworkQualityBadge quality={networkQuality.quality} rttMs={networkQuality.rttMs} bitrateKbps={networkQuality.bitrateKbps} />
            </div>
          </div>

          {showInviteModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="matte-card p-5 max-w-sm w-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><UserPlus size={15} className="text-red-400" /> Invite Users</h3>
                  <button onClick={() => setShowInviteModal(false)} className="text-slate-400 p-1"><X size={16} /></button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {others.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No users online.</p>
                  ) : (
                    others.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/5">
                        <div className="flex items-center gap-2.5">
                          <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                          <span className="text-xs font-medium text-white">{u.name}</span>
                        </div>
                        <button onClick={() => inviteUserToCall(u)} className="app-btn app-btn-primary px-2.5 py-1 text-[11px]">Invite</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-4 pt-14 pb-20">
            <VideoGrid
              localStream={localStream}
              localUser={{ name: registeredUser.name, avatar: registeredUser.avatar }}
              localMediaState={{ audio: !isAudioMuted, video: !isVideoMuted }}
              remoteStreams={remoteStreams}
              participants={participants}
              screenStream={screenStream}
            />
          </div>

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
          {/* Desktop Left Sidebar */}
          <aside className="hidden md:flex w-16 shrink-0 flex-col items-center py-4 gap-3 bg-[#08090c] border-r border-white/10">
            <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center text-white mb-2">
              <Zap size={18} />
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
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-white'}`}
                  title={nav.label}>
                  <nav.icon size={18} />
                </button>
              );
            })}

            <div className="flex-1" />

            <div className="relative mb-2 cursor-pointer" onClick={() => setScreen('profile')}>
              <img src={registeredUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-red-500" />
            </div>

            <button onClick={handleLogout} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400">
              <LogOut size={16} />
            </button>
          </aside>

          {/* Sub-Page 1: CHATS (Compact Sleek Avatars) */}
          {screen === 'chats' && (
            <div className="flex-1 flex h-full overflow-hidden">
              <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col shrink-0 h-full p-3 bg-[#08090c] border-r border-white/10`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <img src={registeredUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                    <h2 className="text-base font-bold text-white tracking-tight">Chats</h2>
                  </div>
                  <button onClick={() => setScreen('friends')} className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center" title="Add Contact">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="relative mb-3">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="matte-input !py-1.5 text-xs pl-8" />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {filteredContacts.map((c) => {
                    const isSel = selectedContact?.id === c.id;
                    const last = getLastMsg(c);
                    const unread = getUnreadCount(c);
                    const isAi = c.id === AI_BOT_USER.id;

                    return (
                      <div key={c.id} onClick={() => setSelectedContact(c)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${isSel ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'}`}>
                        <div className="relative shrink-0">
                          {/* Sleek Compact Avatar */}
                          <img src={c.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: isAi ? '#ff453a' : '#30d158', border: '2px solid #08090c' }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate text-white">
                              {c.name}
                            </span>
                            {last && (
                              <span className="text-[10px] shrink-0 font-medium text-slate-500">
                                {new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[11px] truncate text-slate-400 font-normal">
                              {last ? (last.isEdited ? `${last.text} (edited)` : last.text) : (isAi ? 'Ask PulseAI...' : 'Tap to open')}
                            </p>
                            {unread > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white shrink-0">
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

              {/* Chat Conversation View */}
              {selectedContact ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0e12]">
                  <div className="flex items-center justify-between px-4 h-14 shrink-0 bg-[#08090c] border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => setSelectedContact(null)} className="md:hidden p-1 text-slate-400">
                        <ArrowLeft size={16} />
                      </button>
                      <img src={selectedContact.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{selectedContact.name}</h4>
                        <span className="text-[10px] text-emerald-400">Active Now</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={handleSummarizeChat} className="p-2 text-slate-400 hover:text-white" title="Summarize"><Bot size={16} /></button>
                      {selectedContact.id !== AI_BOT_USER.id && (
                        <>
                          <button onClick={() => startCall(selectedContact, false)} className="p-2 text-slate-400 hover:text-emerald-400"><Phone size={16} /></button>
                          <button onClick={() => startCall(selectedContact, true)} className="p-2 text-slate-400 hover:text-red-400"><Video size={16} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {pinnedMessage && (
                    <div className="px-4 py-2 flex items-center justify-between text-xs bg-red-500/10 border-b border-red-500/20 text-red-400">
                      <div className="flex items-center gap-2 truncate font-medium">
                        <Pin size={12} /> Pinned: <span className="truncate text-white">{pinnedMessage.text}</span>
                      </div>
                      <button onClick={() => setPinnedMessage(null)} className="p-0.5"><X size={12} /></button>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] text-slate-500 px-3 py-1 rounded-full bg-slate-900 border border-white/5">Today</span>
                    </div>

                    {activeChat.map((msg) => {
                      const isMe = msg.sender.id === registeredUser.id;
                      const emojiOnly = isOnlyEmoji(msg.text);

                      return (
                        <div key={msg.id} className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'} anim-slide-up`}>
                          <div className={`absolute -top-3 ${isMe ? 'right-2' : 'left-2'} hidden group-hover:flex items-center gap-1 z-30 px-2 py-0.5 rounded-full bg-slate-900 border border-white/10`}>
                            {EMOJI_REACTIONS.slice(0, 4).map(emoji => (
                              <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="text-xs hover:scale-125 px-0.5">{emoji}</button>
                            ))}
                          </div>

                          {emojiOnly ? (
                            <div className="text-4xl py-1">{msg.text}</div>
                          ) : (
                            <div className={`max-w-[80%] md:max-w-[65%] px-3.5 py-2 text-xs leading-relaxed ${isMe ? 'bg-red-500 text-white rounded-2xl rounded-tr-xs' : 'matte-card text-white rounded-2xl rounded-tl-xs'}`}>
                              <p className="break-words whitespace-pre-line">{msg.text}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-red-100' : 'text-slate-500'}`}>
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && <span>{msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isAiThinking && (
                      <div className="flex justify-start">
                        <div className="matte-card px-3 py-2 text-xs text-red-400 flex items-center gap-1.5">
                          <Sparkles size={14} className="animate-spin" /> PulseAI is typing...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="px-3 py-2.5 flex items-center gap-2 bg-[#08090c] border-t border-white/10">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-white"><Paperclip size={16} /></button>
                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type a message..." className="matte-input flex-1 !py-2 text-xs" />
                    <button type="button" onClick={() => setIsVoiceRecording(true)} className="p-2 text-slate-400 hover:text-white"><Mic size={16} /></button>
                    <button type="submit" disabled={!inputText.trim()} className="app-btn app-btn-primary p-2 rounded-xl disabled:opacity-30"><Send size={15} /></button>
                  </form>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#0d0e12]">
                  <MessageSquare size={32} className="text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">Select a contact to start chatting</p>
                </div>
              )}
            </div>
          )}

          {/* Sub-Page 2: CALLS STUDIO */}
          {screen === 'calls' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0e12]">
              <div className="px-5 h-14 flex items-center bg-[#08090c] border-b border-white/10">
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><PhoneCall size={16} className="text-red-400" /> Calling Studio</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="matte-card p-4 space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">Join Multi-User Room</label>
                  <div className="flex gap-2">
                    <input type="text" value={groupRoomInput} onChange={(e) => setGroupRoomInput(e.target.value)} placeholder="Room Name..." className="matte-input text-xs flex-1" />
                    <button onClick={() => joinGroup(true)} disabled={!groupRoomInput.trim()} className="app-btn app-btn-primary px-4 py-2 text-xs">Join</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Friends ({friendObjects.length})</h3>
                  {friendObjects.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 matte-card">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                        <span className="text-xs font-semibold text-white">{u.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startCall(u, false)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><Phone size={14} /></button>
                        <button onClick={() => startCall(u, true)} className="p-2 rounded-lg bg-red-500 text-white"><Video size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Page 3: FRIENDS SYSTEM */}
          {screen === 'friends' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0e12]">
              <div className="px-5 h-14 flex items-center justify-between bg-[#08090c] border-b border-white/10">
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><Users size={16} className="text-red-400" /> Friends</h2>
                <div className="flex gap-1.5">
                  <button onClick={() => setFriendsTab('find')} className={`px-3 py-1 rounded-lg text-xs font-medium ${friendsTab === 'find' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Online ({others.length})</button>
                  <button onClick={() => setFriendsTab('friends')} className={`px-3 py-1 rounded-lg text-xs font-medium ${friendsTab === 'friends' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Friends ({friends.length})</button>
                  <button onClick={() => setFriendsTab('requests')} className={`px-3 py-1 rounded-lg text-xs font-medium ${friendsTab === 'requests' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Requests ({friendRequests.length})</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {friendsTab === 'find' && others.map((u) => {
                  const isAlreadyFriend = isFriend(u.id);
                  const isSent = sentRequests.includes(u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-3 matte-card">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                        <div>
                          <h4 className="text-xs font-bold text-white">{u.name}</h4>
                          <span className="text-[10px] text-emerald-400">● Active Online</span>
                        </div>
                      </div>
                      {isAlreadyFriend ? (
                        <span className="text-[10px] text-emerald-400 font-semibold">Friends</span>
                      ) : isSent ? (
                        <span className="text-[10px] text-amber-400 font-semibold">Sent</span>
                      ) : (
                        <button onClick={() => sendFriendRequest(u)} className="app-btn app-btn-primary px-3 py-1.5 text-xs"><UserPlus size={13} /> Add</button>
                      )}
                    </div>
                  );
                })}

                {friendsTab === 'friends' && friendObjects.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 matte-card">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                      <span className="text-xs font-bold text-white">{u.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedContact(u); setScreen('chats'); }} className="p-2 rounded-lg border border-white/10 text-slate-300"><MessageSquare size={14} /></button>
                      <button onClick={() => startCall(u, true)} className="p-2 rounded-lg bg-red-500 text-white"><Video size={14} /></button>
                    </div>
                  </div>
                ))}

                {friendsTab === 'requests' && friendRequests.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 matte-card">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                      <span className="text-xs font-bold text-white">{u.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => rejectFriendRequest(u)} className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400">Decline</button>
                      <button onClick={() => acceptFriendRequest(u)} className="app-btn app-btn-primary px-3 py-1 text-xs">Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Page 4: AI STUDIO */}
          {screen === 'ai-studio' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0d0e12]">
              <div className="px-5 h-14 flex items-center bg-[#08090c] border-b border-white/10">
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><Wand2 size={16} className="text-red-400" /> AI Studio</h2>
              </div>
              <div className="p-4 max-w-xl mx-auto w-full space-y-4">
                <div className="matte-card p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white">Message Polisher</h3>
                  <textarea rows={3} value={aiPolishInput} onChange={(e) => setAiPolishInput(e.target.value)} placeholder="Draft rough text..." className="matte-input text-xs resize-none" />
                  <button onClick={async () => {
                    if (!aiPolishInput.trim()) return;
                    setIsAiThinking(true);
                    const res = await rephraseText(aiPolishInput, aiPolishStyle);
                    setIsAiThinking(false);
                    setAiPolishOutput(res);
                  }} className="app-btn app-btn-primary px-4 py-2 text-xs">Rephrase</button>
                  {aiPolishOutput && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-white">{aiPolishOutput}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Page 5: PROFILE */}
          {screen === 'profile' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0d0e12]">
              <div className="px-5 h-14 flex items-center justify-between bg-[#08090c] border-b border-white/10">
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><UserIcon size={16} className="text-red-400" /> Profile</h2>
                <button onClick={handleLogout} className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30"><LogOut size={13} /> Logout</button>
              </div>
              <div className="p-6 max-w-md mx-auto w-full">
                <div className="matte-card p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={registeredUser.avatar} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-red-500" />
                    <div>
                      <h3 className="text-base font-bold text-white">{registeredUser.name}</h3>
                      <p className="text-xs text-slate-400">{userBio}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Page 6: SETTINGS */}
          {screen === 'settings' && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0d0e12]">
              <div className="px-5 h-14 flex items-center justify-between bg-[#08090c] border-b border-white/10">
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><Settings size={16} className="text-red-400" /> Settings</h2>
                <button onClick={handleLogout} className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30"><LogOut size={13} /> Logout</button>
              </div>
              <div className="p-4 max-w-xl mx-auto w-full space-y-4">
                <div className="matte-card p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Themes</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {THEMES.map((t) => (
                      <button key={t.key} onClick={() => setTheme(t.key)} className="flex items-center gap-2 p-2.5 rounded-xl border border-white/5 bg-slate-950 text-left">
                        <div className="w-6 h-6 rounded-lg shrink-0" style={{ background: t.grad }} />
                        <span className="text-[11px] font-semibold text-white truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ultra Sleek Mobile Bottom Navigation Bar */}
          <nav className="md:hidden flex items-center justify-around h-14 shrink-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-white/10 px-2">
            {([
              { key: 'chats' as Screen, icon: MessageSquare, label: 'Chats' },
              { key: 'calls' as Screen, icon: PhoneCall, label: 'Calls' },
              { key: 'friends' as Screen, icon: Users, label: 'Friends' },
              { key: 'ai-studio' as Screen, icon: Wand2, label: 'AI' },
              { key: 'profile' as Screen, icon: UserIcon, label: 'Profile' },
              { key: 'settings' as Screen, icon: Settings, label: 'Settings' },
            ]).map((nav) => {
              const active = screen === nav.key;
              return (
                <button key={nav.key} onClick={() => { setScreen(nav.key); if (nav.key !== 'chats') setSelectedContact(null); }}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-all ${active ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400'}`}>
                  <nav.icon size={16} />
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
