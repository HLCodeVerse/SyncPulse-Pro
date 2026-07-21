import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff, PictureInPicture, PhoneCall } from 'lucide-react';

export interface ControlBarProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onTogglePiP?: () => void;
  onSwitchCallMode?: () => void;
  onEndCall: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  isChatOpen,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onTogglePiP,
  onSwitchCallMode,
  onEndCall
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-6 py-3 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-full shadow-2xl z-50 transition-all duration-300">
      {/* Mic Toggle */}
      <button
        onClick={onToggleAudio}
        className={`p-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
          isAudioMuted
            ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
            : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
        }`}
        title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {/* Camera Toggle */}
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
          isVideoMuted
            ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
            : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
        }`}
        title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
      </button>

      {/* Audio / Video Call Mode Switcher */}
      {onSwitchCallMode && (
        <button
          onClick={onSwitchCallMode}
          className="p-3 rounded-full bg-slate-800 text-amber-400 border border-slate-700 hover:bg-slate-700 transition-all hover:scale-105 active:scale-95"
          title="Switch Audio/Video Mode"
        >
          <PhoneCall size={18} />
        </button>
      )}

      {/* Screen Share */}
      <button
        onClick={onToggleScreenShare}
        className={`p-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
          isScreenSharing
            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
            : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
        }`}
        title={isScreenSharing ? 'Stop Presenting' : 'Share Screen'}
      >
        <Monitor size={18} />
      </button>

      {/* Picture-in-Picture Toggle */}
      {onTogglePiP && (
        <button
          onClick={onTogglePiP}
          className="p-3 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 hover:bg-slate-700 transition-all hover:scale-105 active:scale-95"
          title="Picture-in-Picture Mode"
        >
          <PictureInPicture size={18} />
        </button>
      )}

      {/* Chat Drawer Toggle */}
      <button
        onClick={onToggleChat}
        className={`p-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
          isChatOpen
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
        }`}
        title="In-call Chat"
      >
        <MessageSquare size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700 mx-1" />

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all duration-200 hover:scale-105 active:scale-95"
        title="Leave Call"
      >
        <PhoneOff size={18} />
      </button>
    </div>
  );
};
