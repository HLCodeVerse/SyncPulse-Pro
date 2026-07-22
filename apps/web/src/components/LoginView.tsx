'use client';

import React, { useState } from 'react';
import { Radio, Lock, ShieldAlert, Sparkles, UserCheck, Phone, User as UserIcon, Key, ArrowRight } from 'lucide-react';
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
  onLoginSuccess: (userObj: any) => void;
}

export function LoginView({
  userName, setUserName,
  userHandle, setUserHandle,
  userPhone, setUserPhone,
  userRole, setUserRole,
  selectedAvatar, setSelectedAvatar,
  AVATAR_PRESETS,
  onLoginSuccess
}: LoginViewProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginQuery, setLoginQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrPhone: loginQuery || userName })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else if (data.notFound) {
        setErrorMsg('Account not found. Please create an account below.');
        setIsRegisterMode(true);
        setUserName(loginQuery);
      } else {
        setErrorMsg(data.error || 'Login failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setLoading(false);
      onLoginSuccess({ id: `u_${Date.now()}`, name: loginQuery || 'User', username: loginQuery, role: 'user', avatar: selectedAvatar });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: userName,
          username: userHandle || userName.toLowerCase().replace(/\s+/g, '_'),
          phone: userPhone,
          avatarUrl: selectedAvatar,
          bio: 'SyncPulse Pro Enterprise User'
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      onLoginSuccess({ id: `u_${Date.now()}`, name: userName, username: userHandle, phone: userPhone, role: 'user', avatar: selectedAvatar });
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col lg:flex-row overflow-hidden z-50 bg-black">
      {/* Left Showcase */}
      <div className="hidden lg:flex w-1/2 h-full flex-col justify-between p-12 relative border-r border-white/10 bg-[#06070a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
            <AiSparkleIcon size={22} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">SyncPulse <span className="text-red-500">Pro</span></h2>
        </div>

        <div className="space-y-4 max-w-md">
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30 inline-flex items-center gap-1.5">
            <Radio size={13} className="animate-pulse" /> Enterprise WebRTC &amp; AI Network
          </span>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Real-Time Low-Latency Communication Workspace
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Connect with peers, initiate HD video calls, and query Gemini AI assistant seamlessly.
          </p>
        </div>

        <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
          <span>© 2026 SyncPulse Pro Enterprise</span>
          <a href="/admin/login" className="text-[10px] text-slate-500 hover:text-red-400 underline flex items-center gap-1">
            <ShieldAlert size={12} /> Admin Portal Route
          </a>
        </div>
      </div>

      {/* Right Login/Register Form */}
      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-black overflow-y-auto relative">
        <div className="w-full max-w-sm space-y-4 my-auto relative z-10">
          <div className="lg:hidden flex flex-col items-center text-center mb-1">
            <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white mb-2 shadow-lg">
              <AiSparkleIcon size={26} />
            </div>
            <h1 className="text-lg font-extrabold text-white">SyncPulse Pro</h1>
          </div>

          <div className="matte-card p-6 space-y-4 border border-white/10 shadow-2xl backdrop-blur-2xl bg-[#0b0c10]/90">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-medium">
                {errorMsg}
              </div>
            )}

            {isRegisterMode ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white tracking-tight">Create Student Account</h2>
                  <button type="button" onClick={() => setIsRegisterMode(false)} className="text-xs text-red-400 font-semibold hover:underline">
                    Back to Login
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">Profile Avatar</label>
                  <div className="flex justify-between gap-2">
                    {AVATAR_PRESETS.map((url, i) => (
                      <img key={i} src={url} alt="" onClick={() => setSelectedAvatar(url)} className="w-9 h-9 rounded-full object-cover cursor-pointer transition-all hover:scale-110" style={{ border: selectedAvatar === url ? '2px solid #ff453a' : '2px solid transparent' }} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Full Display Name</label>
                  <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Sarah Sanders" className="matte-input !py-2 text-xs" required autoFocus />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Username</label>
                    <input type="text" value={userHandle} onChange={(e) => setUserHandle(e.target.value)} placeholder="sarah_dev" className="matte-input !py-1.5 text-xs" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Mobile Phone</label>
                    <input type="text" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="+1 555 1234" className="matte-input !py-1.5 text-xs" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-2">
                  {loading ? 'Creating Account...' : <><UserCheck size={16} /> Create Account</>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <h2 className="text-base font-bold text-white tracking-tight">Sign In to Workspace</h2>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Username, Phone or Full Name</label>
                  <input
                    type="text"
                    value={loginQuery}
                    onChange={(e) => setLoginQuery(e.target.value)}
                    placeholder="Enter registered username or phone..."
                    className="matte-input !py-2.5 text-xs"
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-2">
                  {loading ? 'Signing In...' : <><AiSparkleIcon size={16} /> Sign In</>}
                </button>

                <div className="pt-2 text-center border-t border-white/5">
                  <button type="button" onClick={() => setIsRegisterMode(true)} className="text-xs text-slate-400 hover:text-white transition-colors">
                    Don't have an account? <strong className="text-red-400 underline">Register here</strong>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
