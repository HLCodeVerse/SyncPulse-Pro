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
    <div className="fixed inset-0 bg-[#08090c]/90 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fade-in">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); }
          20%, 40%, 60%, 80% { transform: rotate(8deg); }
        }
        @keyframes wave-bounce {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1.1); }
        }
        .animate-shake {
          animation: shake 0.6s infinite ease-in-out;
        }
        .animate-wave-bar {
          animation: wave-bounce 1.0s infinite ease-in-out;
          transform-origin: bottom;
        }
      `}</style>

      <div className="bg-black/90 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center ring-1 ring-red-500/20">
        {/* Pulsing ring around avatar */}
        <div className="relative mb-6 mt-4">
          <div className="absolute -inset-4 rounded-full bg-red-500/10 animate-ping [animation-duration:2.5s]" />
          <div className="absolute -inset-8 rounded-full bg-red-500/5 animate-ping [animation-duration:2.5s] [animation-delay:0.8s]" />
          <div className="absolute -inset-2 rounded-full bg-red-500/20 animate-pulse [animation-duration:1.5s]" />
          <img
            src={caller.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${caller.id}`}
            alt={caller.name}
            className="relative w-24 h-24 rounded-full border-4 border-red-500/40 shadow-xl object-cover ring-2 ring-black"
          />
        </div>

        <h3 className="text-xl font-extrabold text-white tracking-tight">{caller.name}</h3>
        <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1.5 justify-center font-bold">
          {isVideo ? <Video size={16} className="text-red-400 animate-pulse" /> : <Phone size={16} className="text-red-400 animate-pulse" />}
          Incoming {isVideo ? 'Video' : 'Voice'} Call...
        </p>

        {/* Beautiful Animated Waveform Visualizer */}
        <div className="flex items-end justify-center gap-1 my-6 h-8 w-32 px-2 border-b border-white/5 pb-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
            const delays = ["0.1s", "0.4s", "0.2s", "0.6s", "0.3s", "0.5s", "0.15s", "0.35s"];
            const heights = ["h-3", "h-6", "h-2", "h-7", "h-4", "h-6", "h-3", "h-5"];
            return (
              <span 
                key={bar} 
                className={`w-1 bg-red-500 rounded-full animate-wave-bar ${heights[bar - 1]}`}
                style={{ animationDelay: delays[bar - 1] }}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-8 mt-4 w-full justify-center">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-2.5 group"
          >
            <div className="p-4 rounded-full bg-red-600/10 text-red-500 border border-red-500/30 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 group-hover:scale-110 shadow-lg group-hover:border-red-600">
              <PhoneOff size={24} />
            </div>
            <span className="text-xs text-slate-400 font-bold tracking-wide group-hover:text-slate-200">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2.5 group animate-shake"
          >
            <div className="p-4 rounded-full bg-emerald-600/10 text-emerald-500 border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 group-hover:scale-110 shadow-lg group-hover:border-emerald-600">
              <Phone size={24} />
            </div>
            <span className="text-xs text-slate-400 font-bold tracking-wide group-hover:text-slate-200">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
