'use client';

import { useState } from 'react';
import { Megaphone, Link2, Target, MessageSquare } from 'lucide-react';
import { TabBar } from '@/components/shared/TabBar';
import { AgentFatahTab } from '@/components/marketing/AgentFatahTab';
import { UtmCampaigns } from '@/components/marketing/UtmCampaigns';
import { AbTestSection } from '@/components/marketing/AbTestSection';
import { LeadMagnets } from '@/components/marketing/LeadMagnets';
import { ReferralSection } from '@/components/marketing/ReferralSection';
import { TestimonialWall } from '@/components/marketing/TestimonialWall';
import { SendTimeHeatmap } from '@/components/marketing/SendTimeHeatmap';
import { EmailHealthDashboard } from '@/components/marketing/EmailHealthDashboard';

const TABS = [
  { id: 'agent', label: 'Agent Fatah', icon: Megaphone },
  { id: 'campaigns', label: 'Campagnes', icon: Link2 },
  { id: 'acquisition', label: 'Acquisition', icon: Target },
  { id: 'engagement', label: 'Engagement', icon: MessageSquare },
];

export default function MarketingPage() {
  const [tab, setTab] = useState('agent');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 h-14">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-sm font-semibold text-zinc-100">Marketing</h1>
          </div>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {tab === 'agent' && <AgentFatahTab />}

        {tab === 'campaigns' && (
          <div className="space-y-6">
            <UtmCampaigns />
            <AbTestSection />
          </div>
        )}

        {tab === 'acquisition' && (
          <div className="space-y-6">
            <LeadMagnets />
            <ReferralSection />
          </div>
        )}

        {tab === 'engagement' && (
          <div className="space-y-6">
            <TestimonialWall />
            <SendTimeHeatmap />
            <EmailHealthDashboard />
          </div>
        )}
      </main>
    </div>
  );
}
