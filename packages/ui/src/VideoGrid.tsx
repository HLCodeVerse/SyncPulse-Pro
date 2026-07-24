import React, { useEffect, useRef, useState } from 'react';
import { Participant } from '@webrtc/types';
import { Mic, MicOff, Video, VideoOff, MonitorPlay, RefreshCw, Zap, ZapOff } from 'lucide-react';

export interface VideoTileProps {
  stream?: MediaStream | null;
  participantName: string;
  isLocal?: boolean;
  audioMuted?: boolean;
  videoMuted?: boolean;
  avatar?: string;
  onSwitchCamera?: () => void;
  onToggleFlash?: (on: boolean) => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  participantName,
  isLocal = false,
  audioMuted = false,
  videoMuted = false,
  avatar,
  onSwitchCamera,
  onToggleFlash
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, videoMuted]);

  useEffect(() => {
    if (audioRef.current && stream && !isLocal) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
  }, [stream, isLocal]);

  const handlePiP = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(console.error);
      } else {
        videoRef.current.requestPictureInPicture().catch(console.error);
      }
    }
  };

  const handleSwitch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSwitchCamera?.();
  };

  const handleFlash = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !flashOn;
    setFlashOn(nextVal);
    onToggleFlash?.(nextVal);
  };

  return (
    <div className="relative w-full h-full min-h-[180px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center group">
      {!isLocal && stream && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
        />
      )}

      {stream && !videoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-indigo-500/30 flex items-center justify-center shadow-lg">
            {avatar ? (
              <img src={avatar} alt={participantName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xl font-semibold text-slate-300">
                {participantName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-400">{participantName} {isLocal && '(You)'}</p>
        </div>
      )}

      {/* Top right control overlays */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30 opacity-80 group-hover:opacity-100 transition-opacity">
        {/* PiP Button */}
        {stream && !videoMuted && (
          <button 
            onClick={handlePiP}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white hover:text-indigo-400 transition-colors pointer-events-auto border border-white/10"
            title="Picture-in-Picture"
          >
            <MonitorPlay size={12} />
          </button>
        )}
        
        {/* Switch Camera Button (Local only) */}
        {isLocal && stream && !videoMuted && onSwitchCamera && (
          <button 
            onClick={handleSwitch}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white hover:text-indigo-400 transition-colors pointer-events-auto border border-white/10"
            title="Switch Camera"
          >
            <RefreshCw size={12} />
          </button>
        )}

        {/* Toggle Flash/Torch Button (Local only) */}
        {isLocal && stream && !videoMuted && onToggleFlash && (
          <button 
            onClick={handleFlash}
            className={`p-1.5 bg-black/60 hover:bg-black/80 rounded-lg transition-colors pointer-events-auto border border-white/10 ${flashOn ? 'text-yellow-400' : 'text-white'}`}
            title="Toggle Flash"
          >
            {flashOn ? <Zap size={12} /> : <ZapOff size={12} />}
          </button>
        )}
      </div>

      {/* Name and Mute Badges */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <span className="px-3 py-1 bg-slate-950/70 backdrop-blur-md rounded-full text-[10px] font-medium text-slate-200 border border-slate-700/50 shadow-sm flex items-center gap-1.5">
          {participantName} {isLocal && '(You)'}
        </span>
        <div className="flex gap-1.5">
          <span className={`p-1 rounded-full text-xs backdrop-blur-md ${audioMuted ? 'bg-red-500/80 text-white' : 'bg-slate-950/70 text-emerald-400'}`}>
            {audioMuted ? <MicOff size={12} /> : <Mic size={12} />}
          </span>
          <span className={`p-1 rounded-full text-xs backdrop-blur-md ${videoMuted ? 'bg-red-500/80 text-white' : 'bg-slate-950/70 text-indigo-400'}`}>
            {videoMuted ? <VideoOff size={12} /> : <Video size={12} />}
          </span>
        </div>
      </div>
    </div>
  );
};

export interface VideoGridProps {
  localStream: MediaStream | null;
  localUser: { name: string; avatar?: string };
  localMediaState: { audio: boolean; video: boolean };
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
  screenStream?: MediaStream | null;
  onSwitchCamera?: () => void;
  onToggleFlash?: (on: boolean) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  localUser,
  localMediaState,
  remoteStreams,
  participants,
  screenStream,
  onSwitchCamera,
  onToggleFlash
}) => {
  const [spotlightId, setSpotlightId] = useState<string | 'local' | null>(null);

  const activeScreenShare = screenStream || Array.from(remoteStreams.values()).find((s) =>
    s.getVideoTracks().some((t) => t.label.toLowerCase().includes('screen') || t.label.toLowerCase().includes('display'))
  );

  // Presenter Spotlight View
  if (activeScreenShare) {
    return (
      <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4 items-stretch justify-center max-w-7xl mx-auto">
        {/* Main Hero Screen Share Stage */}
        <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-indigo-500/40 relative flex items-center justify-center min-h-[380px]">
          <video
            ref={(el) => { if (el) el.srcObject = activeScreenShare; }}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-indigo-600/90 backdrop-blur-md rounded-full text-xs font-semibold text-white shadow-md">
            📺 Presenter Screen Share
          </div>
        </div>

        {/* Side Strip of Camera Tiles */}
        <div className="w-full lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto max-h-[500px]">
          <div className="w-full h-44 shrink-0 rounded-2xl overflow-hidden">
            <VideoTile
              stream={localStream}
              participantName={localUser.name}
              avatar={localUser.avatar}
              isLocal={true}
              audioMuted={!localMediaState.audio}
              videoMuted={!localMediaState.video}
              onSwitchCamera={onSwitchCamera}
              onToggleFlash={onToggleFlash}
            />
          </div>
          {participants.map((p) => (
            <div key={p.socketId} className="w-full h-44 shrink-0 rounded-2xl overflow-hidden">
              <VideoTile
                stream={remoteStreams.get(p.socketId)}
                participantName={p.user.name}
                avatar={p.user.avatar}
                isLocal={false}
                audioMuted={!p.mediaState.audio}
                videoMuted={!p.mediaState.video}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Spotlight Receiver view
  if (spotlightId) {
    let spotlightStream: MediaStream | null = null;
    let spotlightName = '';
    let spotlightAvatar = '';
    let spotlightIsLocal = false;
    let spotlightAudioMuted = false;
    let spotlightVideoMuted = false;

    if (spotlightId === 'local') {
      spotlightStream = localStream;
      spotlightName = localUser.name;
      spotlightAvatar = localUser.avatar || '';
      spotlightIsLocal = true;
      spotlightAudioMuted = !localMediaState.audio;
      spotlightVideoMuted = !localMediaState.video;
    } else {
      const p = participants.find((p) => p.socketId === spotlightId);
      if (p) {
        spotlightStream = remoteStreams.get(p.socketId) || null;
        spotlightName = p.user.name;
        spotlightAvatar = p.user.avatar || '';
        spotlightIsLocal = false;
        spotlightAudioMuted = !p.mediaState.audio;
        spotlightVideoMuted = !p.mediaState.video;
      }
    }

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        {/* Spotlight Hero Video Tile */}
        <div 
          onClick={() => setSpotlightId(null)}
          className="w-full h-full flex-1 max-w-5xl rounded-3xl overflow-hidden cursor-pointer shadow-2xl border border-indigo-500/20"
          title="Click to exit spotlight"
        >
          <VideoTile
            stream={spotlightStream}
            participantName={spotlightName}
            avatar={spotlightAvatar}
            isLocal={spotlightIsLocal}
            audioMuted={spotlightAudioMuted}
            videoMuted={spotlightVideoMuted}
            onSwitchCamera={spotlightIsLocal ? onSwitchCamera : undefined}
            onToggleFlash={spotlightIsLocal ? onToggleFlash : undefined}
          />
        </div>

        {/* Small floating pip strip of other streams */}
        <div className="absolute bottom-6 right-6 z-50 flex gap-2 max-w-[85%] overflow-x-auto p-2 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
          {spotlightId !== 'local' && (
            <div 
              onClick={() => setSpotlightId('local')}
              className="w-24 h-18 md:w-32 md:h-24 shrink-0 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all border border-white/5"
            >
              <VideoTile
                stream={localStream}
                participantName={localUser.name}
                avatar={localUser.avatar}
                isLocal={true}
                audioMuted={!localMediaState.audio}
                videoMuted={!localMediaState.video}
                onSwitchCamera={onSwitchCamera}
                onToggleFlash={onToggleFlash}
              />
            </div>
          )}
          {participants.map((p) => {
            if (p.socketId === spotlightId) return null;
            return (
              <div 
                key={p.socketId}
                onClick={() => setSpotlightId(p.socketId)}
                className="w-24 h-18 md:w-32 md:h-24 shrink-0 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all border border-white/5"
              >
                <VideoTile
                  stream={remoteStreams.get(p.socketId)}
                  participantName={p.user.name}
                  avatar={p.user.avatar}
                  isLocal={false}
                  audioMuted={!p.mediaState.audio}
                  videoMuted={!p.mediaState.video}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Normal Grid Layout
  const totalPeers = participants.length;
  const gridColsClass =
    totalPeers <= 0
      ? 'grid-cols-1 max-w-4xl'
      : totalPeers === 1
      ? 'grid-cols-1 md:grid-cols-2 max-w-5xl'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl';

  return (
    <div className={`grid ${gridColsClass} gap-4 w-full h-full p-4 mx-auto items-center justify-center transition-all duration-300`}>
      <div 
        onClick={() => setSpotlightId('local')}
        className="cursor-pointer w-full h-full rounded-2xl overflow-hidden shadow-lg hover:scale-[1.01] transition-transform"
      >
        <VideoTile
          stream={localStream}
          participantName={localUser.name}
          avatar={localUser.avatar}
          isLocal={true}
          audioMuted={!localMediaState.audio}
          videoMuted={!localMediaState.video}
          onSwitchCamera={onSwitchCamera}
          onToggleFlash={onToggleFlash}
        />
      </div>

      {participants.map((p) => {
        const stream = remoteStreams.get(p.socketId);
        return (
          <div 
            key={p.socketId}
            onClick={() => setSpotlightId(p.socketId)}
            className="cursor-pointer w-full h-full rounded-2xl overflow-hidden shadow-lg hover:scale-[1.01] transition-transform"
          >
            <VideoTile
              stream={stream}
              participantName={p.user.name}
              avatar={p.user.avatar}
              isLocal={false}
              audioMuted={!p.mediaState.audio}
              videoMuted={!p.mediaState.video}
            />
          </div>
        );
      })}
    </div>
  );
};
