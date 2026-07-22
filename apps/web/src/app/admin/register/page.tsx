'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, UserCheck, Key, Lock, ArrowLeft } from 'lucide-react';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (masterKey !== 'admin123' && masterKey !== 'Chandan@9777767188') {
      setErrorMsg('Invalid Secret Master Authorization Key! Account creation rejected.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: adminName,
          username: adminUsername || adminName.toLowerCase().replace(/\s+/g, '_'),
          phone: adminPhone,
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
          bio: 'SyncPulse System Administrator'
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success && data.user) {
        // Upgrade role to admin in DB
        await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, role: 'admin' })
        });

        const adminSession = { ...data.user, role: 'admin', loggedInAt: new Date().toISOString() };
        if (typeof window !== 'undefined') {
          localStorage.setItem('syncpulse_admin_session', JSON.stringify(adminSession));
        }

        router.push('/admin');
      } else {
        setErrorMsg(data.error || 'Admin Registration failed.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg('Error creating admin account in database.');
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-[#050608] p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-5 my-auto relative z-10">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Provision Admin Credentials</h1>
          <p className="text-xs text-slate-400">Register new system administrator account into Postgres DB</p>
        </div>

        <div className="matte-card p-6 space-y-4 border border-red-500/30 bg-[#0b0c10]/90 backdrop-blur-2xl">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAdminRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Full Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. System Administrator"
                className="matte-input !py-2 text-xs"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Username</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin_dev"
                  className="matte-input !py-1.5 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Mobile Phone</label>
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+1 999 888"
                  className="matte-input !py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Secret Master Authorization Key</label>
              <input
                type="password"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="••••••••"
                className="matte-input !py-2 text-xs"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-2">
              {loading ? 'Creating DB Admin Record...' : <><UserCheck size={16} /> Register Admin Credentials</>}
            </button>
          </form>

          <div className="pt-3 text-center border-t border-white/5">
            <a href="/admin/login" className="text-xs text-slate-400 hover:text-white transition-colors">
              Already registered? <strong className="text-red-400 underline">Sign In</strong>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
