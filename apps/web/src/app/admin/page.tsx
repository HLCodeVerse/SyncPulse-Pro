'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, RefreshCw, Cpu, Trash2, Video, Server, Users, MessageSquare,
  Lock, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, Phone
} from 'lucide-react';
import { DbUser, DbMessage } from '../../lib/supabaseClient';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');

  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'messages' | 'rooms' | 'system'>('overview');
  const [dbUsersList, setDbUsersList] = useState<DbUser[]>([]);
  const [dbMessagesList, setDbMessagesList] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setDbUsersList(data.users);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchUsers().then(() => setLoading(false));
    }
  }, [isAuthenticated]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin123' || passcode === 'Chandan@9777767188') {
      setIsAuthenticated(true);
    } else {
      alert("Invalid Admin Passcode! Access Denied.");
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: nextRole })
    });
    setDbUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole as any } : u));
  };

  const handleToggleSuspension = async (userId: string, isSuspended: boolean) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isSuspended: !isSuspended })
    });
    setDbUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: !isSuspended } : u));
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Permanently delete this user from Supabase Postgres?")) {
      await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      setDbUsersList(prev => prev.filter(u => u.id !== userId));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-black p-4">
        <form onSubmit={handleAdminAuth} className="w-full max-w-sm matte-card p-6 space-y-4 border border-red-500/30">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <ShieldAlert size={24} />
            <h1 className="text-lg font-bold text-white tracking-tight">Admin Command Portal</h1>
          </div>
          <p className="text-xs text-slate-400">Separate Admin Route (`/admin`). Enter master passcode:</p>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••"
              className="matte-input !py-2 text-xs"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="app-btn app-btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2">
            <Lock size={15} /> Unlock Admin Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden bg-[#0a0b0e]">
      <header className="h-14 px-6 flex items-center justify-between bg-[#06070a] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white" title="Return to Main Workspace">
            <ArrowLeft size={16} />
          </a>
          <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight">SyncPulse Pro · Admin Control Center</h1>
            <span className="text-[10px] text-emerald-400 font-mono">/admin route · Supabase Postgres Connected</span>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          <button onClick={() => setAdminTab('overview')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'overview' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Overview</button>
          <button onClick={() => setAdminTab('users')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'users' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Users ({dbUsersList.length})</button>
          <button onClick={() => setAdminTab('messages')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'messages' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Messages</button>
          <button onClick={() => setAdminTab('system')} className={`px-3 py-1 rounded-lg text-xs font-medium ${adminTab === 'system' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>System</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {adminTab === 'overview' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Database Users</span>
                <h3 className="text-2xl font-extrabold text-white">{dbUsersList.length}</h3>
              </div>
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Supabase DB Host</span>
                <h3 className="text-xs font-bold text-emerald-400 font-mono truncate">aws-0-ap-southeast-2</h3>
              </div>
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">System Status</span>
                <h3 className="text-2xl font-extrabold text-emerald-400">ONLINE</h3>
              </div>
              <div className="matte-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Uptime</span>
                <h3 className="text-2xl font-extrabold text-purple-400">99.99%</h3>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'users' && (
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Supabase Postgres User Accounts</h2>
              <button onClick={fetchUsers} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 flex items-center gap-1.5">
                <RefreshCw size={13} /> Sync DB
              </button>
            </div>

            <div className="space-y-2">
              {dbUsersList.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 matte-card gap-3">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-white">{u.full_name}</h3>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold ${u.role === 'admin' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{u.role}</span>
                        {u.is_suspended && <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-black">Suspended</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5">@{u.username || 'user'} · Phone: {u.phone_number || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleToggleRole(u.id, u.role)} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white hover:bg-white/10 font-medium">
                      {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </button>
                    <button onClick={() => handleToggleSuspension(u.id, !!u.is_suspended)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${u.is_suspended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'system' && (
          <div className="max-w-5xl mx-auto matte-card p-6 space-y-3">
            <h2 className="text-xs font-bold text-white flex items-center gap-2"><Server size={16} className="text-red-400" /> Infrastructure Config</h2>
            <pre className="p-4 rounded-xl bg-black text-xs text-emerald-400 font-mono">
{`{
  "db_engine": "Supabase Postgres (aws-0-ap-southeast-2.pooler.supabase.com:6543)",
  "admin_route": "/admin",
  "signaling_dual_cluster": true,
  "ai_model": "Gemini 1.5 Flash"
}`}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
