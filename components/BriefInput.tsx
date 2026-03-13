'use client';

import React, { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
}

const AGENTS: Agent[] = [
  { id: 'abdulhakim', name: 'AbdulHakim', role: 'CEO/Superviseur', emoji: '👔', color: '#4F46E5' },
  { id: 'musawwir', name: 'Musawwir', role: 'DA Senior (Directeur Création)', emoji: '🎨', color: '#EC4899' },
  { id: 'matin', name: 'Matin', role: 'Lead Dev (Directeur Technique)', emoji: '💻', color: '#10B981' },
  { id: 'fatah', name: 'Fatah', role: 'CGO (Directeur Growth)', emoji: '📈', color: '#F59E0B' },
  { id: 'hasib', name: 'Hasib', role: 'Architect (Directeur Data)', emoji: '⚙️', color: '#6B7280' },
  { id: 'raqim', name: 'Raqim', role: 'Exécutant Création (UI)', emoji: '🖌️', color: '#EC4899' },
  { id: 'banna', name: 'Banna', role: 'Exécutant Dev (Code)', emoji: '🔧', color: '#10B981' },
  { id: 'khatib', name: 'Khatib', role: 'Exécutant Copy (Marketing)', emoji: '✍️', color: '#F59E0B' },
  { id: 'sani', name: 'Sani', role: 'Exécutant Data (Automations)', emoji: '🔌', color: '#6B7280' },
];

interface BriefInputProps {
  onSubmit?: (data: { brief: string; useSupervisor: boolean; serviceCount: number; selectedAgent?: string }) => void;
  className?: string;
}

export const BriefInput: React.FC<BriefInputProps> = ({ 
  onSubmit,
  className = '' 
}) => {
  const [brief, setBrief] = useState('');
  const [useSupervisor, setUseSupervisor] = useState(true);
  const [serviceCount, setServiceCount] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brief.trim()) {
      setError('Veuillez entrer un brief');
      return;
    }

    if (!useSupervisor && !selectedAgent) {
      setError('Veuillez sélectionner un agent');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let response;
      
      if (useSupervisor) {
        // Mode superviseur - appel API standard
        response = await fetch('/api/supervisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brief: brief.trim(),
            priority: 'high'
          }),
        });
      } else {
        // Mode direct - appel orchestrate avec agent spécifique
        const agent = AGENTS.find(a => a.id === selectedAgent);
        if (!agent) throw new Error('Agent non trouvé');
        
        // Déterminer si c'est un director ou executor
        const isDirector = ['musawwir', 'matin', 'fatah', 'hasib'].includes(agent.id);
        
        if (isDirector) {
          // Pour un director, on utilise la paire hiérarchique
          const TEAM_MAPPING: Record<string, string> = {
            'musawwir': 'raqim',
            'matin': 'banna',
            'fatah': 'khatib',
            'hasib': 'sani'
          };
          
          response = await fetch('/api/orchestrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              director_id: agent.id,
              executor_id: TEAM_MAPPING[agent.id],
              brief: brief.trim(),
              timeout: 900
            }),
          });
        } else {
          // Pour un executor seul, on utilise l'agent legacy
          response = await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'run_agent',
              payload: {
                agent_name: agent.id,
                prompt: brief.trim(),
                timeout: 900
              }
            }),
          });
        }
      }

      const data = await response.json();

      if (data.success || response.status === 202) {
        setSuccess(true);
        setBrief('');
        setSelectedAgent(null);
        onSubmit?.({ 
          brief: brief.trim(), 
          useSupervisor, 
          serviceCount,
          selectedAgent: selectedAgent || undefined
        });
      } else {
        setError(data.error?.message || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Nouvelle Mission</h2>
        <p className="text-sm text-zinc-500">
          Décrivez votre projet et choisissez votre mode d'orchestration.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle Mode Superviseur */}
        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              useSupervisor ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-zinc-700'
            }`}>
              <span className="text-2xl">{useSupervisor ? '🧠' : '🎯'}</span>
            </div>
            <div>
              <p className="font-semibold text-white">
                {useSupervisor ? 'Mode Superviseur IA' : 'Mode Agent Direct'}
              </p>
              <p className="text-xs text-zinc-500">
                {useSupervisor 
                  ? 'AbdulHakim décompose et délègue automatiquement' 
                  : 'Sélectionnez un agent spécifique pour votre mission'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setUseSupervisor(!useSupervisor);
              setSelectedAgent(null);
            }}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              useSupervisor ? 'bg-indigo-600' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                useSupervisor ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Sélecteur de nombre de services (uniquement en mode superviseur) */}
        {useSupervisor && (
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-300">
                Nombre de services à mobiliser
              </label>
              <span className="text-lg font-bold text-indigo-400">{serviceCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              value={serviceCount}
              onChange={(e) => setServiceCount(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>1 service</span>
              <span>2 services</span>
              <span>3 services</span>
              <span>4 services</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Le CEO sélectionnera automatiquement les {serviceCount} meilleurs agents pour votre mission.
            </p>
          </div>
        )}

        {/* Grille des 9 agents (uniquement hors mode superviseur) */}
        {!useSupervisor && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300 block">
              Sélectionnez un agent
            </label>
            <div className="grid grid-cols-3 gap-3">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    selectedAgent === agent.id
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                      : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{agent.emoji}</span>
                    <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: agent.color }} />
                  </div>
                  <p className="font-medium text-white text-sm truncate">{agent.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{agent.role}</p>
                </button>
              ))}
            </div>
            {selectedAgent && (
              <p className="text-sm text-indigo-400">
                ✅ {AGENTS.find(a => a.id === selectedAgent)?.name} sélectionné
              </p>
            )}
          </div>
        )}

        {/* Textarea Brief */}
        <div>
          <label htmlFor="brief" className="block text-sm font-medium text-zinc-400 mb-2">
            Brief de la mission
          </label>
          <textarea
            id="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={useSupervisor 
              ? "Ex: Créer un Design System complet pour notre application avec palette de couleurs, typographie, et composants de base..."
              : "Ex: Créer un composant Button React avec 3 variants..."
            }
            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-950/50 border border-green-900/50 rounded-lg">
            <p className="text-sm text-green-400">
              ✓ Mission envoyée ! Suivez la progression dans la timeline.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !brief.trim() || (!useSupervisor && !selectedAgent)}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Envoi en cours...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>
                {useSupervisor 
                  ? `Lancer avec ${serviceCount} service${serviceCount > 1 ? 's' : ''}` 
                  : `Lancer avec ${selectedAgent ? AGENTS.find(a => a.id === selectedAgent)?.name : '...'}`
                }
              </span>
            </>
          )}
        </button>
      </form>

      {/* Info Footer */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {useSupervisor 
              ? `Le CEO orchestrera ${serviceCount} phase${serviceCount > 1 ? 's' : ''} : Copy → Design → Architecture → Code`
              : 'L\'agent exécutera directement votre mission sans orchestration'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default BriefInput;
