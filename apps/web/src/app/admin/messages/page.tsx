'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { DbMessage } from '../../../lib/supabaseClient';

export default function AdminMessagesPage() {
  const [messagesList, setMessagesList] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/messages');
      if (res.ok) {
        const data = await res.json();
        if (data.messages) setMessagesList(data.messages);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDeleteMessage = async (msgId: string) => {
    await fetch(`/api/admin/messages?msgId=${msgId}`, { method: 'DELETE' });
    setMessagesList(prev => prev.filter(m => m.id !== msgId));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Live Message Moderation Log</h1>
          <p className="text-xs text-slate-400">Inspect real-time student messages across chat rooms and purge spam</p>
        </div>
        <button onClick={fetchMessages} className="px-3.5 py-2 rounded-xl bg-white/5 text-xs text-white hover:bg-white/10 flex items-center gap-1.5 font-medium border border-white/10">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Log
        </button>
      </div>

      <div className="space-y-3">
        {messagesList.length === 0 ? (
          <div className="matte-card p-8 text-center text-xs text-slate-400 border border-white/10">
            No live messages logged in Postgres database. Send a message in the chat workspace to test live logging!
          </div>
        ) : (
          messagesList.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 matte-card border border-white/10 text-xs">
              <div>
                <span className="text-red-400 font-bold">Room: {m.room_id.slice(0, 20)}</span>
                <p className="text-white mt-1 font-medium">{m.text}</p>
                <span className="text-[10px] text-slate-500 block mt-1">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <button onClick={() => handleDeleteMessage(m.id)} className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
