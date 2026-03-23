'use client';

import React, { useState } from 'react';
import { Plus, X, Send, FileText, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface BriefCreatorProps {
  onSubmit?: (brief: { title: string; description: string; priority: string; context?: string }) => void;
  isLoading?: boolean;
}

export function BriefCreator({ onSubmit, isLoading = false }: BriefCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');

  const handleSubmit = () => {
    if (!title || !description) return;
    onSubmit?.({ title, description, priority });
    setIsOpen(false);
    setTitle('');
    setDescription('');
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-full py-6 bg-white hover:bg-zinc-200 text-zinc-900 font-medium"
      >
        <Plus className="w-5 h-5 mr-2" />
        Nouveau Brief
      </Button>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-400" />
            Nouveau Brief
          </h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
              <Target className="w-4 h-4" />
              Titre du projet
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Refonte site e-commerce..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
              <Lightbulb className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre projet, vos objectifs, votre cible..."
              rows={4}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-400 mb-2 block">Priorité</label>
            <div className="flex gap-2">
              {['low', 'normal', 'high'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    priority === p
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  {p === 'low' ? 'Basse' : p === 'normal' ? 'Normal' : 'Haute'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleSubmit}
              disabled={!title || !description || isLoading}
              className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Envoi en cours...
                </>
              ) : (
              <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer à Hakim
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
