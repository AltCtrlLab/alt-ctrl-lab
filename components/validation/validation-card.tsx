'use client';

import { useState } from 'react';
import {
  Check,
  X,
  Clock,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useOrchestratorStore } from '@/lib/store/orchestrator-store';
import type { Task, ValidationAction } from '@/lib/schemas/agents';

interface ValidationCardProps {
  task: Task;
}

export function ValidationCard({ task }: ValidationCardProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitValidation = useOrchestratorStore((s) => s.submitValidation);

  const handleValidation = async (action: ValidationAction) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/orchestrate/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_validation',
          payload: {
            taskId: task.id,
            action,
            feedback: feedback || undefined,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        submitValidation(task.id, action, feedback);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDeliverable = () => {
    if (!task.deliverable) {
      return (
        <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
          <AlertCircle size={20} className="mx-auto mb-2 text-zinc-500" />
          <p className="text-sm text-zinc-500">Aucun livrable disponible</p>
        </div>
      );
    }

    const { deliverable } = task;

    return (
      <div className="space-y-4">
        {deliverable.type === 'branding' && deliverable.logoConcepts && (
          <div className="grid gap-3">
            {deliverable.logoConcepts.map((concept) => (
              <div
                key={concept.id}
                className="rounded-md border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{concept.name}</span>
                  <div className="flex gap-1.5">
                    {concept.colorPalette.map((color) => (
                      <div
                        key={color}
                        className="h-5 w-5 rounded-full border border-white/20"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-zinc-400">{concept.description}</p>
              </div>
            ))}
          </div>
        )}

        {deliverable.type === 'webdev' && deliverable.databaseSchema && (
          <div className="space-y-2">
            {deliverable.databaseSchema.slice(0, 3).map((table) => (
              <div
                key={table.table}
                className="rounded-md border border-white/10 bg-zinc-900/50 p-3"
              >
                <code className="text-xs font-semibold text-sky-400">{table.table}</code>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {table.fields.slice(0, 4).map((field) => (
                    <span
                      key={field.name}
                      className="inline-flex items-center rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400"
                    >
                      {field.name}: <span className="ml-0.5 text-zinc-500">{field.type}</span>
                    </span>
                  ))}
                  {table.fields.length > 4 && (
                    <span className="text-[10px] text-zinc-600">+{table.fields.length - 4}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {deliverable.type === 'marketing' && deliverable.campaignBrief && (
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-2 text-sm font-medium text-white">
              {deliverable.campaignBrief.objective}
            </h4>
            <p className="mb-3 text-sm text-zinc-400">
              Cible: {deliverable.campaignBrief.targetAudience}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {deliverable.campaignBrief.keyMessages.map((msg) => (
                <span
                  key={msg}
                  className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400"
                >
                  {msg}
                </span>
              ))}
            </div>
          </div>
        )}

        {deliverable.type === 'automation' && deliverable.workflows && (
          <div className="space-y-2">
            {deliverable.workflows.slice(0, 2).map((workflow, idx) => (
              <div
                key={idx}
                className="rounded-md border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{workflow.name}</span>
                  <span className="text-[10px] text-amber-400">{workflow.estimatedTimeSaved}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Déclencheur: {workflow.trigger}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/50 backdrop-blur-sm">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">{task.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{task.description}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock size={12} />
            <span>{formatRelativeTime(task.updatedAt)}</span>
          </div>
        </div>
        {task.supervisorNotes && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-2">
            <AlertCircle size={14} className="mt-0.5 text-sky-400" />
            <p className="text-xs text-sky-300">{task.supervisorNotes}</p>
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        {renderDeliverable()}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="mb-3">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
            <MessageSquare size={12} />
            Feedback (optionnel)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ajoutez vos commentaires..."
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-white/20 focus:outline-none resize-none"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleValidation('Approve')}
            disabled={isSubmitting}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all',
              'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Check size={16} />
            Approuver
          </button>
          <button
            onClick={() => handleValidation('Reject')}
            disabled={isSubmitting}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all',
              'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <X size={16} />
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}
