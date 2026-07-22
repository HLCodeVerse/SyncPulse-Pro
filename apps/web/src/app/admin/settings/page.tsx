'use client';

import React from 'react';
import { Settings, Server, ShieldCheck, Cpu } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">System Infrastructure Settings</h1>
        <p className="text-xs text-slate-400">Configure global STUN/TURN servers and database parameters</p>
      </div>

      <div className="matte-card p-6 space-y-4 border border-white/10">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Server size={16} className="text-red-400" /> STUN/TURN & Database Infrastructure JSON
        </h2>

        <pre className="p-4 rounded-2xl bg-black text-xs text-emerald-400 font-mono overflow-x-auto border border-white/5">
{`{
  "database_host": "aws-0-ap-southeast-2.pooler.supabase.com:6543",
  "database_name": "postgres",
  "admin_route": "/admin",
  "stun_servers": [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302"
  ],
  "turn_servers": [
    "turn:global.turn.syncpulse.pro:3478"
  ],
  "sfu_cluster": "mediasoup-v3",
  "max_mesh_peers": 4,
  "supabase_rls": "enabled"
}`}
        </pre>
      </div>
    </div>
  );
}
