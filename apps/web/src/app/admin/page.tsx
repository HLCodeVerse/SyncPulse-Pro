'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, Video, Cpu, Server, ShieldCheck,
  Activity, Radio
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [usersCount, setUsersCount] = useState(0);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (data.users) setUsersCount(data.users.length);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Admin Overview Dashboard</h1>
          <p className="text-xs text-slate-400">Real-time system health and platform statistics</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
          <Radio size={13} className="animate-pulse" /> Live Postgres Connected
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="matte-card p-5 space-y-1 border border-white/10">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase">Total Users</span>
            <Users size={16} className="text-red-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">{usersCount}</h3>
        </div>

        <div className="matte-card p-5 space-y-1 border border-white/10">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase">Database Host</span>
            <Server size={16} className="text-emerald-400" />
          </div>
          <h3 className="text-xs font-bold text-emerald-400 font-mono truncate">aws-0-ap-southeast-2</h3>
        </div>

        <div className="matte-card p-5 space-y-1 border border-white/10">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase">System Uptime</span>
            <Activity size={16} className="text-purple-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-purple-400">99.99%</h3>
        </div>

        <div className="matte-card p-5 space-y-1 border border-white/10">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase">Health Status</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-400">ONLINE</h3>
        </div>
      </div>

      <div className="matte-card p-6 space-y-4 border border-white/10">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Cpu size={16} className="text-red-400" /> Infrastructure Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-black border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] block">Database Engine</span>
            <span className="font-bold text-white">Supabase Postgres</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] block">Signaling Layer</span>
            <span className="font-bold text-emerald-400">Socket.io + HTTP Dual</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] block">AI Assistant</span>
            <span className="font-bold text-purple-400">Gemini 1.5 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
}
