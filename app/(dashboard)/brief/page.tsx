'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { BriefCreator } from '@/components/dashboard/BriefCreator';
import { Card } from '@/components/ui/Card';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BriefPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userXP] = useState(2450);
  const [userStreak] = useState(5);

  const handleSubmit = async (brief: {
    title: string;
    description: string;
    context?: string;
    priority: string;
  }) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate_task',
          payload: brief,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Brief envoyé avec succès! Consultez le Validation Feed pour voir le résultat.');
      } else {
        alert('Erreur: ' + data.error?.message);
      }
    } catch (error) {
      alert('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header
        userXP={userXP}
        userStreak={userStreak}
        notifications={0}
      />
      <div className="p-6 max-w-4xl mx-auto">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au Dashboard
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Nouveau Brief</h1>
                <p className="text-zinc-400">Décrivez votre projet pour activer les agents IA</p>
              </div>
            </div>
          </div>

          <BriefCreator 
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />

          <Card className="mt-6 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">💡 Conseils pour un bon brief</h3>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                Soyez précis sur vos objectifs et contraintes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                Décrivez votre cible (âge, profil, besoins)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                Mentionnez vos références ou inspirations
              </li>
            </ul>
          </Card>
      </div>
    </div>
  );
}
