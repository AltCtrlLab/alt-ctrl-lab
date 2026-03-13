/**
 * SemanticTimeline - Timeline sémantique des étapes d'orchestration
 * Consomme l'état via CockpitStreamProvider (plus de SSE dupliqué)
 */

'use client';

import { useCockpitContext } from '@/providers/CockpitStreamProvider';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Brain,
  Code2,
  RotateCcw,
  Zap,
  AlertTriangle
} from 'lucide-react';

const statusConfig: Record<string, {
  icon: React.ElementType;
  color: string;
  label: string;
}> = {
  'PENDING': { icon: Clock, color: 'text-white/40', label: 'En attente' },
  'RUNNING': { icon: Loader2, color: 'text-blue-400', label: 'En cours' },
  'DIRECTOR_PLANNING': { icon: Brain, color: 'text-purple-400', label: 'Planification' },
  'EXECUTING_SUBTASK': { icon: Code2, color: 'text-cyan-400', label: 'Exécution' },
  'EXECUTOR_DRAFTING': { icon: Code2, color: 'text-cyan-400', label: 'Rédaction' },
  'DIRECTOR_QA': { icon: RotateCcw, color: 'text-amber-400', label: 'QA' },
  'EXECUTOR_REVISING': { icon: RotateCcw, color: 'text-orange-400', label: 'Révision' },
  'WAR_ROOM_INITIATED': { icon: Brain, color: 'text-indigo-400', label: 'War Room' },
  'WAR_ROOM_EXPLORATION': { icon: Brain, color: 'text-indigo-400', label: 'Exploration' },
  'WAR_ROOM_EXPLORATION_DONE': { icon: CheckCircle2, color: 'text-green-400', label: 'Visions générées' },
  'WAR_ROOM_DEBATE': { icon: Zap, color: 'text-amber-400', label: 'Débat' },
  'WAR_ROOM_DEBATE_DONE': { icon: CheckCircle2, color: 'text-green-400', label: 'Évaluations' },
  'WAR_ROOM_DECISION': { icon: Brain, color: 'text-purple-400', label: 'Décision' },
  'WAR_ROOM_DECISION_DONE': { icon: CheckCircle2, color: 'text-green-400', label: 'Plan prêt' },
  'COMPLETED': { icon: CheckCircle2, color: 'text-green-400', label: 'Terminé' },
  'FAILED': { icon: XCircle, color: 'text-red-400', label: 'Échec' },
  'FAILED_QA': { icon: AlertTriangle, color: 'text-red-400', label: 'Échec QA' },
  'FATAL_ERROR': { icon: XCircle, color: 'text-red-500', label: 'Erreur fatale' },
};

function formatDuration(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h${Math.floor((diff % 3600000) / 60000)}m`;
}

export function SemanticTimeline() {
  const { timeline, connected, lastUpdate } = useCockpitContext();

  // Grouper les événements par tâche
  const groupedEvents = timeline.reduce((acc, event) => {
    const taskId = event.id.split('_')[0];
    if (!acc[taskId]) acc[taskId] = [];
    acc[taskId].push(event);
    return acc;
  }, {} as Record<string, typeof timeline>);

  // Prendre les 5 dernières tâches
  const recentTasks = Object.entries(groupedEvents)
    .sort(([, a], [, b]) =>
      b[b.length - 1].timestamp.getTime() - a[a.length - 1].timestamp.getTime()
    )
    .slice(0, 5);

  return (
    <div className="rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white/90">Timeline Sémantique</h2>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-xs text-white/40">
              Dernière update: {formatDuration(lastUpdate)}
            </span>
          )}
          <div className={`
            w-2 h-2 rounded-full
            ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}
          `} />
        </div>
      </div>

      {/* Timeline Content */}
      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {recentTasks.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-white/10" />
            <p className="text-white/40">En attente d'événements...</p>
          </div>
        ) : (
          recentTasks.map(([taskId, events]) => {
            const latestEvent = events[events.length - 1];
            const config = statusConfig[latestEvent.status] || statusConfig['PENDING'];
            const StatusIcon = config.icon;

            return (
              <div key={taskId} className="relative">
                <div className="absolute left-5 top-10 bottom-0 w-px bg-white/10" />

                <div className="flex items-start gap-4 mb-4">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    bg-gradient-to-br from-white/10 to-white/5
                    border border-white/10
                    ${config.color}
                  `}>
                    <StatusIcon className={`w-5 h-5 ${latestEvent.status.includes('RUNNING') ? 'animate-spin' : ''}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-white/40">
                        {taskId.substring(0, 20)}...
                      </span>
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs font-medium
                        ${config.color} bg-white/5
                      `}>
                        {config.label}
                      </span>
                    </div>

                    <p className="text-sm text-white/60 mt-1">
                      {latestEvent.agent || 'Système'}
                    </p>
                  </div>

                  <time className="text-xs text-white/30">
                    {latestEvent.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </time>
                </div>

                <div className="ml-14 space-y-2">
                  {events.map((event, idx) => {
                    const stepConfig = statusConfig[event.status] || statusConfig['PENDING'];
                    const StepIcon = stepConfig.icon;

                    return (
                      <div
                        key={event.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-xl
                          ${idx === events.length - 1
                            ? 'bg-white/5 border border-white/10'
                            : 'opacity-60'
                          }
                        `}
                      >
                        <StepIcon className={`w-4 h-4 ${stepConfig.color}`} />

                        <div className="flex-1">
                          <span className="text-sm text-white/70">
                            {stepConfig.label}
                          </span>
                          <span className="text-xs text-white/30 ml-2">
                            {event.stage}
                          </span>
                        </div>

                        <time className="text-xs text-white/30">
                          {event.timestamp.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </time>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer avec stats */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{timeline.length} événements reçus</span>
          <span>{Object.keys(groupedEvents).length} tâches</span>
        </div>
      </div>
    </div>
  );
}
