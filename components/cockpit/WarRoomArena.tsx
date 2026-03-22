/**
 * WarRoomArena - Interface de la War Room
 * Consomme l'état via CockpitStreamProvider (plus de SSE dupliqué)
 */

'use client';

import { useCockpitContext } from '@/providers/CockpitStreamProvider';
import { WarRoomData } from '@/hooks/useCockpitStream';
import {
  Lightbulb,
  Scale,
  Target,
  Brain,
  Code2,
  Palette,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface VisionCardProps {
  letter: 'A' | 'B' | 'C';
  title: string;
  content: string;
  isSelected?: boolean;
}

function VisionCard({ letter, title, content, isSelected }: VisionCardProps) {
  const colors = {
    A: 'from-cyan-500/20 to-cyan-500/20 border-cyan-500/50',
    B: 'from-fuchsia-500/20 to-fuchsia-500/20 border-fuchsia-500/50',
    C: 'from-amber-500/20 to-amber-500/20 border-amber-500/50',
  };

  return (
    <div
      className={`
        relative rounded-2xl p-6 backdrop-blur-xl
        bg-gradient-to-br ${colors[letter]}
        border ${isSelected ? 'ring-2 ring-white/50' : ''}
        transition-all duration-500 hover:scale-[1.02]
      `}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center
          bg-gradient-to-br ${colors[letter]} font-bold text-lg
        `}>
          {letter}
        </div>
        <h3 className="font-semibold text-white/90">{title}</h3>
        {isSelected && (
          <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
        )}
      </div>

      <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}

interface EvaluationCardProps {
  agent: string;
  role: string;
  content: string;
  icon: React.ReactNode;
  color: string;
}

function EvaluationCard({ agent, role, content, icon, color }: EvaluationCardProps) {
  return (
    <div className={`
      rounded-2xl p-6 backdrop-blur-xl
      bg-gradient-to-br ${color}
      border border-white/10
      transition-all duration-500
    `}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-white/10">{icon}</div>
        <div>
          <h4 className="font-semibold text-white/90">{agent}</h4>
          <p className="text-xs text-white/50">{role}</p>
        </div>
      </div>

      <pre className="text-sm text-white/70 whitespace-pre-wrap font-mono">
        {content}
      </pre>
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: WarRoomData['phase'] }) {
  const phases = [
    { key: 'IDLE', label: 'En attente', icon: Lightbulb },
    { key: 'EXPLORATION', label: 'Exploration CEO', icon: Brain },
    { key: 'DEBATE', label: 'Débat Experts', icon: Scale },
    { key: 'DECISION', label: 'Décision', icon: Target },
    { key: 'EXECUTION', label: 'Exécution', icon: Code2 },
    { key: 'COMPLETE', label: 'Terminé', icon: CheckCircle2 },
  ];

  const currentIndex = phases.findIndex(p => p.key === phase);

  return (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
      {phases.map((p, idx) => {
        const Icon = p.icon;
        const isActive = idx === currentIndex;
        const isPast = idx < currentIndex;

        return (
          <div key={p.key} className="flex items-center">
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              ${isActive
                ? 'bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/50'
                : isPast
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/5 text-white/30'
              }
              transition-all duration-300
            `}>
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium whitespace-nowrap">{p.label}</span>
            </div>
            {idx < phases.length - 1 && (
              <div className={`
                w-8 h-px mx-2
                ${isPast ? 'bg-green-500/50' : 'bg-white/10'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const VISION_TITLES: Record<string, string> = {
  MONOLITHE_RAPIDE: 'Monolithe Rapide',
  MICROSERVICES_SCALABLE: 'Microservices Scalable',
  EDGE_INNOVANT: 'Edge Innovant',
};

function WarRoomContent({ warRoom }: { warRoom: WarRoomData }) {
  return (
    <div className="space-y-8">
      <PhaseIndicator phase={warRoom.phase} />

      {/* Phase 1: Les 3 Visions */}
      {warRoom.phase !== 'IDLE' && warRoom.phase !== 'EXPLORATION' && warRoom.visions && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white/90 flex items-center gap-2">
            <Brain className="w-5 h-5 text-fuchsia-400" />
            Visions du CEO
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['A', 'B', 'C'] as const).map(letter => {
              const vision = warRoom.visions?.[letter];
              if (!vision) return null;
              return (
                <VisionCard
                  key={letter}
                  letter={letter}
                  title={VISION_TITLES[vision.type] || vision.type}
                  content={vision.content}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Aussi afficher pendant EXPLORATION si visions déjà présentes (hydratation) */}
      {warRoom.phase === 'EXPLORATION' && warRoom.visions && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white/90 flex items-center gap-2">
            <Brain className="w-5 h-5 text-fuchsia-400" />
            Visions du CEO
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['A', 'B', 'C'] as const).map(letter => {
              const vision = warRoom.visions?.[letter];
              if (!vision) return null;
              return (
                <VisionCard
                  key={letter}
                  letter={letter}
                  title={VISION_TITLES[vision.type] || vision.type}
                  content={vision.content}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Phase 2: Les Évaluations */}
      {(warRoom.phase === 'DEBATE' || warRoom.phase === 'DECISION' || warRoom.phase === 'EXECUTION' || warRoom.phase === 'COMPLETE') && warRoom.evaluations && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white/90 flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            Débat CTO / DA
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {warRoom.evaluations.cto && (
              <EvaluationCard
                agent={warRoom.evaluations.cto.agent}
                role={warRoom.evaluations.cto.role}
                content={warRoom.evaluations.cto.content}
                icon={<Code2 className="w-5 h-5 text-cyan-400" />}
                color="from-cyan-500/10 to-cyan-500/10"
              />
            )}
            {warRoom.evaluations.da && (
              <EvaluationCard
                agent={warRoom.evaluations.da.agent}
                role={warRoom.evaluations.da.role}
                content={warRoom.evaluations.da.content}
                icon={<Palette className="w-5 h-5 text-fuchsia-400" />}
                color="from-fuchsia-500/10 to-rose-500/10"
              />
            )}
          </div>
        </section>
      )}

      {/* Phase 3: La Décision */}
      {(warRoom.phase === 'DECISION' || warRoom.phase === 'EXECUTION' || warRoom.phase === 'COMPLETE') && warRoom.decision && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white/90 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Décision CEO
          </h2>

          <div className="rounded-2xl p-6 backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
            <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono overflow-auto max-h-96">
              {warRoom.decision}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}

export function WarRoomArena() {
  const { warRoom, connected, isLoading } = useCockpitContext();

  if (isLoading) {
    return (
      <div className="rounded-3xl p-12 text-center backdrop-blur-xl bg-white/5 border border-white/10">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-fuchsia-400" />
        <p className="text-white/60">Chargement de l'état...</p>
        <p className="text-xs text-white/40 mt-2">Vérification des missions en cours</p>
      </div>
    );
  }

  if (!connected && warRoom.phase === 'IDLE') {
    return (
      <div className="rounded-3xl p-12 text-center backdrop-blur-xl bg-white/5 border border-white/10">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-fuchsia-400" />
        <p className="text-white/60">Connexion au flux temps réel...</p>
      </div>
    );
  }

  if (warRoom.phase !== 'IDLE' && !connected) {
    return (
      <div className="space-y-8">
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span className="text-amber-200 text-sm">
            Reconnexion au flux... Les données affichées peuvent être partielles.
          </span>
        </div>
        <WarRoomContent warRoom={warRoom} />
      </div>
    );
  }

  if (warRoom.phase === 'IDLE') {
    return (
      <div className="rounded-3xl p-12 text-center backdrop-blur-xl bg-white/5 border border-white/10">
        <Brain className="w-12 h-12 mx-auto mb-4 text-white/20" />
        <p className="text-white/40">En attente du démarrage de la War Room...</p>
        <p className="text-xs text-white/30 mt-4 max-w-sm mx-auto">
          Soumettez une mission avec le service "Full Agency" pour activer le protocole War Room.
        </p>
      </div>
    );
  }

  return <WarRoomContent warRoom={warRoom} />;
}
