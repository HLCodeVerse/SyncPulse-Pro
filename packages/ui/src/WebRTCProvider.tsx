import React, { createContext, useContext } from 'react';
import { useWebRTC } from '@webrtc/sdk';

const WebRTCContext = createContext<ReturnType<typeof useWebRTC> | null>(null);

export interface WebRTCProviderProps {
  serverUrl: string;
  user: { id: string; name: string; avatar?: string } | null;
  children: React.ReactNode;
}

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ serverUrl, user, children }) => {
  const webrtc = useWebRTC({ signalingUrl: serverUrl, user });

  return (
    <WebRTCContext.Provider value={webrtc}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTCContext = () => {
  const ctx = useContext(WebRTCContext);
  if (!ctx) {
    throw new Error('useWebRTCContext must be used within a <WebRTCProvider>');
  }
  return ctx;
};
