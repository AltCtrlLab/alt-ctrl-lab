'use client';

import { useState, useEffect } from 'react';

interface SidebarBadges {
  todos: number;
  proposals: number;
}

export function useSidebarBadges(): SidebarBadges {
  const [badges, setBadges] = useState<SidebarBadges>({ todos: 0, proposals: 0 });

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const [todosRes, proposalsRes] = await Promise.all([
          fetch('/api/todos?view=today'),
          fetch('/api/proposals?status=PENDING'),
        ]);

        const todosData = await todosRes.json();
        const proposalsData = await proposalsRes.json();

        setBadges({
          todos: todosData.success
            ? (todosData.data?.todos?.filter((t: { isCompleted: boolean }) => !t.isCompleted)?.length || 0)
            : 0,
          proposals: proposalsData.success
            ? (proposalsData.data?.proposals?.length || 0)
            : 0,
        });
      } catch { /* silencieux */ }
    };

    fetchBadges();
    const iv = setInterval(fetchBadges, 30_000);
    return () => clearInterval(iv);
  }, []);

  return badges;
}
