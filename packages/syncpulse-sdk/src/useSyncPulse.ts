import { useEffect, useState } from 'react';
import { SyncPulseSDK, SyncPulseSDKConfig } from './index';

export function useSyncPulse(config?: SyncPulseSDKConfig) {
  const [sdk] = useState(() => new SyncPulseSDK());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (config) {
      sdk.init(config);
      setIsReady(true);
    }
  }, [config?.userId]);

  return {
    sdk,
    isReady,
    call: (targetUserId: string, isVideo = true) => sdk.call(targetUserId, isVideo),
    sendMessage: (targetUserId: string, text: string) => sdk.sendMessage(targetUserId, text),
    joinRoom: (roomId: string, isVideo = true) => sdk.joinRoom(roomId, isVideo)
  };
}
