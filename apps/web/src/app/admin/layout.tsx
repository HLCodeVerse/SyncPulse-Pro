'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert, LayoutDashboard, Users, MessageSquare, Video, Settings, LogOut,
  UserPlus, Radio, Lock
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('syncpulse_admin_session');
      if (session) {
        setIsAdminLoggedIn(true);
      } else if (pathname !== '/admin/login' && pathname !== '/admin/register') {
        router.push('/admin/login');
      }
    }
  }, [pathname, router]);

  const handleAdminLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('syncpulse_admin_session');
    }
    setIsAdminLoggedIn(false);
    router.push('/admin/login');
  };

  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/register';

  if (isAuthPage) {
    return <>{children}</>;
  }

  const ADMIN_NAV = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Credentials', icon: Users },
    { href: '/admin/messages', label: 'Message Logs', icon: MessageSquare },
    { href: '/admin/rooms', label: 'WebRTC Rooms', icon: Video },
    { href: '/admin/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-[#060709] text-white">
      {/* Desktop Admin Left Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between p-5 bg-[#0a0c10] border-r border-white/10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight">SyncPulse Admin</h1>
              <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Command Panel</span>
            </div>
          </div>

          <nav className="space-y-1">
            {ADMIN_NAV.map((nav) => {
              const active = pathname === nav.href;
              return (
                <a
                  key={nav.href}
                  href={nav.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <nav.icon size={16} />
                  <span>{nav.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3">
          <a
            href="/"
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium bg-white/5 text-slate-300 hover:bg-white/10"
          >
            ← Student Workspace
          </a>
          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
          >
            <LogOut size={15} /> Exit Admin Panel
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 bg-[#0a0c10] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-500" />
          <span className="text-xs font-bold text-white">SyncPulse Admin</span>
        </div>
        <div className="flex gap-2 text-[10px]">
          <a href="/admin" className="px-2 py-1 bg-white/10 rounded">Overview</a>
          <a href="/admin/users" className="px-2 py-1 bg-white/10 rounded">Users</a>
          <a href="/" className="px-2 py-1 bg-red-500/20 text-red-400 rounded">Exit</a>
        </div>
      </header>

      {/* Main Admin Page Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#07080b]">
        {children}
      </main>
    </div>
  );
}
