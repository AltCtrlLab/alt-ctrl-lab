'use client';

import { useState } from 'react';
import { AtSign, Loader2, Copy, Check } from 'lucide-react';

export function SignatureGenerator() {
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '', linkedin: '', website: 'https://altctrl.fr' });
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/branding/email-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success && json.data?.html) setHtml(json.data.html);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  function copyHtml() {
    if (!html) return;
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const field = (label: string, key: keyof typeof form, placeholder: string) => (
    <div>
      <label className="text-[10px] text-zinc-400 mb-1 block">{label}</label>
      <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
        className="w-full px-3 py-2 text-xs bg-black/30 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/40" />
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <AtSign className="w-4 h-4 text-cyan-400" /> Signatures Email
      </h3>

      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {field('Nom *', 'name', 'Khadim Mbaye')}
          {field('Titre', 'title', 'CEO & Fondateur')}
          {field('Email', 'email', 'contact@altctrl.fr')}
          {field('Téléphone', 'phone', '+33 6 12 34 56 78')}
          {field('LinkedIn', 'linkedin', 'https://linkedin.com/in/...')}
          {field('Site web', 'website', 'https://altctrl.fr')}
        </div>
        <button onClick={generate} disabled={loading || !form.name}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
          Générer la signature
        </button>
      </div>

      {html && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prévisualisation</span>
            <button onClick={copyHtml} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copié !' : 'Copier HTML'}
            </button>
          </div>
          <div className="p-4 rounded-xl border border-zinc-800 bg-white">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </div>
  );
}
