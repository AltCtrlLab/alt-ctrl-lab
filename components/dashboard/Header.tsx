'use client';

import React from 'react';
import { Bell, Command, Settings, User, Zap, Award, Flame } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  userXP: number;
  userStreak: number;
  notifications?: number;
  userName?: string;
}

export function Header({ userXP, userStreak, notifications = 0, userName = 'Commandant' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
              <Command className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Alt Ctrl Lab</h1>
              <p className="text-xs text-zinc-400">Cockpit d'Orkestration</p>
            </div>
          </div>
        </div>
        
        {/* Center: XP Stats (compact) */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-zinc-100 font-medium">{userXP.toLocaleString('en-US')}</span>
            <span className="text-zinc-400 text-xs">XP</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-100 font-medium">Lvl {Math.floor(userXP / 500) + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <span className="text-zinc-100 font-medium">{userStreak}j</span>
          </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </Button>
          
          <Button variant="ghost" size="sm">
            <Settings className="w-5 h-5" />
          </Button>
          
          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center ml-2 cursor-pointer hover:border-zinc-600 transition-colors">
            <User className="w-5 h-5 text-zinc-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
