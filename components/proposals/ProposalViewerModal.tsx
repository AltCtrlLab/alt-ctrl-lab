'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Check, Download, ExternalLink, FileText,
  Loader2, Sparkles, AlertTriangle,
} from 'lucide-react';

interface ProposalViewerModalProps {
  markdown: string;
  fromTemplate?: boolean;
  leadName?: string;
  leadCompany?: string;
  onClose: () => void;
}

// ─── Simple markdown → sections parser ────────────────────────────────────────

interface Section {
  heading: string;
  lines: string[];
}

function parseMarkdown(md: string): { title: string; sections: Section[] } {
  const lines = md.split('\n');
  let title = '';
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: trimmed.replace(/^## /, ''), lines: [] };
    } else if (trimmed.startsWith('# ')) {
      title = trimmed.replace(/^# /, '');
    } else {
      if (!current) current = { heading: '', lines: [] };
      current.lines.push(trimmed);
    }
  }
  if (current) sections.push(current);

  return { title, sections };
}

function renderLine(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-zinc-800 px-1 rounded text-fuchsia-300 text-xs">$1</code>');
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="mb-6">
      {section.heading && (
        <h3 className="text-sm font-bold text-fuchsia-300 uppercase tracking-wider mb-3 pb-1 border-b border-fuchsia-500/20">
          {section.heading}
        </h3>
      )}
      <div className="space-y-1.5">
        {section.lines.map((line, i) => {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-fuchsia-500 mt-0.5 shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: renderLine(line.replace(/^[-*] /, '')) }} />
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            return (
              <div key={i} className="flex gap-2.5 text-sm text-zinc-300">
                <span className="text-fuchsia-400 font-bold w-4 shrink-0 text-right">{num}.</span>
                <span dangerouslySetInnerHTML={{ __html: renderLine(line.replace(/^\d+\.\s/, '')) }} />
              </div>
            );
          }
          if (line.startsWith('*—') || line.startsWith('*— ') || /^\*—/.test(line)) {
            return (
              <p key={i} className="text-xs text-zinc-500 italic mt-2"
                dangerouslySetInnerHTML={{ __html: renderLine(line) }} />
            );
          }
          return (
            <p key={i} className="text-sm text-zinc-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderLine(line) }} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ProposalViewerModal({
  markdown,
  fromTemplate,
  leadName,
  leadCompany,
  onClose,
}: ProposalViewerModalProps) {
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const clientName = leadCompany || leadName || 'Client';
  const { title, sections } = parseMarkdown(markdown);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGeneratePdf = async () => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'proposal',
          data: {
            clientName,
            projectType: 'Transformation Digitale',
            budget: 0,
            timeline: '',
            description: markdown,
            phases: [],
            deliverables: [],
          },
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // Open in new tab — user can print to PDF
      window.open(data.downloadUrl, '_blank');
    } catch (e: any) {
      setPdfError(e.message ?? 'Erreur génération PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-2xl bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-white/[0.06] shrink-0">
            <div className="w-8 h-8 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100">Proposition commerciale</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">{clientName}</span>
                {fromTemplate && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Template statique — clé IA manquante
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié' : 'Copier'}
              </button>

              <button
                onClick={handleGeneratePdf}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 text-xs text-fuchsia-300 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/25 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              >
                {pdfLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />
                }
                {pdfLoading ? 'Génération...' : 'Exporter PDF'}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error */}
          {pdfError && (
            <div className="mx-5 mt-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 shrink-0">
              {pdfError}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {title && (
              <h1 className="text-lg font-bold text-zinc-100 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
                {title}
              </h1>
            )}
            <div className="mt-5 space-y-1">
              {sections.map((s, i) => <SectionBlock key={i} section={s} />)}
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-6 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[11px] text-zinc-600 flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3" />
              "Exporter PDF" ouvre la version branded dans un nouvel onglet — utilisez <strong className="text-zinc-500">Ctrl+P → Enregistrer en PDF</strong>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
