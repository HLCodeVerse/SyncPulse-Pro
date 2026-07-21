import React from 'react';
import { User } from '@webrtc/types';
import { Phone, PhoneOff, Video } from 'lucide-react';

export interface CallModalProps {
  caller: User;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({ caller, isVideo, onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
        {/* Pulsing ring around avatar */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
          <img
            src={caller.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${caller.id}`}
            alt={caller.name}
            className="relative w-24 h-24 rounded-full border-4 border-indigo-500/50 shadow-xl object-cover"
          />
        </div>

        <h3 className="text-xl font-semibold text-slate-100">{caller.name}</h3>
        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5 justify-center">
          {isVideo ? <Video size={16} className="text-indigo-400" /> : <Phone size={16} className="text-emerald-400" />}
          Incoming {isVideo ? 'Video' : 'Voice'} Call...
        </p>

        <div className="flex items-center gap-6 mt-8 w-full justify-center">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 group-hover:bg-red-600 group-hover:text-white transition-all duration-200 group-hover:scale-110 shadow-lg">
              <PhoneOff size={24} />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-200">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 group-hover:scale-110 shadow-lg">
              <Phone size={24} />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-200">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
