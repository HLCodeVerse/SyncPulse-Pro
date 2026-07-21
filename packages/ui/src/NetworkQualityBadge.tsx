import React from 'react';
import { Signal, AlertTriangle } from 'lucide-react';

export interface NetworkQualityBadgeProps {
  quality: 'excellent' | 'good' | 'poor' | 'bad';
  rttMs?: number;
  bitrateKbps?: number;
}

export const NetworkQualityBadge: React.FC<NetworkQualityBadgeProps> = ({
  quality,
  rttMs = 0,
  bitrateKbps = 0
}) => {
  const getBadgeStyle = () => {
    switch (quality) {
      case 'excellent':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Excellent' };
      case 'good':
        return { color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30', label: 'Good' };
      case 'poor':
        return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Poor' };
      case 'bad':
        return { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'Bad Connection' };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md text-xs font-medium ${style.bg} ${style.color}`}>
      {quality === 'bad' ? <AlertTriangle size={14} className="animate-pulse" /> : <Signal size={14} />}
      <span>{style.label}</span>
      {rttMs > 0 && <span className="text-[10px] opacity-75">• {rttMs}ms</span>}
      {bitrateKbps > 0 && <span className="text-[10px] opacity-75">• {bitrateKbps} kbps</span>}
    </div>
  );
};
