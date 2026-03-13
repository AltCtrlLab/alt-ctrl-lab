'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Palette, CheckCircle2, XCircle } from 'lucide-react';

const mockTasks = [
  {
    id: '1',
    title: 'Logo Midnight Commit',
    status: 'pending',
    description: '3 propositions de logo avec charte graphique',
  },
];

export default function BrandingPage() {
  const [tasks, setTasks] = useState(mockTasks);

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
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-lg font-medium text-zinc-100">Abdul Musawwir</h1>
              <p className="text-sm text-zinc-500">Direction artistique & branding</p>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500">Aucune tâche en cours</p>
              <Link 
                href="/brief"
                className="inline-block mt-4 text-sm text-zinc-300 hover:text-white"
              >
                Créer un brief →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div 
                  key={task.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
                >
                  <h3 className="text-zinc-200 font-medium">{task.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{task.description}</p>
                  
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                      className="flex-1 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      Rejeter
                    </button>
                    <button 
                      onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                      className="flex-1 py-2 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded transition-colors font-medium flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Approuver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
