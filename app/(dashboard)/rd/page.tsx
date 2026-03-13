'use client';

import { useState, useEffect } from 'react';

interface SchedulerConfig {
  enabled: boolean;
  mode: 'manual' | 'scheduled';
  schedule: {
    scoutIntervalHours: number;
    elevateIntervalHours: number;
    analysisIntervalHours: number;
  };
  nextRunAt: string | null;
  lastRunAt: string | null;
  isRunning: boolean;
}

interface RDStats {
  discoveries: number;
  innovations: {
    total: number;
    proposed: number;
    approved: number;
    implemented: number;
  };
  averageOpportunityScore: string;
}

export default function RDControlPage() {
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [stats, setStats] = useState<RDStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/rd/scheduler');
      const data = await res.json();
      if (data.success) setConfig(data.data);
    } catch (e) {
      console.error('Failed to fetch config:', e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/rd/metrics?period=7d');
      const data = await res.json();
      if (data.success) setStats(data.data.summary);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const triggerAction = async (action: string) => {
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/rd/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchConfig();
        fetchStats();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (e) {
      setMessage(`❌ Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = async () => {
    const newMode = config?.mode === 'manual' ? 'enable_auto' : 'disable_auto';
    await triggerAction(newMode);
  };

  if (!config) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">🔬 R&D Control Center</h1>
      <p className="text-zinc-400 mb-8">Gestion du système d&apos;innovation autonome</p>

      {/* Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Mode</div>
          <div className={`text-lg font-semibold ${config.mode === 'manual' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {config.mode === 'manual' ? '🔧 Manuel' : '⚡ Auto'}
          </div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Status</div>
          <div className={`text-lg font-semibold ${config.isRunning ? 'text-rose-400' : 'text-emerald-400'}`}>
            {config.isRunning ? '🔄 Running' : '✅ Idle'}
          </div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Dernière exécution</div>
          <div className="text-white text-lg font-semibold">
            {config.lastRunAt 
              ? new Date(config.lastRunAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
              : 'Jamais'}
          </div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Prochaine exécution</div>
          <div className="text-white text-lg font-semibold">
            {config.nextRunAt 
              ? new Date(config.nextRunAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
              : 'Non programmé'}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-cyan-400">{stats.discoveries}</div>
            <div className="text-zinc-400 text-sm">Découvertes</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-violet-400">{stats.innovations.total}</div>
            <div className="text-zinc-400 text-sm">Innovations</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">{stats.innovations.proposed}</div>
            <div className="text-zinc-400 text-sm">En attente</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{stats.innovations.approved}</div>
            <div className="text-zinc-400 text-sm">Approuvées</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-rose-400">{stats.innovations.implemented}</div>
            <div className="text-zinc-400 text-sm">Implémentées</div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.startsWith('✅') ? 'bg-emerald-900/30 border border-emerald-800 text-emerald-300' : 'bg-rose-900/30 border border-rose-800 text-rose-300'}`}>
          {message}
        </div>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Manual Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🎮 Actions Manuelles</h2>
          <div className="space-y-3">
            <button
              onClick={() => triggerAction('trigger_scout')}
              disabled={loading || config.isRunning}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? '⏳ En cours...' : '🔍 Lancer un Scouting'}
            </button>
            
            <button
              onClick={() => triggerAction('trigger_elevate')}
              disabled={loading || config.isRunning}
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? '⏳ En cours...' : '✨ Élever les Découvertes'}
            </button>
            
            <button
              onClick={() => triggerAction('trigger_pipeline')}
              disabled={loading || config.isRunning}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? '⏳ En cours...' : '🚀 Pipeline Complet'}
            </button>
          </div>
        </div>

        {/* Auto Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">⚙️ Configuration Auto</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Mode actuel</span>
              <button
                onClick={toggleMode}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  config.mode === 'manual'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {config.mode === 'manual' ? 'Passer en Auto' : 'Passer en Manuel'}
              </button>
            </div>
            
            {config.mode === 'scheduled' && (
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="text-zinc-400 text-sm mb-2">Intervalles configurés :</div>
                <ul className="text-zinc-300 space-y-1 text-sm">
                  <li>🔍 Scouting : toutes les {config.schedule.scoutIntervalHours}h</li>
                  <li>✨ Élévation : toutes les {config.schedule.elevateIntervalHours}h</li>
                  <li>📊 Analyse : toutes les {config.schedule.analysisIntervalHours}h</li>
                </ul>
              </div>
            )}
            
            <div className="text-zinc-500 text-sm mt-4">
              💡 En mode <strong>Manuel</strong>, tu lances les actions quand TU veux.<br/>
              💡 En mode <strong>Auto</strong>, le système tourne en arrière-plan.
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">🔗 Raccourcis API</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/api/rd?action=overview" target="_blank" rel="noopener noreferrer" className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-cyan-400 transition-colors">
            📊 Vue d&apos;ensemble JSON
          </a>
          <a href="/api/rd/metrics?period=7d" target="_blank" rel="noopener noreferrer" className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-violet-400 transition-colors">
            📈 Métriques détaillées
          </a>
          <a href="/api/rd?action=innovations&status=proposed" target="_blank" rel="noopener noreferrer" className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-amber-400 transition-colors">
            💡 Innovations en attente
          </a>
        </div>
      </div>
    </div>
  );
}
