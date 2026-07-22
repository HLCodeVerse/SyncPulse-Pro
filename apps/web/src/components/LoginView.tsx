'use client';

import React from 'react';
import { Radio } from 'lucide-react';
import { AiSparkleIcon } from './SplashView';

interface LoginViewProps {
  userName: string;
  setUserName: (v: string) => void;
  userHandle: string;
  setUserHandle: (v: string) => void;
  userPhone: string;
  setUserPhone: (v: string) => void;
  userRole: 'user' | 'admin';
  setUserRole: (v: 'user' | 'admin') => void;
  selectedAvatar: string;
  setSelectedAvatar: (v: string) => void;
  AVATAR_PRESETS: string[];
  handleRegister: (e: React.FormEvent) => void;
}

export function LoginView({
  userName, setUserName,
  userHandle, setUserHandle,
  userPhone, setUserPhone,
  userRole, setUserRole,
  selectedAvatar, setSelectedAvatar,
  AVATAR_PRESETS,
  handleRegister
}: LoginViewProps) {
  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col lg:flex-row overflow-hidden z-50 bg-black">
      <div className="hidden lg:flex w-1/2 h-full flex-col justify-between p-12 relative border-r border-white/10 bg-[#07080b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold">
            <AiSparkleIcon size={22} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">SyncPulse <span className="text-red-500">Pro</span></h2>
        </div>

        <div className="space-y-4 max-w-md">
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30 inline-flex items-center gap-1.5">
            <Radio size={13} className="animate-pulse" /> Live Supabase & WebRTC Platform
          </span>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Enterprise WebRTC & Real-time Admin Dashboard
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Ultra low-latency P2P video calls, real-time messaging, Supabase Postgres database persistence, mobile phone auth, and Admin Dashboard.
          </p>
        </div>

        <div className="text-[11px] text-slate-600 font-medium">
          © 2026 SyncPulse Pro · Modular Architecture
        </div>
      </div>

      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-black overflow-y-auto">
        <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4 my-auto">
          <div className="lg:hidden flex flex-col items-center text-center mb-1">
            <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white mb-2 shadow-lg">
              <AiSparkleIcon size={26} />
            </div>
            <h1 className="text-lg font-extrabold text-white">SyncPulse Pro</h1>
          </div>

          <div className="matte-card p-6 space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight">Sign In / Register</h2>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">Choose Profile Avatar</label>
              <div className="flex justify-between gap-2">
                {AVATAR_PRESETS.map((url, i) => (
                  <img key={i} src={url} alt="" onClick={() => setSelectedAvatar(url)} className="w-9 h-9 rounded-full object-cover cursor-pointer transition-all hover:scale-110" style={{ border: selectedAvatar === url ? '2px solid #ff453a' : '2px solid transparent' }} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Full Name</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Sarah Sanders" className="matte-input !py-1.5 text-xs" required autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Username</label>
                <input type="text" value={userHandle} onChange={(e) => setUserHandle(e.target.value)} placeholder="e.g. sarah_dev" className="matte-input !py-1.5 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Mobile Phone</label>
                <input type="text" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="+1 555 123 4567" className="matte-input !py-1.5 text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Account Access Role</label>
              <select value={userRole} onChange={(e) => setUserRole(e.target.value as any)} className="matte-input !py-1.5 text-xs text-white">
                <option value="user" className="bg-slate-900 text-white">Standard User</option>
                <option value="admin" className="bg-slate-900 text-white">System Admin (Access Dashboard)</option>
              </select>
            </div>

            <button type="submit" className="app-btn app-btn-primary w-full py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-2">
              <AiSparkleIcon size={16} /> Enter Platform
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
