'use client';

import React from 'react';
import { Users, UserPlus, MessageSquare, Video } from 'lucide-react';
import { User } from '@webrtc/sdk';

interface FriendsViewProps {
  friendsTab: 'find' | 'friends' | 'requests';
  setFriendsTab: (t: 'find' | 'friends' | 'requests') => void;
  others: User[];
  friendUserObjects: User[];
  friendRequests: User[];
  sentRequests: string[];
  isFriend: (userId: string) => boolean;
  sendFriendRequest: (u: User) => void;
  acceptFriendRequest: (u: User) => void;
  rejectFriendRequest: (u: User) => void;
  setSelectedContact: (u: User) => void;
  setScreen: (s: any) => void;
  startCall: (u: User, isVideo: boolean) => void;
}

export function FriendsView({
  friendsTab, setFriendsTab,
  others, friendUserObjects, friendRequests, sentRequests,
  isFriend, sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  setSelectedContact, setScreen, startCall
}: FriendsViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0e12]">
      <div className="px-5 h-14 flex items-center justify-between bg-[#08090c] border-b border-white/10 shrink-0">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><Users size={16} className="text-red-400" /> Friends Network</h2>
        <div className="flex gap-1.5">
          <button onClick={() => setFriendsTab('find')} className={`px-3 py-1 rounded-lg text-xs font-medium ${friendsTab === 'find' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Online ({others.length})</button>
          <button onClick={() => setFriendsTab('friends')} className={`px-3 py-1 rounded-lg text-xs font-medium ${friendsTab === 'friends' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Friends ({friendUserObjects.length})</button>
          <button onClick={() => setFriendsTab('requests')} className={`relative px-3 py-1 rounded-lg text-xs font-medium ${friendsTab === 'requests' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>
            Requests {friendRequests.length > 0 && <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-red-500 text-white">{friendRequests.length}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {friendsTab === 'find' && (
          others.length === 0 ? (
            <div className="matte-card p-8 text-center text-xs text-slate-400">
              No other users online right now. Open another browser tab to test live discovery!
            </div>
          ) : (
            others.map((u) => {
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
                    <span className="text-[10px] text-amber-400 font-semibold">Request Sent</span>
                  ) : (
                    <button onClick={() => sendFriendRequest(u)} className="app-btn app-btn-primary px-3 py-1.5 text-xs"><UserPlus size={13} /> Add Friend</button>
                  )}
                </div>
              );
            })
          )
        )}

        {friendsTab === 'friends' && friendUserObjects.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 matte-card">
            <div className="flex items-center gap-2.5">
              <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
              <div>
                <h4 className="text-xs font-bold text-white">{u.name}</h4>
                <span className={`text-[10px] ${u.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {u.status === 'online' ? '● Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSelectedContact(u); setScreen('chats'); }} className="p-2 rounded-lg border border-white/10 text-slate-300"><MessageSquare size={14} /></button>
              <button onClick={() => startCall(u, true)} className="p-2 rounded-lg bg-red-500 text-white"><Video size={14} /></button>
            </div>
          </div>
        ))}

        {friendsTab === 'requests' && (
          friendRequests.length === 0 ? (
            <div className="matte-card p-8 text-center text-xs text-slate-400">No pending friend requests</div>
          ) : (
            friendRequests.map((u) => (
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
            ))
          )
        )}
      </div>
    </div>
  );
}
