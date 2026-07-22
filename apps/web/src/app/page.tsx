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
  CallLogItem
} from '@webrtc/ui';
import {
  Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Monitor, MessageSquare,
  Search, Send, CheckCheck, Check, ArrowLeft, Settings, LogOut, Users, Zap,
  X, Sparkles, Hash, Edit2, Bot, Wand2, Globe2, ShieldCheck,
  Pin, File, PhoneCall, User as UserIcon, UserPlus, UserCheck, UserSearch,
  Activity, Plus, Camera, Smile, Paperclip, Lock, Radio, Trash2, Reply, Bell
} from 'lucide-react';
import {
  askGeminiWithThreadContext,
  generateSmartRepliesWithContext,
  rephraseWithContext,
  summarizeChatHistory,
  generateMeetingNotes,
  generateUserBio,
  translateText
} from '../lib/aiService';
import {
  syncUserIdentity,
  fetchFriendsFromDb,
  saveFriendshipToDb,
  saveMessageToDb,
  fetchRoomMessagesFromDb,
  fetchAllUsersFromDb,
  fetchAllMessagesFromDb,
  updateUserRoleInDb,
  toggleUserSuspensionInDb,
  deleteUserFromDb,
  deleteMessageFromDb,
  DbUser,
  DbMessage
} from '../lib/supabaseClient';
import { requestNotificationPermission, showBackgroundCallNotification } from '../lib/pushNotifications';
import {
  AnimatedMicIcon,
  AnimatedCamIcon,
  AnimatedDialRingIcon,
  AnimatedReadTickIcon,
  AnimatedReactionIcon,
  AnimatedBellIcon
} from '../../../../packages/icons/src/AnimatedIcons';

// Modular Sub-Components
import { AiSparkleIcon, SplashView } from '../components/SplashView';
import { LoginView } from '../components/LoginView';
import { Sidebar } from '../components/Sidebar';
import { AdminDashboardView } from '../components/AdminDashboardView';
import { FriendsView } from '../components/FriendsView';
import { AiStudioView } from '../components/AiStudioView';

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

const EMOJI_REACTIONS = [
  { type: 'heart', label: '❤️' },
  { type: 'fire', label: '🔥' },
  { type: 'thumbs', label: '👍' },
];

function isOnlyEmoji(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]){1,3}$/gi;
  return emojiRegex.test(clean);
}

function playSound(type: 'message' | 'notification' | 'ring' | 'dial') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'notification') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'message') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'ring') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
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
  const [splashProgress, setSplashProgress] = useState(60);
  
  // Auth Form State
  const [userName, setUserName] = useState('');
  const [userHandle, setUserHandle] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [userBio, setUserBio] = useState('Senior Full-Stack & WebRTC Engineer.');
  
  const [registeredUser, setRegisteredUser] = useState<(User & { role?: string; username?: string; phone?: string; bio?: string }) | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  type Screen = 'chats' | 'calls' | 'friends' | 'ai-studio' | 'admin' | 'profile' | 'settings';
  const [screen, setScreen] = useState<Screen>('chats');
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Friends & Profile Cache
  const [friends, setFriends] = useState<string[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, User>>({});
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [friendsTab, setFriendsTab] = useState<'find' | 'friends' | 'requests'>('find');

  // Admin Dashboard State
  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'messages' | 'rooms' | 'system'>('overview');
  const [dbUsersList, setDbUsersList] = useState<DbUser[]>([]);
  const [dbMessagesList, setDbMessagesList] = useState<DbMessage[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pulse_theme') || 'coral-dark';
    return 'coral-dark';
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Calls
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
  const [inCallChatToast, setInCallChatToast] = useState<{ senderName: string; text: string } | null>(null);

  // Calling & Dialing States
  const [incomingCall, setIncomingCall] = useState<{ roomId: string; caller: User; isVideo: boolean; callType: CallType } | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<{ target: User; isVideo: boolean; roomId: string } | null>(null);
  const [busyNotice, setBusyNotice] = useState<string | null>(null);

  // Chat & AI Context State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [smartReplyChips, setSmartReplyChips] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [summaryModalText, setSummaryModalText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiPolishInput, setAiPolishInput] = useState('');
  const [aiPolishOutput, setAiPolishOutput] = useState('');

  const sigRef = useRef<SignalingClient | null>(null);
  const pmRef = useRef<PeerConnectionManager | null>(null);

  /* Splash Screen */
  useEffect(() => {
    const t1 = setTimeout(() => setSplashProgress(95), 120);
    const t2 = setTimeout(() => setSplashProgress(100), 250);
    const t3 = setTimeout(() => setShowSplash(false), 380);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* Restore Session, Supabase Sync & DB Hydration */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    requestNotificationPermission();

    const saved = localStorage.getItem('syncpulse_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          setUserName(parsed.name);
          if (parsed.username) setUserHandle(parsed.username);
          if (parsed.phone) setUserPhone(parsed.phone);
          if (parsed.role) setUserRole(parsed.role);
          if (parsed.avatar) setSelectedAvatar(parsed.avatar);
          if (parsed.bio) setUserBio(parsed.bio);

          const userObj = { id: parsed.id, name: parsed.name, username: parsed.username, phone: parsed.phone, avatar: parsed.avatar, bio: parsed.bio, role: parsed.role || 'user', status: 'online' };
          setRegisteredUser(userObj as any);
          syncUserIdentity(userObj);

          sigRef.current?.connect();
          sigRef.current?.register(userObj as any);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pulse_theme', theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedContact, smartReplyChips]);

  /* Hydrate Thread History from Supabase DB on Contact Select */
  useEffect(() => {
    if (!selectedContact || !registeredUser) return;

    const roomId = selectedContact.id === AI_BOT_USER.id ? 'pulse_ai_bot' : [registeredUser.id, selectedContact.id].sort().join('_chat_');

    fetchRoomMessagesFromDb(roomId).then((dbMsgs) => {
      if (dbMsgs && dbMsgs.length > 0) {
        const formattedMsgs: ChatMessage[] = dbMsgs.map(m => ({
          id: m.id,
          roomId: m.room_id,
          sender: m.sender_id === registeredUser.id
            ? { id: registeredUser.id, name: registeredUser.name, avatar: registeredUser.avatar }
            : { id: selectedContact.id, name: selectedContact.name, avatar: selectedContact.avatar },
          text: m.text,
          timestamp: new Date(m.created_at).getTime(),
          status: 'read',
          isEdited: m.is_edited,
          isDeleted: m.is_deleted
        }));

        setChatMessages(prev => {
          const existingIds = new Set(prev.map(x => x.id));
          const combined = [...prev];
          formattedMsgs.forEach(m => {
            if (!existingIds.has(m.id)) combined.push(m);
          });
          return combined.sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    });
  }, [selectedContact, registeredUser]);

  /* Signaling Listeners */
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

    sig.on('registered', (u) => setRegisteredUser(u as any));
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

      if (activeRoomId) {
        setInCallChatToast({ senderName: msg.sender.name, text: msg.text });
        setTimeout(() => setInCallChatToast(null), 4000);
      }

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
            text: message.text !== undefined ? message.text : m.text,
            isEdited: message.isEdited !== undefined ? message.isEdited : m.isEdited,
            isDeleted: message.isDeleted !== undefined ? message.isDeleted : m.isDeleted,
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
      showBackgroundCallNotification(payload.caller.name, payload.isVideo);
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
      if (soundEnabled) playSound('notification');
    });

    sig.on('friend:accept', ({ from }) => {
      setFriends((prev) => Array.from(new Set([...prev, from.id])));
      setFriendProfiles((prev) => ({ ...prev, [from.id]: from }));
      setSentRequests((prev) => prev.filter(id => id !== from.id));
      setBusyNotice(`🎉 ${from.name} accepted your friend request!`);
      if (soundEnabled) playSound('notification');
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
  }, [soundEnabled, activeRoomId, registeredUser]);

  /* Actions */
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

  const sendFriendRequest = async (targetUser: User) => {
    sigRef.current?.sendFriendRequest(targetUser.id);
    setSentRequests((prev) => Array.from(new Set([...prev, targetUser.id])));
    setFriendProfiles((prev) => ({ ...prev, [targetUser.id]: targetUser }));

    if (registeredUser) {
      await fetch('/api/friendships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', senderId: registeredUser.id, targetId: targetUser.id })
      });
    }

    setBusyNotice(`Friend request sent to ${targetUser.name}!`);
    if (soundEnabled) playSound('notification');
    setTimeout(() => setBusyNotice(null), 3500);
  };

  const acceptFriendRequest = async (targetUser: User) => {
    sigRef.current?.acceptFriendRequest(targetUser.id);
    setFriends((prev) => Array.from(new Set([...prev, targetUser.id])));
    setFriendProfiles((prev) => ({ ...prev, [targetUser.id]: targetUser }));
    setFriendRequests((prev) => prev.filter((u) => u.id !== targetUser.id));

    if (registeredUser) {
      await fetch('/api/friendships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', senderId: registeredUser.id, targetId: targetUser.id })
      });
    }

    setBusyNotice(`🎉 You are now friends with ${targetUser.name}!`);
    if (soundEnabled) playSound('notification');
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
    if (replyingTo) {
      content = `💬 Replying to @${replyingTo.sender.name}: "${replyingTo.text.slice(0, 40)}"\n${content}`;
      setReplyingTo(null);
    }
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
    saveMessageToDb({ id: msgId, roomId, senderId: registeredUser.id, text: content });
    setInputText('');

    if (isAi) {
      setIsAiThinking(true);
      const threadContext = activeChat.map(m => ({ sender: m.sender.name, text: m.text }));
      const aiReplyText = await askGeminiWithThreadContext(content, threadContext);
      setIsAiThinking(false);

      const aiMsgId = `msg_${Date.now()}_ai`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        roomId: 'pulse_ai_bot',
        sender: { id: AI_BOT_USER.id, name: AI_BOT_USER.name, avatar: AI_BOT_USER.avatar },
        text: aiReplyText,
        timestamp: Date.now(),
        status: 'read'
      };
      setChatMessages((prev) => [...prev, aiMsg]);
      saveMessageToDb({ id: aiMsgId, roomId: 'pulse_ai_bot', senderId: AI_BOT_USER.id, text: aiReplyText });
    } else {
      sigRef.current?.sendDirectMessage(selectedContact.id, content, msgId);
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!selectedContact) return;
    setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: '🚫 This message was deleted', isDeleted: true } : m));
    deleteMessageFromDb(msgId);
    if (selectedContact.id !== AI_BOT_USER.id) {
      sigRef.current?.deleteMessage(msgId, selectedContact.id);
    }
  };

  const handleInlineAiEnhance = async (style: 'professional' | 'concise' | 'casual' | 'translate') => {
    if (!inputText.trim()) return;
    setShowAiMenu(false);
    setIsAiThinking(true);

    const targetContext = replyingTo ? replyingTo.text : undefined;
    let enhanced = '';
    if (style === 'translate') enhanced = await translateText(inputText.trim(), 'Spanish');
    else enhanced = await rephraseWithContext(inputText.trim(), targetContext, style);

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

  // Real-time Database Users & Friendships List
  const [allDbUsers, setAllDbUsers] = useState<User[]>([]);

  /* Poll Database Users, Friendships & Heartbeat */
  useEffect(() => {
    if (!registeredUser) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: registeredUser.id })
        });
      } catch (e) {}
    };

    const fetchUsersAndFriendships = async () => {
      try {
        const [usersRes, friendRes] = await Promise.all([
          fetch(`/api/users?currentUserId=${registeredUser.id}`),
          fetch(`/api/friendships?userId=${registeredUser.id}`)
        ]);

        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (uData.users) setAllDbUsers(uData.users);
        }

        if (friendRes.ok) {
          const fData = await friendRes.json();
          if (fData.acceptedFriends) {
            setFriends(fData.acceptedFriends.map((f: any) => f.id));
          }
          if (fData.pendingIncomingRequests) {
            setFriendRequests(fData.pendingIncomingRequests);
          }
          if (fData.pendingOutgoingRequests) {
            setSentRequests(fData.pendingOutgoingRequests);
          }
        }
      } catch (e) {}
    };

    sendHeartbeat();
    fetchUsersAndFriendships();

    const interval = setInterval(() => {
      sendHeartbeat();
      fetchUsersAndFriendships();
    }, 2500);

    return () => clearInterval(interval);
  }, [registeredUser]);

  /* Reactive Status Fusion with Signaling Presence */
  const dbUsersExcludingSelf = allDbUsers.filter((u) => u.id !== registeredUser?.id);
  const mergedUsers = dbUsersExcludingSelf.map(u => {
    const isOnlineViaSig = onlineUsers.some(o => o.id === u.id);
    return {
      ...u,
      status: (isOnlineViaSig || u.status === 'online') ? ('online' as const) : ('offline' as const)
    };
  });

  const sortedDbUsers = [...mergedUsers].sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return 0;
  });

  /* Strictly ONLY ACCEPTED Friends (and PulseAI) can message or call */
  const acceptedFriendObjects = sortedDbUsers.filter(u => friends.includes(u.id));
  const contactsList = [AI_BOT_USER, ...acceptedFriendObjects];
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

  const handleLoginSuccess = (dbUser: any) => {
    const userObj = {
      id: dbUser.id,
      name: dbUser.name || dbUser.full_name,
      username: dbUser.username,
      phone: dbUser.phone || dbUser.phone_number,
      avatar: dbUser.avatar || dbUser.avatar_url || selectedAvatar,
      bio: dbUser.bio || 'SyncPulse Pro User',
      role: dbUser.role || 'user',
      status: 'online'
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('syncpulse_session', JSON.stringify(userObj));
    }

    setRegisteredUser(userObj as any);
    sigRef.current?.connect();
    sigRef.current?.register(userObj as any);
  };

  /* 1. Splash View */
  if (showSplash) {
    return <SplashView splashProgress={splashProgress} />;
  }

  /* 2. Login View */
  if (!registeredUser) {
    return (
      <LoginView
        userName={userName} setUserName={setUserName}
        userHandle={userHandle} setUserHandle={setUserHandle}
        userPhone={userPhone} setUserPhone={setUserPhone}
        userRole={userRole} setUserRole={setUserRole}
        selectedAvatar={selectedAvatar} setSelectedAvatar={setSelectedAvatar}
        AVATAR_PRESETS={AVATAR_PRESETS}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  /* 3. Main App Workspace */
  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-black">
      <input type="file" ref={fileInputRef} onChange={() => {}} className="hidden" />

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
            <p className="text-xs text-red-400 mt-1 font-medium flex items-center gap-1.5 justify-center">
              <AnimatedDialRingIcon size={16} /> Calling ({outgoingCall.isVideo ? 'Video' : 'Voice'})...
            </p>
            <button onClick={leaveCall} className="mt-6 app-btn p-3 rounded-full bg-red-600 text-white">
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}

      {busyNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl matte-card text-white text-xs font-medium shadow-2xl flex items-center gap-2">
          <AnimatedBellIcon size={15} /> {busyNotice}
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
            <div className="pointer-events-auto flex items-center gap-2">
              <NetworkQualityBadge quality={networkQuality.quality} rttMs={networkQuality.rttMs} bitrateKbps={networkQuality.bitrateKbps} />
            </div>
          </div>

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
          {/* Navigation Sidebar Component */}
          <Sidebar
            screen={screen}
            setScreen={setScreen}
            setSelectedContact={setSelectedContact}
            registeredUser={registeredUser}
            friendRequestsCount={friendRequests.length}
            handleLogout={handleLogout}
          />

          {/* Sub-View 1: CHATS */}
          {screen === 'chats' && (
            <div className="flex-1 flex h-full overflow-hidden">
              <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col shrink-0 h-full p-3 bg-[#08090c] border-r border-white/10`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <img src={registeredUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                    <h2 className="text-base font-bold text-white tracking-tight">Chats</h2>
                  </div>
                  <button onClick={() => setScreen('friends')} className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center" title="Add Contact / Friend">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="relative mb-3">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages & contacts..." className="matte-input !py-1.5 text-xs pl-8" />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {filteredContacts.map((c) => {
                    const isSel = selectedContact?.id === c.id;
                    const last = getLastMsg(c);
                    const unread = getUnreadCount(c);
                    const isAi = c.id === AI_BOT_USER.id;
                    const isOnline = c.status === 'online' || isAi;

                    return (
                      <div key={c.id} onClick={() => setSelectedContact(c)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${isSel ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'}`}>
                        <div className="relative shrink-0">
                          <img src={c.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: isOnline ? '#30d158' : '#8e8e93', border: '2px solid #08090c' }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate text-white flex items-center gap-1">
                              {c.name} {isAi && <AiSparkleIcon size={12} />}
                            </span>
                            {last && (
                              <span className="text-[10px] shrink-0 font-medium text-slate-500">
                                {new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[11px] truncate text-slate-400 font-normal">
                              {last ? (last.isDeleted ? '🚫 Message deleted' : (last.isEdited ? `${last.text} (edited)` : last.text)) : (isAi ? 'Ask PulseAI anything...' : 'Tap to open chat')}
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

              {/* Active Chat Thread */}
              {selectedContact ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0e12]">
                  <div className="flex items-center justify-between px-4 h-14 shrink-0 bg-[#08090c] border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => setSelectedContact(null)} className="md:hidden p-1 text-slate-400">
                        <ArrowLeft size={16} />
                      </button>
                      <img src={selectedContact.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1">
                          {selectedContact.name} {selectedContact.id === AI_BOT_USER.id && <AiSparkleIcon size={12} />}
                        </h4>
                        <span className={`text-[10px] ${selectedContact.status === 'online' || selectedContact.id === AI_BOT_USER.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {selectedContact.status === 'online' || selectedContact.id === AI_BOT_USER.id ? '● Active Now' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={handleSummarizeChat} className="p-2 text-slate-400 hover:text-white" title="AI Summarize"><Bot size={16} /></button>
                      {selectedContact.id !== AI_BOT_USER.id && (
                        <>
                          <button onClick={() => startCall(selectedContact, false)} className="p-2 text-slate-400 hover:text-emerald-400"><Phone size={16} /></button>
                          <button onClick={() => startCall(selectedContact, true)} className="p-2 text-slate-400 hover:text-red-400"><Video size={16} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {activeChat.map((msg) => {
                      const isMe = msg.sender.id === registeredUser.id;
                      const emojiOnly = isOnlyEmoji(msg.text);

                      return (
                        <div key={msg.id} className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'} anim-slide-up`}>
                          {!msg.isDeleted && (
                            <div className={`absolute -top-3.5 ${isMe ? 'right-2' : 'left-2'} hidden group-hover:flex items-center gap-1 z-30 px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 shadow-lg`}>
                              {EMOJI_REACTIONS.map(r => (
                                <button key={r.type} onClick={() => handleAddReaction(msg.id, r.label)} className="text-xs hover:scale-125 px-0.5">
                                  <AnimatedReactionIcon type={r.type as any} size={14} />
                                </button>
                              ))}
                              <button onClick={() => setReplyingTo(msg)} className="p-0.5 text-slate-400 hover:text-white" title="Reply"><Reply size={12} /></button>
                              {isMe && (
                                <button onClick={() => handleDeleteMessage(msg.id)} className="p-0.5 text-slate-400 hover:text-red-400" title="Delete"><Trash2 size={12} /></button>
                              )}
                            </div>
                          )}

                          {emojiOnly ? (
                            <div className="text-4xl py-1">{msg.text}</div>
                          ) : (
                            <div className={`max-w-[80%] md:max-w-[65%] px-3.5 py-2 text-xs leading-relaxed ${isMe ? 'bg-red-500 text-white rounded-2xl rounded-tr-xs' : 'matte-card text-white rounded-2xl rounded-tl-xs'}`}>
                              <p className={`break-words whitespace-pre-line ${msg.isDeleted ? 'italic text-slate-400' : ''}`}>{msg.text}</p>
                              
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {msg.reactions.map((r, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 border border-white/10 text-white">
                                      {r.emoji}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-red-100' : 'text-slate-500'}`}>
                                {msg.isEdited && <span className="italic mr-0.5">(edited)</span>}
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && <AnimatedReadTickIcon status={msg.status} size={14} />}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isAiThinking && (
                      <div className="flex justify-start">
                        <div className="matte-card px-3 py-2 text-xs text-red-400 flex items-center gap-1.5">
                          <AiSparkleIcon size={14} className="animate-spin" /> PulseAI is thinking...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Bar */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="px-3 py-2.5 flex items-center gap-2 bg-[#08090c] border-t border-white/10">
                    <button type="button" onClick={() => setShowAiMenu(!showAiMenu)} className="p-1.5 text-red-400 hover:scale-110 transition-transform">
                      <AiSparkleIcon size={18} />
                    </button>
                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type a message..." className="matte-input flex-1 !py-2 text-xs" />
                    <button type="submit" disabled={!inputText.trim()} className="app-btn app-btn-primary p-2 rounded-xl disabled:opacity-30"><Send size={15} /></button>
                  </form>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#0d0e12]">
                  <AiSparkleIcon size={36} />
                  <p className="text-xs text-slate-400 mt-2">Select an accepted friend or PulseAI to start chatting</p>
                </div>
              )}
            </div>
          )}

          {/* Sub-View 2: CALLING STUDIO */}
          {screen === 'calls' && (
            <div className="flex-1 flex flex-col h-full bg-[#0d0e12] p-5">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><PhoneCall size={16} className="text-red-400" /> Calling Studio</h2>
              <div className="matte-card p-4 space-y-3 max-w-md">
                <input type="text" value={groupRoomInput} onChange={(e) => setGroupRoomInput(e.target.value)} placeholder="Room Name..." className="matte-input text-xs" />
                <button onClick={() => joinGroup(true)} className="app-btn app-btn-primary px-4 py-2 text-xs">Join Room</button>
              </div>
            </div>
          )}

          {/* Sub-View 3: FRIENDS NETWORK */}
          {screen === 'friends' && (
            <FriendsView
              friendsTab={friendsTab} setFriendsTab={setFriendsTab}
              others={sortedDbUsers} friendUserObjects={acceptedFriendObjects}
              friendRequests={friendRequests} sentRequests={sentRequests}
              isFriend={isFriend} sendFriendRequest={sendFriendRequest}
              acceptFriendRequest={acceptFriendRequest} rejectFriendRequest={rejectFriendRequest}
              setSelectedContact={setSelectedContact} setScreen={setScreen}
              startCall={startCall}
            />
          )}

          {/* Sub-View 4: AI STUDIO */}
          {screen === 'ai-studio' && (
            <AiStudioView
              aiPolishInput={aiPolishInput} setAiPolishInput={setAiPolishInput}
              aiPolishOutput={aiPolishOutput} setAiPolishOutput={setAiPolishOutput}
              isAiThinking={isAiThinking} setIsAiThinking={setIsAiThinking}
              rephraseWithContext={rephraseWithContext}
            />
          )}

          {/* Sub-View 5: ADMIN DASHBOARD */}
          {screen === 'admin' && (
            <AdminDashboardView
              adminTab={adminTab} setAdminTab={setAdminTab}
              dbUsersList={dbUsersList} setDbUsersList={setDbUsersList}
              dbMessagesList={dbMessagesList} setDbMessagesList={setDbMessagesList}
              onlineUsers={onlineUsers} activeRoomId={activeRoomId}
              fetchAllUsersFromDb={fetchAllUsersFromDb}
              fetchAllMessagesFromDb={fetchAllMessagesFromDb}
              handleAdminToggleUserRole={async () => {}}
              handleAdminToggleUserSuspension={async () => {}}
              handleAdminDeleteUser={async () => {}}
              handleAdminDeleteMessage={async () => {}}
              AVATAR_PRESETS={AVATAR_PRESETS}
            />
          )}

          {/* Sub-View 6: PROFILE */}
          {screen === 'profile' && (
            <div className="flex-1 flex flex-col h-full bg-[#0d0e12] p-5">
              <div className="matte-card p-6 max-w-md mx-auto w-full space-y-4">
                <div className="flex items-center gap-4">
                  <img src={registeredUser.avatar} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-red-500" />
                  <div>
                    <h3 className="text-base font-bold text-white">{registeredUser.name}</h3>
                    <p className="text-xs text-slate-400">@{registeredUser.username || 'user'}</p>
                    <p className="text-xs text-slate-400 mt-1">{registeredUser.bio}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full py-2 rounded-xl text-xs bg-red-500/20 text-red-400 font-bold">Logout</button>
              </div>
            </div>
          )}

          {/* Sub-View 7: SETTINGS */}
          {screen === 'settings' && (
            <div className="flex-1 flex flex-col h-full bg-[#0d0e12] p-5 space-y-3">
              <h2 className="text-sm font-bold text-white">Settings</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button key={t.key} onClick={() => setTheme(t.key)} className="p-3 rounded-xl matte-card text-xs text-white text-left font-semibold">{t.label}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
