import React from 'react';
import { User } from '@webrtc/types';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Video } from 'lucide-react';

export interface CallLogItem {
  id: string;
  contact: User;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  timestamp: number;
}

export interface CallHistoryViewProps {
  logs: CallLogItem[];
  onRedial: (contact: User, isVideo: boolean) => void;
}

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({ logs, onRedial }) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
          📜 Recent Call History & Logs ({logs.length})
        </h3>
        <span className="text-xs text-slate-500">Real-time socket call records</span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-2xl divide-y divide-slate-800/60 backdrop-blur-xl">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No call history yet. Start a 1:1 or group call!
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/40 rounded-2xl">
              <div className="flex items-center gap-3">
                <img
                  src={log.contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${log.contact.id}`}
                  alt={log.contact.name}
                  className="w-11 h-11 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{log.contact.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] mt-0.5">
                    {log.type === 'incoming' && (
                      <span className="text-emerald-400 flex items-center gap-1"><PhoneIncoming size={12} /> Incoming</span>
                    )}
                    {log.type === 'outgoing' && (
                      <span className="text-indigo-400 flex items-center gap-1"><PhoneOutgoing size={12} /> Outgoing</span>
                    )}
                    {log.type === 'missed' && (
                      <span className="text-red-400 flex items-center gap-1 font-semibold"><PhoneMissed size={12} /> Missed</span>
                    )}
                    <span className="text-slate-500">• {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRedial(log.contact, false)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 border border-slate-700 text-slate-300 transition-all"
                  title="Voice Call"
                >
                  <Phone size={16} />
                </button>
                <button
                  onClick={() => onRedial(log.contact, true)}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center gap-1.5 text-xs font-semibold px-3"
                >
                  <Video size={16} /> Redial
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
