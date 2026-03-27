'use client';

import { useState } from 'react';
import { Palette, Paintbrush, AtSign, Newspaper } from 'lucide-react';
import { TabBar } from '@/components/shared/TabBar';
import { AgentMusawwirTab } from '@/components/branding/AgentMusawwirTab';
import { BrandKitManager } from '@/components/branding/BrandKitManager';
import { SignatureGenerator } from '@/components/branding/SignatureGenerator';
import { MediaKitGenerator } from '@/components/branding/MediaKitGenerator';

const TABS = [
  { id: 'agent', label: 'Agent Musawwir', icon: Palette },
  { id: 'kits', label: 'Brand Kits', icon: Paintbrush },
  { id: 'signatures', label: 'Signatures', icon: AtSign },
  { id: 'media', label: 'Media Kits', icon: Newspaper },
];

export default function BrandingPage() {
  const [tab, setTab] = useState('agent');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 h-14">
            <div className="w-8 h-8 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-fuchsia-400" />
            </div>
            <h1 className="text-sm font-semibold text-zinc-100">Branding</h1>
          </div>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {tab === 'agent' && <AgentMusawwirTab />}
        {tab === 'kits' && <BrandKitManager />}
        {tab === 'signatures' && <SignatureGenerator />}
        {tab === 'media' && <MediaKitGenerator />}
      </main>
    </div>
  );
}
