'use client';

import React from 'react';
import { MessageSquare, PhoneCall, Users, Wand2, ShieldAlert, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { AiSparkleIcon } from './SplashView';

type Screen = 'chats' | 'calls' | 'friends' | 'ai-studio' | 'admin' | 'profile' | 'settings';

interface SidebarProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
  setSelectedContact: (c: any) => void;
  registeredUser: any;
  friendRequestsCount: number;
  handleLogout: () => void;
}

export function Sidebar({
  screen, setScreen, setSelectedContact, registeredUser, friendRequestsCount, handleLogout
}: SidebarProps) {
  const NAV_ITEMS = [
    { key: 'chats' as Screen, icon: MessageSquare, label: 'Chats' },
    { key: 'calls' as Screen, icon: PhoneCall, label: 'Calls' },
    { key: 'friends' as Screen, icon: Users, label: 'Friends', badge: friendRequestsCount },
    { key: 'ai-studio' as Screen, icon: Wand2, label: 'AI' },
    { key: 'admin' as Screen, icon: ShieldAlert, label: 'Admin', badge: registeredUser?.role === 'admin' ? 1 : undefined },
    { key: 'profile' as Screen, icon: UserIcon, label: 'Profile' },
    { key: 'settings' as Screen, icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-16 shrink-0 flex-col items-center py-4 gap-3 bg-[#08090c] border-r border-white/10 z-30">
        <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center text-white mb-2 shadow-lg">
          <AiSparkleIcon size={20} />
        </div>

        {NAV_ITEMS.map((nav) => {
          const active = screen === nav.key;
          return (
            <button key={nav.key} onClick={() => { setScreen(nav.key); if (nav.key !== 'chats') setSelectedContact(null); }}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-white'}`}
              title={nav.label}>
              <nav.icon size={18} />
              {nav.badge && nav.badge > 0 ? (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-red-500 text-white">
                  {nav.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        <div className="flex-1" />

        <div className="relative mb-2 cursor-pointer" onClick={() => setScreen('profile')}>
          <img src={registeredUser?.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-red-500" />
        </div>

        <button onClick={handleLogout} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400" title="Logout">
          <LogOut size={16} />
        </button>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden flex items-center justify-around h-14 shrink-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-white/10 px-2">
        {NAV_ITEMS.map((nav) => {
          const active = screen === nav.key;
          return (
            <button key={nav.key} onClick={() => { setScreen(nav.key); if (nav.key !== 'chats') setSelectedContact(null); }}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-all ${active ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400'}`}>
              <nav.icon size={16} />
              <span className="text-[9px] font-bold">{nav.label}</span>
              {nav.badge && nav.badge > 0 ? (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-extrabold bg-red-500 text-white">
                  {nav.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </>
  );
}
