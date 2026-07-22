'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Lock, UserCheck, Key, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminUsername, setAdminUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (passcode === 'admin123' || passcode === 'Chandan@9777767188') {
      const adminSession = {
        id: 'admin_001',
        username: adminUsername || 'admin',
        role: 'admin',
        loggedInAt: new Date().toISOString()
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('syncpulse_admin_session', JSON.stringify(adminSession));
      }
      setLoading(false);
      router.push('/admin');
    } else {
      setLoading(false);
      setErrorMsg('Invalid Master Passcode! Unauthorized access attempt logged.');
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-[#050608] p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-5 my-auto relative z-10">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Admin System Authentication</h1>
          <p className="text-xs text-slate-400">Sign in to access master command dashboard</p>
        </div>

        <div className="matte-card p-6 space-y-4 border border-red-500/30 bg-[#0b0c10]/90 backdrop-blur-2xl">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Administrator Username</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="e.g. admin"
                className="matte-input !py-2.5 text-xs"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Master Admin Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="matte-input !py-2.5 text-xs"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-2">
              {loading ? 'Authenticating...' : <><Lock size={15} /> Unlock Admin Panel</>}
            </button>
          </form>

          <div className="pt-3 flex items-center justify-between text-xs border-t border-white/5">
            <a href="/admin/register" className="text-slate-400 hover:text-white transition-colors">
              New Admin? <strong className="text-red-400 underline">Register Credentials</strong>
            </a>
            <a href="/" className="text-slate-500 hover:text-slate-300">
              Student App →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
