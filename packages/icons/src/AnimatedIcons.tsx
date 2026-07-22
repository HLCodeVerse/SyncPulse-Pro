import React from 'react';

/* Hand-built Animated SVG Icon System for SyncPulse Pro */

interface IconProps {
  size?: number;
  className?: string;
}

/* 1. Animated Morphing Mic Icon */
export function AnimatedMicIcon({ isMuted, size = 18, className = '' }: IconProps & { isMuted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${className}`}>
      <rect x="9" y="3" width="6" height="11" rx="3" fill={isMuted ? '#ff453a' : 'currentColor'} className="transition-colors duration-300" />
      <path d="M5 10V11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18V21M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {isMuted && (
        <line x1="3" y1="3" x2="21" y2="21" stroke="#ff453a" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
      )}
    </svg>
  );
}

/* 2. Animated Morphing Camera Icon */
export function AnimatedCamIcon({ isMuted, size = 18, className = '' }: IconProps & { isMuted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${className}`}>
      <path d="M2 8C2 6.89543 2.89543 6 4 6H14C15.1046 6 16 6.89543 16 8V16C16 17.1046 15.1046 18 14 18H4C2.89543 18 2 17.1046 2 16V8Z" fill={isMuted ? '#ff453a' : 'currentColor'} className="transition-colors duration-300" />
      <path d="M16 11L22 7V17L16 13V11Z" fill="currentColor" />
      {isMuted && (
        <line x1="2" y1="2" x2="22" y2="22" stroke="#ff453a" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
      )}
    </svg>
  );
}

/* 3. Animated Dial Ring Icon */
export function AnimatedDialRingIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="10" stroke="#ff453a" strokeWidth="1.5" strokeDasharray="4 4" className="animate-spin" style={{ animationDuration: '4s' }} />
      <path d="M22 16.92V19.92C22 20.47 21.55 20.92 21 20.92C11.61 20.92 4 13.31 4 3.92C4 3.37 4.45 2.92 5 2.92H8C8.55 2.92 9 3.37 9 3.92C9 5.17 9.2 6.38 9.57 7.51C9.68 7.84 9.6 8.21 9.35 8.46L7.96 9.85C9.72 13.3 12.55 16.13 16 17.89L17.39 16.5C17.64 16.25 18.01 16.17 18.34 16.28C19.47 16.65 20.68 16.85 21.93 16.85C22.48 16.85 22.93 17.3 22.93 17.85V16.92Z" fill="#ff453a" className="animate-bounce" />
    </svg>
  );
}

/* 4. Animated Read Receipt Ticks */
export function AnimatedReadTickIcon({ status = 'sent', size = 16 }: IconProps & { status?: 'sent' | 'delivered' | 'read' }) {
  const isRead = status === 'read';
  const isDelivered = status === 'delivered' || isRead;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 transition-all duration-300">
      <path d="M5 12L10 17L20 7" stroke={isRead ? '#30d158' : '#8e8e93'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300" />
      {isDelivered && (
        <path d="M10 12L13 15L22 5" stroke={isRead ? '#30d158' : '#8e8e93'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300" />
      )}
    </svg>
  );
}

/* 5. Morphing SVG Reaction Icons with Particle Burst */
export function AnimatedReactionIcon({ type, size = 18 }: { type: 'thumbs' | 'heart' | 'laugh' | 'gasp' | 'sad' | 'fire'; size?: number }) {
  if (type === 'heart') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#ff453a" className="hover:scale-125 transition-transform duration-200 animate-pulse">
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
      </svg>
    );
  }
  if (type === 'fire') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#ff9f0a" className="hover:scale-125 transition-transform duration-200">
        <path d="M13.5 0.67C13.5 0.67 14.24 3.32 12.67 5.76C11.1 8.2 8.35 9.17 8.35 12.18C8.35 14.21 9.97 15.85 12 15.85C14.03 15.85 15.65 14.21 15.65 12.18C15.65 8.93 13.5 0.67 13.5 0.67ZM11.71 19.33C8.42 19.12 5.79 16.38 5.79 13.03C5.79 10.74 6.94 8.71 8.7 7.45C8.44 8.29 8.35 9.19 8.47 10.08C8.84 12.87 11.14 15.03 13.94 15.25C13.9 15.52 13.88 15.79 13.88 16.07C13.88 17.86 15.34 19.33 17.13 19.33C17.43 19.33 17.72 19.29 18 19.2C16.89 21.46 14.53 23 11.71 19.33Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#30d158" className="hover:scale-125 transition-transform duration-200">
      <path d="M1 21H5V9H1V21ZM23 10C23 8.9 22.1 8 21 8H14.69L15.64 3.43L15.67 3.11C15.67 2.7 15.5 2.32 15.23 2.05L14.17 1L7.58 7.59C7.22 7.95 7 8.45 7 9V19C7 20.1 7.9 21 9 21H18C18.83 21 19.54 20.5 19.84 19.78L22.86 12.73C22.95 12.5 23 12.26 23 12V10Z" />
    </svg>
  );
}

/* 6. Continuous Animated Bell Icon */
export function AnimatedBellIcon({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 animate-bounce ${className}`}>
      <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="#ff453a" />
    </svg>
  );
}
