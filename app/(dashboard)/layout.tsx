import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatusCapsule } from '@/components/dashboard/StatusCapsule';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex h-screen overflow-hidden text-zinc-300 antialiased">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <StatusCapsule />
    </div>
  );
}
