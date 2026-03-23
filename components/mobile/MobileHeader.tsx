'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { NAV_SECTIONS, TEAM_AI_ITEMS } from '@/lib/constants/navigation';
import { BottomSheet } from './BottomSheet';
import { NotificationList } from '@/components/dashboard/NotificationCenter';

/** Resolve current page title from navigation constants. */
function usePageTitle(): string {
  const pathname = usePathname();
  const allItems = [
    ...NAV_SECTIONS.flatMap((s) => s.items),
    ...TEAM_AI_ITEMS,
  ];
  const match = allItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  return match?.label ?? 'Cockpit';
}

export function MobileHeader() {
  const title = usePageTitle();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 md:hidden bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.08] pt-[env(safe-area-inset-top)]"
      >
        <div className="flex items-center justify-between h-12 px-4">
          {/* Page title */}
          <h1 className="text-sm font-semibold text-zinc-100 truncate">
            {title}
          </h1>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(true)}
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Bell size={18} />
            </button>

            {/* Avatar */}
            <div
              role="img"
              aria-label="Profil utilisateur"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white"
            >
              AC
            </div>
          </div>
        </div>
      </header>

      {/* Notifications BottomSheet */}
      <BottomSheet
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Notifications"
        initialSnap="half"
      >
        <NotificationList />
      </BottomSheet>
    </>
  );
}

export default MobileHeader;
