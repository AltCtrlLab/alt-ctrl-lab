'use client';
import { Workflow } from 'lucide-react';
import type { Automation } from '@/lib/db/schema_automations';
import { AutomationCard } from './AutomationCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface Props {
  automations: Automation[];
  onSelect: (a: Automation) => void;
}

export function AutomationsGrid({ automations, onSelect }: Props) {
  if (automations.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        color="cyan"
        message="Aucune automation configurée"
        submessage="Les workflows n8n apparaissent ici automatiquement. Connectez vos premiers webhooks pour démarrer."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {automations.map((a, i) => (
        <AutomationCard key={a.id} automation={a} onClick={() => onSelect(a)} index={i} />
      ))}
    </div>
  );
}
