'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, ArrowLeft, Globe, Palette, Megaphone, Monitor, Search,
  Send, Target, Lightbulb, Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface BriefTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  description: string;
  context: string;
}

const TEMPLATES: BriefTemplate[] = [
  {
    id: 'site-web',
    label: 'Site Web',
    icon: Globe,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',
    title: 'Nouveau site web',
    description: 'Conception et developpement d\'un site web moderne, responsive et optimise SEO. Inclut design UI/UX, integration, et mise en production.',
    context: 'Client: [Nom du client]\nSecteur: [Secteur d\'activite]\nBudget: [Budget estimatif]\nPages cles: Accueil, A propos, Services, Contact\nReferences: [URLs d\'inspiration]',
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: Palette,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20',
    title: 'Identite visuelle',
    description: 'Creation d\'une identite visuelle complete : logo, palette couleurs, typographies, guidelines. Declinaisons print et digital incluses.',
    context: 'Client: [Nom du client]\nSecteur: [Secteur d\'activite]\nPositionnement: [Premium / Accessible / Tech / Artisanal]\nValeurs: [3 valeurs cles]\nConcurrents: [Noms des principaux concurrents]',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    title: 'Campagne marketing',
    description: 'Strategie et execution d\'une campagne marketing multi-canal. Contenu, publicites, et suivi des performances inclus.',
    context: 'Client: [Nom du client]\nObjectif: [Notoriete / Acquisition / Conversion]\nBudget ads: [Budget mensuel]\nCanaux: [Google Ads, Meta, LinkedIn, Email]\nCible: [Description de la cible]',
  },
  {
    id: 'app-saas',
    label: 'App / SaaS',
    icon: Monitor,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20',
    title: 'Application web',
    description: 'Conception et developpement d\'une application web (SaaS, dashboard, outil interne). Architecture, UX, backend et deploiement.',
    context: 'Client: [Nom du client]\nType: [SaaS / Dashboard / Outil interne]\nUtilisateurs cibles: [Description]\nFonctionnalites cles: [Liste]\nStack souhaitee: [Next.js, React, etc.]',
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: Search,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20',
    title: 'Audit digital',
    description: 'Audit complet de la presence digitale : performance, SEO, UX, accessibilite, securite. Rapport detaille avec recommandations actionnables.',
    context: 'Client: [Nom du client]\nURL du site: [URL]\nObjectifs business: [Description]\nProblemes identifies: [Description]\nPriorite: [Performance / SEO / UX / Securite]',
  },
];

export default function BriefPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sent, setSent] = useState(false);

  const handleSelectTemplate = useCallback((tpl: BriefTemplate) => {
    setActiveTemplate(tpl.id);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setContext(tpl.context);
    setSent(false);
  }, []);

  const handleClear = useCallback(() => {
    setActiveTemplate(null);
    setTitle('');
    setDescription('');
    setContext('');
    setPriority('normal');
    setSent(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title || !description) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate_task',
          payload: { title, description, context, priority },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSent(true);
      } else {
        alert('Erreur: ' + (data.error?.message ?? 'Inconnue'));
      }
    } catch {
      alert('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, context, priority]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <FileText className="w-5 h-5 text-cyan-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Nouveau Brief</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Template selector */}
        <div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Choisir un template</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TEMPLATES.map((tpl, i) => {
              const Icon = tpl.icon;
              const isActive = activeTemplate === tpl.id;
              return (
                <motion.button
                  key={tpl.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? `${tpl.bg} ring-1 ring-current ${tpl.color}`
                      : `bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-400`
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? tpl.color : ''}`} />
                  <span className="text-xs font-medium">{tpl.label}</span>
                </motion.button>
              );
            })}
            {/* Vierge option */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={handleClear}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                activeTemplate === null && (title || description)
                  ? 'bg-zinc-800/50 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-500'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs font-medium">Vierge</span>
            </motion.button>
          </div>
        </div>

        {/* Form */}
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Send className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Brief envoye</h2>
            <p className="text-sm text-zinc-500 mb-6">Les agents IA traitent votre demande.</p>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              Nouveau brief
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            {/* Title */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                <Target className="w-4 h-4" />
                Titre du projet
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Refonte site e-commerce..."
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                <Lightbulb className="w-4 h-4" />
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Decrivez votre projet, vos objectifs, votre cible..."
                rows={5}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
              />
            </div>

            {/* Context */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                <FileText className="w-4 h-4" />
                Contexte
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Client, budget, contraintes, references..."
                rows={4}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">Priorite</label>
              <div className="flex gap-2">
                {(['low', 'normal', 'high'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      priority === p
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {p === 'low' ? 'Basse' : p === 'normal' ? 'Normal' : 'Haute'}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!title || !description || isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer le brief
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
