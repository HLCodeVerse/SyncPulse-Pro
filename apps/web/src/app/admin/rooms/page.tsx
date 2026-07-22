'use client';

import React from 'react';
import { Video, ShieldAlert, Radio } from 'lucide-react';

export default function AdminRoomsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Active WebRTC Studio Rooms</h1>
          <p className="text-xs text-slate-400">Monitor active low-latency mesh video call rooms across peers</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 inline-flex items-center gap-1.5">
          <Radio size={13} className="animate-pulse" /> Studio Monitoring
        </span>
      </div>

      <div className="matte-card p-8 text-center space-y-3 border border-white/10">
        <Video size={36} className="mx-auto text-red-500" />
        <h2 className="text-sm font-bold text-white">Active WebRTC Rooms & Streams</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Currently no active multi-peer WebRTC video rooms running. When users initiate calls from the workspace, active rooms will render here live.
        </p>
      </div>
    </div>
  );
}
