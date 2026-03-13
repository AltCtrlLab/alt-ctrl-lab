'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950 border-b border-zinc-800/50 flex items-center px-4 z-50">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </Link>
      </header>

      <main className="pt-14">
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-5 h-5 text-zinc-400" />
          </div>
          <h1 className="text-lg font-medium text-zinc-100">Abdul Fatah</h1>
          <p className="text-sm text-zinc-500 mt-1">Stratégie & growth</p>
          <p className="text-zinc-600 mt-8">Aucune tâche en cours</p>
          <Link 
            href="/brief"
            className="inline-block mt-4 text-sm text-zinc-300 hover:text-white"
          >
            Créer un brief →
          </Link>
        </div>
      </main>
    </div>
  );
}
