'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';

const mockHistory = [
  { id: '1', title: 'Logo Fintech', agent: 'Musawwir', status: 'approved', date: 'Hier' },
  { id: '2', title: 'API E-commerce', agent: 'Matin', status: 'approved', date: '3 jours' },
  { id: '3', title: 'Campagne LinkedIn', agent: 'Fatah', status: 'rejected', date: '1 semaine' },
];

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950 border-b border-zinc-800/50 flex items-center px-4 z-50">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </Link>
      </header>

      <main className="pt-14">
        <div className="max-w-2xl mx-auto p-6">
          <h1 className="text-lg font-medium text-zinc-100 mb-6">Historique</h1>

          <div className="space-y-2">
            {mockHistory.map(item => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {item.status === 'rejected' && <XCircle className="w-4 h-4 text-rose-500" />}
                  {item.status === 'pending' && <Clock className="w-4 h-4 text-amber-500" />}
                  <div>
                    <p className="text-sm text-zinc-300">{item.title}</p>
                    <p className="text-xs text-zinc-500">{item.agent} • {item.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
