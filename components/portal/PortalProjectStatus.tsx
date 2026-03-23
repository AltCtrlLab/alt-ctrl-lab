'use client';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const PHASES = ['Onboarding', 'Design', 'Dev', 'QA', 'Livraison', 'Terminé'] as const;

interface Props {
  phase: string;
  status: string;
  deadline: number | null;
  hoursEstimated: number;
  hoursActual: number;
  budget: number | null;
}

export function PortalProjectStatus({ phase, status, deadline, hoursEstimated, hoursActual, budget }: Props) {
  const currentIndex = PHASES.indexOf(phase as typeof PHASES[number]);
  const progressPercent = currentIndex >= 0 ? Math.round(((currentIndex + 1) / PHASES.length) * 100) : 0;
  const daysLeft = deadline ? Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)) : null;
  const hoursPercent = hoursEstimated > 0 ? Math.round((hoursActual / hoursEstimated) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Avancement du Projet</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'Actif' ? 'bg-emerald-500/10 text-emerald-400' :
            status === 'En pause' ? 'bg-amber-500/10 text-amber-400' :
            status === 'Terminé' ? 'bg-fuchsia-500/10 text-fuchsia-400' :
            'bg-zinc-500/10 text-zinc-400'
          }`}>
            {status}
          </span>
        </div>

        {/* Phase stepper */}
        <div className="flex items-center gap-1 mb-4">
          {PHASES.map((p, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={p} className="flex-1 flex items-center gap-1">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${
                  isDone ? 'bg-fuchsia-600' :
                  isCurrent ? 'bg-fuchsia-600/30 ring-2 ring-fuchsia-500' :
                  'bg-zinc-800'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Circle className={`w-3 h-3 ${isCurrent ? 'text-fuchsia-400' : 'text-zinc-400'}`} />
                  )}
                </div>
                {i < PHASES.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < currentIndex ? 'bg-fuchsia-600' : 'bg-zinc-800'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-zinc-400 px-1">
          {PHASES.map((p, i) => (
            <span key={p} className={i === currentIndex ? 'text-fuchsia-400 font-medium' : ''}>{p}</span>
          ))}
        </div>
      </div>

      {/* KPIs row */}
      <div className="grid grid-cols-3 gap-4">
        {daysLeft !== null && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Deadline
            </div>
            <div className={`text-xl font-bold ${daysLeft < 0 ? 'text-rose-400' : daysLeft < 7 ? 'text-amber-400' : 'text-zinc-100'}`}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}j en retard` : `${daysLeft}j restants`}
            </div>
            <div className="text-zinc-400 text-xs mt-1">{new Date(deadline!).toLocaleDateString('fr-FR')}</div>
          </div>
        )}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <div className="text-zinc-400 text-xs mb-1">Heures</div>
          <div className="text-xl font-bold text-zinc-100">{hoursActual}h <span className="text-zinc-400 text-sm">/ {hoursEstimated}h</span></div>
          <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hoursPercent > 100 ? 'bg-rose-500' : 'bg-fuchsia-500'}`}
              style={{ width: `${Math.min(100, hoursPercent)}%` }}
            />
          </div>
        </div>
        {budget !== null && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <div className="text-zinc-400 text-xs mb-1">Budget</div>
            <div className="text-xl font-bold text-zinc-100">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(budget)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
