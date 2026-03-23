'use client';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { BottomNav } from '@/components/mobile/BottomNav';
import { StatusCapsule } from '@/components/dashboard/StatusCapsule';
import { SearchPill } from '@/components/dashboard/SearchPill';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import dynamic from 'next/dynamic';

const OnboardingTour = dynamic(
  () => import('@/components/ui/OnboardingTour').then(m => ({ default: m.OnboardingTour })),
  { ssr: false },
);

const NotificationCenter = dynamic(
  () => import('@/components/dashboard/NotificationCenter'),
  { ssr: false },
);

const ChatCapsule = dynamic(
  () => import('@/components/ai/ChatCapsule').then(m => ({ default: m.ChatCapsule })),
  { ssr: false },
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex h-screen overflow-hidden text-zinc-300 antialiased">
      <MobileHeader />
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto pt-12 md:pt-0 pb-20 md:pb-0 md:ml-64">
        <Breadcrumbs />
        {children}
      </main>
      <BottomNav />
      <div className="fixed top-3 right-36 z-50 hidden md:block">
        <NotificationCenter />
      </div>
      <SearchPill />
      <StatusCapsule />
      <ChatCapsule />
      <OnboardingTour />
    </div>
  );
}
