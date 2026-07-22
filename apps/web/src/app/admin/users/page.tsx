'use client';

import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Trash2, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { DbUser } from '../../../lib/supabaseClient';

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsersList(data.users);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: nextRole })
    });
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole as any } : u));
  };

  const handleToggleSuspension = async (userId: string, isSuspended: boolean) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isSuspended: !isSuspended })
    });
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: !isSuspended } : u));
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Permanently delete this user from Supabase Postgres?")) {
      await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      setUsersList(prev => prev.filter(u => u.id !== userId));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">User Credentials Management</h1>
          <p className="text-xs text-slate-400">View registered student accounts, manage roles, and suspend users</p>
        </div>
        <button onClick={fetchUsers} className="px-3.5 py-2 rounded-xl bg-white/5 text-xs text-white hover:bg-white/10 flex items-center gap-1.5 font-medium border border-white/10">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Sync Database
        </button>
      </div>

      <div className="space-y-3">
        {usersList.map((u) => (
          <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 matte-card gap-3 border border-white/10">
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
              <button onClick={() => handleToggleRole(u.id, u.role)} className="px-3 py-1.5 rounded-xl text-xs bg-white/5 text-white hover:bg-white/10 font-medium">
                {u.role === 'admin' ? 'Demote' : 'Make Admin'}
              </button>
              <button onClick={() => handleToggleSuspension(u.id, !!u.is_suspended)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${u.is_suspended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {u.is_suspended ? 'Unsuspend' : 'Suspend'}
              </button>
              <button onClick={() => handleDeleteUser(u.id)} className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
