'use client';

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

interface Props {
  projectId: string;
}

export function SlaIndicator({ projectId }: Props) {
  const [status, setStatus] = useState<'ok' | 'warning' | 'breach' | null>(null);

  useEffect(() => {
    fetch(`/api/cron/sla-monitor?projectId=${projectId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const configs = json.data.configs ?? [];
          const breaches = json.data.breaches ?? [];
          if (breaches.length > 0) setStatus('breach');
          else if (configs.length > 0) setStatus('ok');
        }
      })
      .catch(() => null);
  }, [projectId]);

  if (!status) return null;

  const meta = {
    ok: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'SLA OK' },
    warning: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'SLA ⚠' },
    breach: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'SLA ✗' },
  };

  const m = meta[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${m.color}`}>
      <Shield className="w-2.5 h-2.5" />
      {m.label}
    </span>
  );
}
