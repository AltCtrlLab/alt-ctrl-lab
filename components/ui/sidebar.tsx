'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Palette,
  Code2,
  Megaphone,
  Workflow,
  Command,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrchestratorStore } from '@/lib/store/orchestrator-store';

const navigation = [
  { name: 'Branding', href: '/branding', icon: Palette, agent: 'Branding_Agent' },
  { name: 'Web Dev', href: '/web-dev', icon: Code2, agent: 'WebDev_Agent' },
  { name: 'Marketing', href: '/marketing', icon: Megaphone, agent: 'Marketing_Agent' },
  { name: 'Automations', href: '/automations', icon: Workflow, agent: 'Automation_Agent' },
];

export function Sidebar() {
  const pathname = usePathname();
  const pendingValidations = useOrchestratorStore((s) => s.pendingValidations);

  const getPendingCount = (agent: string) =>
    pendingValidations.filter((t) => t.agentType === agent).length;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-zinc-950">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href="/branding" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-black">
              <Command size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-white">
                Alt Ctrl Lab
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Cockpit
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const pendingCount = getPendingCount(item.agent);

            return (
              <Link
                key={item.name}
                href={item.href as any}
                className={cn(
                  'group flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    size={18}
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {pendingCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500/20 px-1.5 text-[10px] font-semibold text-sky-400">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
            <CircleDot size={10} className="text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white">Superviseur Actif</span>
              <span className="text-[10px] text-zinc-500">Claude • En ligne</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
