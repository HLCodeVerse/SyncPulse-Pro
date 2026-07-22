'use client';

import React from 'react';
import { AnimatedBellIcon } from '../../../../packages/icons/src/AnimatedIcons';

export function AiSparkleIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="url(#aiGrad)" strokeWidth="1.5" strokeDasharray="3 3" className="animate-spin" style={{ animationDuration: '6s' }} />
      <path d="M12 3V6M12 18V21M3 12H6M18 12H21M6.343 6.343L8.464 8.464M15.536 15.536L17.657 17.657M6.343 17.657L8.464 15.536M15.536 8.464L17.657 6.343" stroke="url(#aiGrad)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 8L13.2 10.8L16 12L13.2 13.2L12 16L10.8 13.2L8 12L10.8 10.8L12 8Z" fill="url(#aiGrad)" className="animate-pulse" />
      <defs>
        <linearGradient id="aiGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff453a" />
          <stop offset="0.5" stopColor="#bf5af2" />
          <stop offset="1" stopColor="#30d158" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SplashView({ splashProgress }: { splashProgress: number }) {
  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center relative overflow-hidden anim-fade z-50 bg-black">
      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-sm w-full">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500 mb-4 shadow-lg">
          <AiSparkleIcon size={36} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
          SyncPulse <span className="text-red-500">Pro</span>
        </h1>
        <p className="text-[11px] text-slate-400 font-medium mb-6">AMOLED AI & WebRTC Network</p>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/10 mb-2">
          <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${splashProgress}%` }} />
        </div>
      </div>
    </div>
  );
}
