'use client';

import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { ValidationCard } from './validation-card';
import { useOrchestratorStore } from '@/lib/store/orchestrator-store';
import type { AgentType, Task } from '@/lib/schemas/agents';

interface ValidationFeedProps {
  agentType: AgentType;
  title: string;
  description: string;
}

export function ValidationFeed({ agentType, title, description }: ValidationFeedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const pendingValidations = useOrchestratorStore((s) =>
    s.pendingValidations.filter((t) => t.agentType === agentType)
  );
  const currentTasks = useOrchestratorStore((s) =>
    s.currentTasks.filter((t) => t.agentType === agentType)
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleMockSubmit = async () => {
    try {
      const response = await fetch('/api/orchestrate/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate_task',
          payload: {
            agentType,
            title: `Nouvelle tâche ${agentType}`,
            description: 'Tâche de test générée depuis le cockpit',
            priority: 'Medium',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const task = data.data.task as Task;
        
        task.status = 'Pending_Validation';
        task.deliverable = generateMockDeliverable(agentType);
        task.supervisorNotes = 'Livrable généré et prêt pour votre validation.';
        
        useOrchestratorStore.getState().addTask(task);
        useOrchestratorStore.getState().updateTaskStatus(task.id, 'Pending_Validation');
      }
    } catch (error) {
      console.error('Failed to create mock task:', error);
    }
  };

  const generateMockDeliverable = (type: AgentType) => {
    switch (type) {
      case 'Branding_Agent':
        return {
          type: 'branding' as const,
          logoConcepts: [
            {
              id: 'concept-1',
              name: 'Minimal Tech',
              description: 'Approche épurée avec accent sur la typographie moderne',
              colorPalette: ['#0A0A0A', '#FFFFFF', '#3B82F6'],
              typography: { primary: 'Inter', secondary: 'Space Grotesk' },
            },
            {
              id: 'concept-2',
              name: 'Bold Future',
              description: 'Design audacieux avec formes géométriques',
              colorPalette: ['#1A1A1A', '#F59E0B', '#10B981'],
              typography: { primary: 'Satoshi', secondary: 'Clash Display' },
            },
          ],
          brandGuidelines: {
            mission: 'Révolutionner l\'expérience digitale',
            values: ['Innovation', 'Accessibilité', 'Excellence'],
            toneOfVoice: 'Professionnel mais accessible',
          },
        };
      case 'WebDev_Agent':
        return {
          type: 'webdev' as const,
          databaseSchema: [
            {
              table: 'users',
              fields: [
                { name: 'id', type: 'uuid', nullable: false },
                { name: 'email', type: 'varchar', nullable: false },
                { name: 'role', type: 'enum', nullable: false },
                { name: 'created_at', type: 'timestamp', nullable: false },
              ],
              relations: ['profiles', 'sessions'],
            },
            {
              table: 'projects',
              fields: [
                { name: 'id', type: 'uuid', nullable: false },
                { name: 'name', type: 'varchar', nullable: false },
                { name: 'owner_id', type: 'uuid', nullable: false },
                { name: 'status', type: 'enum', nullable: false },
              ],
              relations: ['users', 'tasks'],
            },
          ],
          apiEndpoints: [
            { method: 'GET' as const, path: '/api/projects', description: 'Liste des projets', auth: true },
            { method: 'POST' as const, path: '/api/projects', description: 'Créer un projet', auth: true },
          ],
          componentStructure: [
            { name: 'ProjectCard', path: '@/components/projects/card', props: ['project', 'onEdit'] },
            { name: 'ProjectList', path: '@/components/projects/list', props: ['projects'] },
          ],
        };
      case 'Marketing_Agent':
        return {
          type: 'marketing' as const,
          contentCalendar: [
            { week: 1, channels: ['LinkedIn' as const, 'Email' as const], topics: ['Lancement produit', 'Étude de cas'] },
            { week: 2, channels: ['Blog' as const, 'Twitter' as const], topics: ['Guide technique', 'Thread éducatif'] },
          ],
          campaignBrief: {
            objective: 'Augmenter la notoriété de marque de 30%',
            targetAudience: 'Decision-makers tech, 25-45 ans',
            keyMessages: ['Innovation', 'Efficacité', 'Résultats mesurables'],
            kpis: ['Engagement rate', 'Lead generation', 'Brand recall'],
          },
        };
      case 'Automation_Agent':
        return {
          type: 'automation' as const,
          workflows: [
            {
              name: 'Onboarding Client',
              trigger: 'Nouveau contrat signé',
              actions: ['Créer workspace', 'Envoyer email', 'Planifier call'],
              estimatedTimeSaved: '4h/semaine',
            },
            {
              name: 'Rapport Hebdo',
              trigger: 'Vendredi 17h',
              actions: ['Agréger données', 'Générer PDF', 'Envoyer Slack'],
              estimatedTimeSaved: '2h/semaine',
            },
          ],
          integrations: [
            { service: 'Notion', connectionType: 'API' as const, syncDirection: 'Bidirectional' as const },
            { service: 'Slack', connectionType: 'Webhook' as const, syncDirection: 'Out' as const },
          ],
        };
      default:
        return undefined;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
        <button
          onClick={handleMockSubmit}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
        >
          <Sparkles size={16} className="text-amber-400" />
          Simuler une tâche
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-zinc-900/30 p-4">
          <div className="text-2xl font-semibold text-white">{currentTasks.length}</div>
          <div className="text-xs text-zinc-400">Tâches actives</div>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="text-2xl font-semibold text-sky-400">{pendingValidations.length}</div>
          <div className="text-xs text-sky-300">En attente de validation</div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-2xl font-semibold text-emerald-400">
            {currentTasks.filter((t) => t.status === 'Completed').length}
          </div>
          <div className="text-xs text-emerald-300">Complétées</div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
          Flux de Validation
        </h2>

        {pendingValidations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-zinc-900/30 p-12 text-center">
            <Sparkles size={32} className="mx-auto mb-3 text-zinc-400" />
            <h3 className="text-sm font-medium text-white">Aucune validation en attente</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Les tâches à valider apparaîtront ici automatiquement
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingValidations.map((task) => (
              <ValidationCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {currentTasks.filter((t) => t.status !== 'Pending_Validation').length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Historique
          </h2>
          <div className="space-y-2">
            {currentTasks
              .filter((t) => t.status !== 'Pending_Validation')
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <span className="text-sm text-white">{task.title}</span>
                    <span className="ml-3 text-xs text-zinc-400">{task.status}</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(task.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
