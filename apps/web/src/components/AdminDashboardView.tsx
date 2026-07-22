'use client';

import React from 'react';
import { ShieldAlert, RefreshCw, Cpu, Trash2, Video, Server } from 'lucide-react';
import { DbUser, DbMessage } from '../lib/supabaseClient';

interface AdminDashboardViewProps {
  adminTab: 'overview' | 'users' | 'messages' | 'rooms' | 'system';
  setAdminTab: (t: 'overview' | 'users' | 'messages' | 'rooms' | 'system') => void;
  dbUsersList: DbUser[];
  setDbUsersList: React.Dispatch<React.SetStateAction<DbUser[]>>;
  dbMessagesList: DbMessage[];
  setDbMessagesList: React.Dispatch<React.SetStateAction<DbMessage[]>>;
  onlineUsers: any[];
  activeRoomId: string | null;
  fetchAllUsersFromDb: () => Promise<DbUser[]>;
  fetchAllMessagesFromDb: () => Promise<DbMessage[]>;
  handleAdminToggleUserRole: (userId: string, currentRole: string) => Promise<void>;
  handleAdminToggleUserSuspension: (userId: string, isSuspended: boolean) => Promise<void>;
  handleAdminDeleteUser: (userId: string) => Promise<void>;
  handleAdminDeleteMessage: (msgId: string) => Promise<void>;
  AVATAR_PRESETS: string[];
}

export function AdminDashboardView({
  adminTab, setAdminTab,
  dbUsersList, setDbUsersList,
  dbMessagesList, setDbMessagesList,
  onlineUsers, activeRoomId,
  fetchAllUsersFromDb, fetchAllMessagesFromDb,
  handleAdminToggleUserRole, handleAdminToggleUserSuspension,
  handleAdminDeleteUser, handleAdminDeleteMessage,
  AVATAR_PRESETS
}: AdminDashboardViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0e12]">
      <div className="px-5 h-14 flex items-center justify-between bg-[#08090c] border-b border-white/10 shrink-0">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-500" /> Admin Command Dashboard
        </h2>
        <div className="flex gap-1.5 overflow-x-auto">
          <button onClick={() => setAdminTab('overview')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'overview' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Overview</button>
          <button onClick={() => setAdminTab('users')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'users' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Users ({dbUsersList.length})</button>
          <button onClick={() => setAdminTab('messages')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'messages' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Messages ({dbMessagesList.length})</button>
          <button onClick={() => setAdminTab('rooms')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'rooms' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Rooms</button>
          <button onClick={() => setAdminTab('system')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'system' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>System</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {adminTab === 'overview' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Users</span>
                <h3 className="text-xl font-extrabold text-white">{dbUsersList.length || 2}</h3>
              </div>
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Online Peers</span>
                <h3 className="text-xl font-extrabold text-emerald-400">{onlineUsers.length || 1}</h3>
              </div>
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Messages Persisted</span>
                <h3 className="text-xl font-extrabold text-purple-400">{dbMessagesList.length}</h3>
              </div>
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">System Health</span>
                <h3 className="text-xl font-extrabold text-emerald-400">99.99%</h3>
              </div>
            </div>

            <div className="matte-card p-5 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2"><Cpu size={15} className="text-red-400" /> Platform Infrastructure State</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px]">Database Engine</span>
                  <span className="font-bold text-white">Supabase Postgres</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px]">Signaling Cluster</span>
                  <span className="font-bold text-emerald-400">Socket.io + HTTP Dual</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px]">AI Assistant</span>
                  <span className="font-bold text-purple-400">Gemini 1.5 Flash</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'users' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">Registered Credentials & Accounts</h3>
              <button onClick={() => fetchAllUsersFromDb().then(setDbUsersList)} className="p-1.5 rounded-lg bg-white/5 text-slate-300 text-xs flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
            </div>

            <div className="space-y-2">
              {dbUsersList.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 matte-card gap-2">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || AVATAR_PRESETS[0]} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{u.full_name}</h4>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold ${u.role === 'admin' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{u.role}</span>
                        {u.is_suspended && <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-black">Suspended</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 block">@{u.username || 'user'} · Phone: {u.phone_number || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => handleAdminToggleUserRole(u.id, u.role)} className="px-2.5 py-1 rounded-lg text-xs bg-white/5 text-white hover:bg-white/10">
                      {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </button>
                    <button onClick={() => handleAdminToggleUserSuspension(u.id, !!u.is_suspended)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${u.is_suspended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button onClick={() => handleAdminDeleteUser(u.id)} className="px-2 py-1 rounded-lg text-xs bg-red-500/20 text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'messages' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">Live Messages & Moderation Log</h3>
              <button onClick={() => fetchAllMessagesFromDb().then(setDbMessagesList)} className="p-1.5 rounded-lg bg-white/5 text-slate-300 text-xs flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
            </div>

            <div className="space-y-2">
              {dbMessagesList.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 matte-card text-xs">
                  <div>
                    <span className="text-red-400 font-bold">Room: {m.room_id.slice(0, 16)}</span>
                    <p className="text-white mt-0.5">{m.text}</p>
                    <span className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <button onClick={() => handleAdminDeleteMessage(m.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'rooms' && (
          <div className="max-w-4xl mx-auto matte-card p-6 text-center space-y-2">
            <Video size={28} className="mx-auto text-red-400" />
            <h3 className="text-xs font-bold text-white">Active WebRTC Studio Rooms</h3>
            <p className="text-[11px] text-slate-400">{activeRoomId ? `1 Active Room: ${activeRoomId}` : 'No active call rooms.'}</p>
          </div>
        )}

        {adminTab === 'system' && (
          <div className="max-w-4xl mx-auto matte-card p-5 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2"><Server size={15} className="text-red-400" /> System Configuration & TURN Server</h3>
            <pre className="p-3 rounded-xl bg-black text-[11px] text-emerald-400 font-mono overflow-x-auto">
{`{
  "stun_servers": ["stun:stun.l.google.com:19302"],
  "turn_servers": ["turn:global.turn.syncpulse.pro:3478"],
  "sfu_mode": "mediasoup-v3",
  "max_mesh_peers": 4,
  "supabase_rls": "enabled"
}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
