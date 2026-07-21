import React, { useEffect, useRef } from 'react';
import { Participant } from '@webrtc/types';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

export interface VideoTileProps {
  stream?: MediaStream | null;
  participantName: string;
  isLocal?: boolean;
  audioMuted?: boolean;
  videoMuted?: boolean;
  avatar?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  participantName,
  isLocal = false,
  audioMuted = false,
  videoMuted = false,
  avatar
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full min-h-[240px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center group">
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
          <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500/30 flex items-center justify-center shadow-lg">
            {avatar ? (
              <img src={avatar} alt={participantName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-slate-300">
                {participantName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-400">{participantName} {isLocal && '(You)'}</p>
        </div>
      )}

      {/* Name and Mute Badges */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="px-3 py-1 bg-slate-950/70 backdrop-blur-md rounded-full text-xs font-medium text-slate-200 border border-slate-700/50 shadow-sm flex items-center gap-1.5">
          {participantName} {isLocal && '(You)'}
        </span>
        <div className="flex gap-1.5">
          <span className={`p-1.5 rounded-full text-xs backdrop-blur-md ${audioMuted ? 'bg-red-500/80 text-white' : 'bg-slate-950/70 text-emerald-400'}`}>
            {audioMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </span>
          <span className={`p-1.5 rounded-full text-xs backdrop-blur-md ${videoMuted ? 'bg-red-500/80 text-white' : 'bg-slate-950/70 text-indigo-400'}`}>
            {videoMuted ? <VideoOff size={14} /> : <Video size={14} />}
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
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  localUser,
  localMediaState,
  remoteStreams,
  participants,
  screenStream
}) => {
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
          <VideoTile
            stream={localStream}
            participantName={localUser.name}
            avatar={localUser.avatar}
            isLocal={true}
            audioMuted={!localMediaState.audio}
            videoMuted={!localMediaState.video}
          />
          {participants.map((p) => (
            <VideoTile
              key={p.socketId}
              stream={remoteStreams.get(p.socketId)}
              participantName={p.user.name}
              avatar={p.user.avatar}
              isLocal={false}
              audioMuted={!p.mediaState.audio}
              videoMuted={!p.mediaState.video}
            />
          ))}
        </div>
      </div>
    );
  }

  const totalPeers = participants.length;

  const gridColsClass =
    totalPeers <= 1
      ? 'grid-cols-1 max-w-4xl'
      : totalPeers === 2
      ? 'grid-cols-1 md:grid-cols-2 max-w-6xl'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl';

  return (
    <div className={`grid ${gridColsClass} gap-4 w-full h-full p-4 mx-auto items-center justify-center transition-all duration-300`}>
      {/* Local Video Tile */}
      <VideoTile
        stream={localStream}
        participantName={localUser.name}
        avatar={localUser.avatar}
        isLocal={true}
        audioMuted={!localMediaState.audio}
        videoMuted={!localMediaState.video}
      />

      {/* Remote Video Tiles */}
      {participants.map((p) => {
        const stream = remoteStreams.get(p.socketId);
        return (
          <VideoTile
            key={p.socketId}
            stream={stream}
            participantName={p.user.name}
            avatar={p.user.avatar}
            isLocal={false}
            audioMuted={!p.mediaState.audio}
            videoMuted={!p.mediaState.video}
          />
        );
      })}
    </div>
  );
};
