'use client';
import type { Automation } from '@/lib/db/schema_automations';
import { AutomationCard } from './AutomationCard';

interface Props {
  automations: Automation[];
  onSelect: (a: Automation) => void;
}

export function AutomationsGrid({ automations, onSelect }: Props) {
  if (automations.length === 0) {
    return <p className="text-zinc-500 text-sm text-center py-12">Aucune automation</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {automations.map((a, i) => (
        <AutomationCard key={a.id} automation={a} onClick={() => onSelect(a)} index={i} />
      ))}
    </div>
  );
}
