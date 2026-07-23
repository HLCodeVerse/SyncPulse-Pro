'use client';

import React, { useEffect, useState } from 'react';
import { AnimatedBellIcon } from '../../../../packages/icons/src/AnimatedIcons';

export function AiSparkleIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`} style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.4))' }}>
      <style>{`
        @keyframes aiCoreScale { 0%, 100% { transform: scale(1); opacity: 0.95; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes aiRingSpin1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes aiRingSpin2 { from { transform: rotate(120deg); } to { transform: rotate(480deg); } }
        @keyframes aiSparklePulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>
      
      {/* Outer Orbit Rings */}
      <circle cx="12" cy="12" r="10" stroke="url(#aiNeonGrad)" strokeWidth="1" strokeDasharray="2 3" style={{ transformOrigin: '12px 12px', animation: 'aiRingSpin1 8s linear infinite' }} />
      <circle cx="12" cy="12" r="8" stroke="url(#aiNeonGrad)" strokeWidth="1.2" strokeDasharray="5 2" style={{ transformOrigin: '12px 12px', animation: 'aiRingSpin2 5s linear infinite' }} />
      
      {/* Central Morphing Core */}
      <path d="M12 6.5C8.96 6.5 6.5 8.96 6.5 12C6.5 15.04 8.96 17.5 12 17.5C15.04 17.5 17.5 15.04 17.5 12C17.5 8.96 15.04 6.5 12 6.5ZM12 8.5C13.93 8.5 15.5 10.07 15.5 12C15.5 13.93 13.93 15.5 12 15.5C10.07 15.5 8.5 13.93 8.5 12C8.5 10.07 10.07 8.5 12 8.5Z" fill="url(#aiNeonGrad)" style={{ transformOrigin: '12px 12px', animation: 'aiCoreScale 2.4s ease-in-out infinite' }} />
      
      {/* Spark Dots */}
      <circle cx="6" cy="6" r="1" fill="#00f0ff" style={{ animation: 'aiSparklePulse 1.5s ease-in-out infinite', animationDelay: '0ms' }} />
      <circle cx="18" cy="6" r="1" fill="#ff007f" style={{ animation: 'aiSparklePulse 1.5s ease-in-out infinite', animationDelay: '500ms' }} />
      <circle cx="18" cy="18" r="1.2" fill="#7b2cbf" style={{ animation: 'aiSparklePulse 1.8s ease-in-out infinite', animationDelay: '900ms' }} />
      <circle cx="6" cy="18" r="0.8" fill="#00f0ff" style={{ animation: 'aiSparklePulse 2s ease-in-out infinite', animationDelay: '300ms' }} />

      <defs>
        <linearGradient id="aiNeonGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00f0ff" />
          <stop offset="0.5" stopColor="#ff007f" />
          <stop offset="1" stopColor="#7b2cbf" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const PARTICLES = [
  { left: 6, size: 3, dur: 7.2, delay: 0.0, color: '#ff453a' },
  { left: 14, size: 2, dur: 9.1, delay: 1.2, color: '#bf5af2' },
  { left: 22, size: 4, dur: 6.4, delay: 2.4, color: '#30d158' },
  { left: 31, size: 2, dur: 8.3, delay: 0.6, color: '#ff453a' },
  { left: 39, size: 3, dur: 7.8, delay: 3.1, color: '#bf5af2' },
  { left: 47, size: 2, dur: 9.6, delay: 1.8, color: '#30d158' },
  { left: 55, size: 3, dur: 6.9, delay: 2.9, color: '#ff453a' },
  { left: 63, size: 2, dur: 8.7, delay: 0.3, color: '#bf5af2' },
  { left: 71, size: 4, dur: 7.5, delay: 1.5, color: '#30d158' },
  { left: 79, size: 2, dur: 9.0, delay: 2.1, color: '#ff453a' },
  { left: 87, size: 3, dur: 6.6, delay: 3.4, color: '#bf5af2' },
  { left: 93, size: 2, dur: 8.1, delay: 0.9, color: '#30d158' },
  { left: 10, size: 2, dur: 7.9, delay: 4.0, color: '#bf5af2' },
  { left: 58, size: 2, dur: 8.9, delay: 3.7, color: '#30d158' },
  { left: 84, size: 3, dur: 7.1, delay: 2.6, color: '#ff453a' },
];

export function SplashView({ splashProgress }: { splashProgress: number }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
      <style>{`
        @keyframes ringSpinX { from { transform: rotateX(70deg) rotateZ(0deg); } to { transform: rotateX(70deg) rotateZ(360deg); } }
        @keyframes ringSpinY { from { transform: rotateY(60deg) rotateZ(0deg); } to { transform: rotateY(60deg) rotateZ(-360deg); } }
        @keyframes ringSpinZ { from { transform: rotateZ(0deg); } to { transform: rotateZ(360deg); } }
        @keyframes coreGlow { 0%, 100% { box-shadow: 0 0 40px 6px rgba(255,69,58,0.35), 0 0 80px 20px rgba(191,90,242,0.2); } 50% { box-shadow: 0 0 60px 12px rgba(48,209,88,0.35), 0 0 100px 30px rgba(191,90,242,0.3); } }
        @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-90vh) scale(0.4); opacity: 0; } }
        @keyframes gridScroll { from { background-position-y: 0; } to { background-position-y: 60px; } }
        @keyframes sweep { 0% { transform: translateX(-120%) rotate(8deg); } 100% { transform: translateX(120%) rotate(8deg); } }
        @keyframes riseFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(220%); } }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(191,90,242,0.16) 0%, rgba(0,0,0,0) 60%)',
        }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 h-1/2"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          transform: 'perspective(400px) rotateX(60deg) translateY(0)',
          transformOrigin: 'bottom',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          animation: 'gridScroll 2.4s linear infinite',
        }}
      />

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `floatUp ${p.dur}s ease-in infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)',
          animation: 'sweep 3.2s ease-in-out infinite',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-sm w-full">
        <div style={{ perspective: '600px' }} className="relative w-28 h-28 mb-6 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: 'rgba(255,69,58,0.5)', animation: 'ringSpinX 5s linear infinite' }}
          />
          <div
            className="absolute inset-2 rounded-full border"
            style={{ borderColor: 'rgba(191,90,242,0.5)', animation: 'ringSpinY 4s linear infinite' }}
          />
          <div
            className="absolute inset-4 rounded-full border border-dashed"
            style={{ borderColor: 'rgba(48,209,88,0.5)', animation: 'ringSpinZ 6s linear infinite' }}
          />
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500 relative"
            style={{ animation: 'coreGlow 2.6s ease-in-out infinite' }}
          >
            <AiSparkleIcon size={36} />
          </div>
        </div>

        <h1
          className="text-2xl font-extrabold tracking-tight text-white mb-1"
          style={{ opacity: ready ? 1 : 0, animation: ready ? 'riseFade 0.6s ease-out' : 'none' }}
        >
          SyncPulse <span className="text-red-500">Pro</span>
        </h1>
        <p
          className="text-[11px] text-slate-400 font-medium mb-6 tracking-wide uppercase"
          style={{ opacity: ready ? 1 : 0, animation: ready ? 'riseFade 0.6s ease-out 0.1s backwards' : 'none' }}
        >
          AMOLED AI &amp; WebRTC Network
        </p>

        <div className="w-full relative bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/10 mb-2">
          <div
            className="h-full rounded-full transition-all duration-500 relative"
            style={{
              width: `${splashProgress}%`,
              background: 'linear-gradient(90deg, #ff453a, #bf5af2, #30d158)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                width: '40%',
                animation: 'shimmer 1.4s linear infinite',
              }}
            />
          </div>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">{Math.round(splashProgress)}%</span>
      </div>
    </div>
  );
}