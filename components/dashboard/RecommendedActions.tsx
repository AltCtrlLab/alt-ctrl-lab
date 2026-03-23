'use client';

import { useState, useEffect } from 'react';
import {
  Zap, RefreshCw, ArrowRight, Clock, FileText, AlertCircle,
  Target, Briefcase, DollarSign, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface RecommendedAction {
  type: 'lead' | 'followup' | 'content' | 'invoice';
  label: string;
  sub: string;
  urgency: 'high' | 'medium' | 'low';
  href: string;
}

interface ActionCategory {
  key: string;
  title: string;
  icon: React.ElementType;
  color: string;
  actions: RecommendedAction[];
}

export function RecommendedActions() {
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const now = Date.now();

      const [leadsRes, followupsRes, contentRes, invoicesRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/postvente'),
        fetch('/api/content'),
        fetch('/api/finances'),
      ]);

      const [leadsData, followupsData, contentData, invoicesData] = await Promise.all([
        leadsRes.json(),
        followupsRes.json(),
        contentRes.json(),
        invoicesRes.json(),
      ]);

      const newActions: RecommendedAction[] = [];

      // Leads à relancer (proposition > 3j)
      if (leadsData.success) {
        const overdue = (leadsData.data.leads ?? []).filter((l: any) =>
          l.status === 'Proposition envoyée' && l.propositionSentAt &&
          (now - l.propositionSentAt) > 3 * 86400000
        );
        for (const lead of overdue.slice(0, 3)) {
          const days = Math.floor((now - lead.propositionSentAt) / 86400000);
          newActions.push({
            type: 'lead',
            label: `Relancer ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
            sub: `Proposition envoyée il y a ${days}j sans réponse`,
            urgency: days > 7 ? 'high' : 'medium',
            href: '/leads',
          });
        }
      }

      // Followups overdue
      if (followupsData.success) {
        const overdue = (followupsData.data?.followups ?? []).filter((f: any) =>
          f.status === 'À faire' && f.scheduledAt && f.scheduledAt < now
        );
        for (const fu of overdue.slice(0, 2)) {
          const days = Math.floor((now - fu.scheduledAt) / 86400000);
          newActions.push({
            type: 'followup',
            label: `Contacter ${fu.clientName}`,
            sub: `Follow-up ${fu.type} prévu il y a ${days}j`,
            urgency: 'high',
            href: '/postvente',
          });
        }
      }

      // Contenu planifié non publié
      if (contentData.success) {
        const pending = (contentData.data?.items ?? contentData.data?.contentItems ?? []).filter((c: any) =>
          c.status === 'Planifié' && c.scheduledAt && c.scheduledAt < now
        );
        for (const c of pending.slice(0, 2)) {
          newActions.push({
            type: 'content',
            label: `Publier "${c.title}"`,
            sub: `Planifié sur ${c.platform} — en retard`,
            urgency: 'medium',
            href: '/content',
          });
        }
      }

      // Factures en retard
      if (invoicesData.success) {
        const late = (invoicesData.data?.invoices ?? []).filter((inv: any) =>
          inv.status === 'En retard' || (inv.status === 'Envoyée' && inv.dueDate && inv.dueDate < now)
        );
        for (const inv of late.slice(0, 2)) {
          newActions.push({
            type: 'invoice',
            label: `Relancer paiement — ${inv.clientName}`,
            sub: `Facture ${inv.amount}€ en retard`,
            urgency: 'high',
            href: '/finances',
          });
        }
      }

      setActions(newActions);
    } catch (err) {
      console.error('RecommendedActions load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const urgencyColors = {
    high: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-zinc-400 bg-zinc-800 border-zinc-700',
  };

  // Group actions by category
  const categories: ActionCategory[] = [
    {
      key: 'pipeline',
      title: 'Pipeline',
      icon: Target,
      color: 'text-fuchsia-400',
      actions: actions.filter(a => a.type === 'lead'),
    },
    {
      key: 'projects',
      title: 'Projets & Suivi',
      icon: Briefcase,
      color: 'text-sky-400',
      actions: actions.filter(a => a.type === 'followup'),
    },
    {
      key: 'finances',
      title: 'Finances',
      icon: DollarSign,
      color: 'text-emerald-400',
      actions: actions.filter(a => a.type === 'invoice'),
    },
    {
      key: 'content',
      title: 'Contenu',
      icon: FileText,
      color: 'text-amber-400',
      actions: actions.filter(a => a.type === 'content'),
    },
  ].filter(cat => cat.actions.length > 0);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-fuchsia-400 animate-pulse" />
          <span className="text-sm text-zinc-400">Chargement des actions...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-zinc-800/50 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-fuchsia-400" />
          <span className="text-sm font-semibold text-zinc-100">À faire maintenant</span>
          {actions.length > 0 && (
            <span className="text-xs bg-fuchsia-500/10 text-fuchsia-400 px-1.5 py-0.5 rounded">
              {actions.length}
            </span>
          )}
        </div>
        <button onClick={load} className="text-zinc-400 hover:text-zinc-300 transition-colors" aria-label="Actualiser">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
          <p className="text-sm text-zinc-300 font-medium">Tout est à jour</p>
          <p className="text-xs text-zinc-400 mt-1">Aucune action requise pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800/50">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.key} className="bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className={`w-4 h-4 ${cat.color}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${cat.color}`}>
                    {cat.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                    {cat.actions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cat.actions.map((action, i) => {
                    const ActionIcon = action.type === 'lead' ? ArrowRight
                      : action.type === 'followup' ? Clock
                      : action.type === 'content' ? FileText
                      : AlertCircle;
                    return (
                      <Link
                        key={i}
                        href={action.href as any}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className={`p-1 rounded border ${urgencyColors[action.urgency]}`}>
                          <ActionIcon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {action.label}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">{action.sub}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
