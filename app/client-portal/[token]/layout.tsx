import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AltCtrl.Lab — Portail Client',
  description: 'Suivez votre projet en temps réel',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {children}
    </div>
  );
}
