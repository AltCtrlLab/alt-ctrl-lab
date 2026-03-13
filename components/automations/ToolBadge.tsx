'use client';
import type { AutomationTool } from '@/lib/db/schema_automations';

const META: Record<AutomationTool, { color: string; bg: string }> = {
  'n8n': { color: 'text-violet-400', bg: 'bg-violet-900/30' },
  'Make': { color: 'text-orange-400', bg: 'bg-orange-900/30' },
  'Zapier': { color: 'text-amber-400', bg: 'bg-amber-900/30' },
  'Custom': { color: 'text-zinc-400', bg: 'bg-zinc-800' },
};

export function ToolBadge({ tool }: { tool: AutomationTool }) {
  const meta = META[tool] ?? META['Custom'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color} ${meta.bg}`}>
      {tool}
    </span>
  );
}
