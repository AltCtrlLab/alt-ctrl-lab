'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Palette,
  Code2,
  Megaphone,
  Workflow,
  PlusCircle,
  LayoutDashboard,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FolderKanban,
  Wallet,
  CalendarDays,
  Briefcase,
  HeartHandshake,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  agent?: string;
  color: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { 
    label: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard, 
    color: 'text-zinc-400',
  },
  { 
    label: 'Nouveau Brief', 
    href: '/brief', 
    icon: PlusCircle, 
    color: 'text-cyan-400',
  },
  { 
    label: 'Branding', 
    href: '/branding', 
    icon: Palette, 
    agent: 'Abdul Musawwir',
    color: 'text-pink-400',
  },
  { 
    label: 'Web Dev', 
    href: '/web-dev', 
    icon: Code2, 
    agent: 'Abdul Matin',
    color: 'text-emerald-400',
  },
  { 
    label: 'Marketing', 
    href: '/marketing', 
    icon: Megaphone, 
    agent: 'Abdul Fatah',
    color: 'text-amber-400',
  },
  { 
    label: 'Automations', 
    href: '/automations', 
    icon: Workflow, 
    agent: 'Abdul Hasib',
    color: 'text-violet-400',
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: TrendingUp,
    color: 'text-cyan-400',
  },
  {
    label: 'Projets',
    href: '/projets',
    icon: FolderKanban,
    color: 'text-violet-400',
  },
  {
    label: 'Finances',
    href: '/finances',
    icon: Wallet,
    color: 'text-emerald-400',
  },
  {
    label: 'Content',
    href: '/content',
    icon: CalendarDays,
    color: 'text-pink-400',
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: Briefcase,
    color: 'text-amber-400',
  },
  {
    label: 'Post-Vente',
    href: '/postvente',
    icon: HeartHandshake,
    color: 'text-cyan-400',
  },
  {
    label: 'Prospection',
    href: '/prospection',
    icon: Target,
    color: 'text-orange-400',
  },
  {
    label: 'Historique',
    href: '/history',
    icon: History,
    color: 'text-zinc-400',
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  pendingCounts?: Record<string, number>;
}

export function Sidebar({ isCollapsed = false, onToggle, pendingCounts = {} }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative flex-shrink-0 h-full border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-xl transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <nav className="flex flex-col h-full p-3">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const badgeCount = item.agent ? pendingCounts[item.agent] || 0 : 0;
            
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  isActive 
                    ? "bg-zinc-800/80 text-white border border-zinc-700" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? item.color : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block">{item.label}</span>
                      {item.agent && (
                        <span className="text-[10px] text-zinc-600 block truncate">{item.agent}</span>
                      )}
                    </div>
                    
                    {badgeCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-zinc-800/50 space-y-1">
          <button 
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all w-full",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Paramètres" : undefined}
          >
            <Settings className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm">Paramètres</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}
