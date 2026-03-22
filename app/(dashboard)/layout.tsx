import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { StatusCapsule } from '@/components/dashboard/StatusCapsule';
import { SearchPill } from '@/components/dashboard/SearchPill';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex h-screen overflow-hidden text-zinc-300 antialiased">
      <MobileNav />
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
      <SearchPill />
      <StatusCapsule />
    </div>
  );
}
