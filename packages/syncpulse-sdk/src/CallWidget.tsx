import React, { useState } from 'react';
import { useSyncPulse } from './useSyncPulse';

export interface CallWidgetProps {
  userId: string;
  userName: string;
  targetUserId?: string;
  themeColor?: string;
}

export function CallWidget({ userId, userName, targetUserId, themeColor = '#ff453a' }: CallWidgetProps) {
  const { sdk, call } = useSyncPulse({ userId, userName });
  const [inCall, setInCall] = useState(false);

  const handleStartCall = () => {
    if (targetUserId) {
      call(targetUserId, true);
      setInCall(true);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-black/90 border border-white/10 text-white shadow-2xl backdrop-blur-xl max-w-xs w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: themeColor }} /> SyncPulse Calling Widget
        </h4>
      </div>

      {inCall ? (
        <div className="text-center py-4 text-xs font-semibold text-emerald-400">
          ● In Active Call...
        </div>
      ) : (
        <button
          onClick={handleStartCall}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105"
          style={{ background: themeColor }}
        >
          📞 Start Video Call
        </button>
      )}
    </div>
  );
}
