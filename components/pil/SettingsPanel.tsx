'use client';

import React from 'react';
import { Palette, Wifi, WifiOff, Users, Keyboard } from 'lucide-react';
import { AccentColor, ACCENT_PALETTES, applyAccentColor } from '@/lib/theme';

interface SettingsPanelProps {
  isDark: boolean;
  accentColor: AccentColor;
  setAccentColor: (c: AccentColor) => void;
  isConnected: boolean;
}

const ACCENT_OPTIONS: { id: AccentColor; label: string; tw: string }[] = [
  { id: 'indigo', label: 'Indigo', tw: 'bg-indigo-500' },
  { id: 'emerald', label: 'Emerald', tw: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', tw: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', tw: 'bg-rose-500' },
  { id: 'cyan', label: 'Cyan', tw: 'bg-cyan-500' },
  { id: 'violet', label: 'Violet', tw: 'bg-violet-500' },
];

const TEAMS = [
  { director: 'Musawwir (DA)', executor: 'Raqim (UI)', service: 'Branding' },
  { director: 'Matin (CTO)', executor: 'Banna (Dev)', service: 'Web Dev' },
  { director: 'Fatah (CGO)', executor: 'Khatib (Copy)', service: 'Marketing' },
  { director: 'Hasib (Data)', executor: 'Sani (Auto)', service: 'Data' },
];

export function SettingsPanel({ isDark, accentColor, setAccentColor, isConnected }: SettingsPanelProps) {
  const card = isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-neutral-200';
  const textH = isDark ? 'text-white' : 'text-neutral-900';
  const textM = isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <div className="h-full overflow-y-auto p-1">
      <h1 className={`text-2xl font-bold mb-6 ${textH}`}>Réglages</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Apparence */}
        <section className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <Palette size={20} className="text-[rgb(var(--accent-400))]" />
            <h2 className={`text-lg font-semibold ${textH}`}>Apparence</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className={`text-sm mb-3 ${textM}`}>Couleur d'accent</p>
              <div className="flex gap-3">
                {ACCENT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAccentColor(opt.id); applyAccentColor(opt.id); }}
                    className={`
                      w-10 h-10 rounded-xl ${opt.tw} transition-all duration-200
                      ${accentColor === opt.id ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950 scale-110' : 'hover:scale-105'}
                    `}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Agents */}
        <section className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <Users size={20} className="text-[rgb(var(--accent-400))]" />
            <h2 className={`text-lg font-semibold ${textH}`}>Organisation des Agents</h2>
          </div>

          <div className="space-y-2">
            {TEAMS.map(team => (
              <div key={team.service} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-neutral-50'}`}>
                <div>
                  <p className={`text-sm font-medium ${textH}`}>{team.service}</p>
                  <p className={`text-xs ${textM}`}>Directeur → Exécutant</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm ${textH}`}>{team.director}</p>
                  <p className={`text-xs ${textM}`}>→ {team.executor}</p>
                </div>
              </div>
            ))}
            <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>Full Agency</p>
                <p className={`text-xs ${isDark ? 'text-amber-300/60' : 'text-amber-700'}`}>War Room Protocol</p>
              </div>
              <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>AbdulHakim (CEO)</p>
            </div>
          </div>
        </section>

        {/* Connexion */}
        <section className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            {isConnected ? <Wifi size={20} className="text-emerald-400" /> : <WifiOff size={20} className="text-red-400" />}
            <h2 className={`text-lg font-semibold ${textH}`}>Connexion</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textM}`}>Flux SSE</span>
              <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textM}`}>Endpoint SSE</span>
              <code className={`text-xs font-mono ${textM}`}>/api/agents/stream</code>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textM}`}>API Supervisor</span>
              <code className={`text-xs font-mono ${textM}`}>/api/supervisor</code>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textM}`}>Inférence</span>
              <span className={`text-sm font-medium ${textH}`}>OpenClaw CLI (local)</span>
            </div>
          </div>
        </section>

        {/* Raccourcis */}
        <section className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <Keyboard size={20} className="text-[rgb(var(--accent-400))]" />
            <h2 className={`text-lg font-semibold ${textH}`}>Raccourcis clavier</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              ['⌘K', 'Command Palette'],
              ['[ ]', 'Toggle Sidebar'],
              ['1-8', 'Navigation rapide'],
              ['?', 'Aide raccourcis'],
            ].map(([key, desc]) => (
              <div key={key} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-neutral-50'}`}>
                <span className={`text-xs ${textM}`}>{desc}</span>
                <kbd className={`text-[10px] font-mono px-2 py-0.5 rounded ${isDark ? 'bg-white/[0.06] text-neutral-400' : 'bg-neutral-200 text-neutral-600'}`}>{key}</kbd>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
