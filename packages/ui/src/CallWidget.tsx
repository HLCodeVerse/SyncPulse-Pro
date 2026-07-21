import React, { useState } from 'react';
import { Phone, Video, X, MessageSquare } from 'lucide-react';

export interface CallWidgetProps {
  onStartCall: (isVideo: boolean) => void;
  onOpenChat: () => void;
  incomingCallFrom?: string;
  onAcceptIncomingCall?: () => void;
}

export const CallWidget: React.FC<CallWidgetProps> = ({
  onStartCall,
  onOpenChat,
  incomingCallFrom,
  onAcceptIncomingCall
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      {/* Incoming Call Toast Banner */}
      {incomingCallFrom && (
        <div className="bg-slate-900 border border-emerald-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-100">{incomingCallFrom} is calling...</span>
          <button
            onClick={onAcceptIncomingCall}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
          >
            Accept
          </button>
        </div>
      )}

      {/* Expanded Quick Action Popover */}
      {isOpen && (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-3 rounded-2xl shadow-2xl flex flex-col gap-2 animate-fade-in">
          <button
            onClick={() => { onStartCall(true); setIsOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
          >
            <Video size={16} /> Instant Video Call
          </button>

          <button
            onClick={() => { onStartCall(false); setIsOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all"
          >
            <Phone size={16} /> Voice Call
          </button>

          <button
            onClick={() => { onOpenChat(); setIsOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <MessageSquare size={16} /> Open Chat
          </button>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-indigo-400/40"
      >
        {isOpen ? <X size={24} /> : <Phone size={24} />}
      </button>
    </div>
  );
};
