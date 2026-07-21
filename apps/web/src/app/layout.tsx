import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SyncPulse Pro — Enterprise WebRTC & AI Platform',
  description: 'Enterprise-grade WebRTC video, voice, and AI communications workspace.',
  icons: { icon: '/pulsertc_app_icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="app-root" className="h-screen w-screen overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
