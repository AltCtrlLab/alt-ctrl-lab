/**
 * Centralized navigation items for the sidebar and guide panel.
 * Single source of truth — consumed by Sidebar.tsx, Breadcrumbs.tsx, GuidePanel.tsx.
 */

import {
  LayoutDashboard,
  PlusCircle,
  TrendingUp,
  FolderKanban,
  Wallet,
  Target,
  HeartHandshake,
  CalendarDays,
  CalendarClock,
  Workflow,
  Terminal,
  History,
  Briefcase,
  Palette,
  Code2,
  Megaphone,
  FlaskConical,
  BookOpen,
  Inbox,
  Bell,
  Users,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
  agent?: string;
  desc?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Accueil',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-zinc-400', desc: 'Vue d\u2019ensemble avec KPIs et activité récente' },
      { label: 'Nouveau Brief', href: '/brief', icon: PlusCircle, color: 'text-zinc-400', desc: 'Soumettre un brief aux agents IA ou à l\u2019agence complète' },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { label: 'Leads', href: '/leads', icon: TrendingUp, color: 'text-zinc-400', desc: 'Pipeline commercial : du prospect au client signé' },
      { label: 'Clients', href: '/clients', icon: Users, color: 'text-fuchsia-400', desc: 'Fiche 360° par client — workflow, factures, livrables et portail' },
      { label: 'Projets', href: '/projets', icon: FolderKanban, color: 'text-zinc-400', desc: 'Suivi des projets en cours avec phases et deadlines' },
      { label: 'Finances', href: '/finances', icon: Wallet, color: 'text-zinc-400', desc: 'Factures, dépenses et trésorerie' },
      { label: 'Prospection', href: '/prospection', icon: Target, color: 'text-zinc-400', desc: 'Prospection froide et outreach automatisé' },
      { label: 'Post-Vente', href: '/postvente', icon: HeartHandshake, color: 'text-zinc-400', desc: 'Suivi post-projet, NPS et relances' },
    ],
  },
  {
    title: 'Ops',
    items: [
      { label: 'Content', href: '/content', icon: CalendarDays, color: 'text-zinc-400', desc: 'Calendrier éditorial et gestion de contenu' },
      { label: 'Automations', href: '/automations', icon: Workflow, color: 'text-zinc-400', desc: 'Workflows n8n et automatisations actives' },
      { label: 'Cockpit Ops', href: '/pil', icon: Terminal, color: 'text-zinc-400', desc: 'Centre de contrôle avancé des agents IA' },
      { label: 'Planning', href: '/planning', icon: CalendarClock, color: 'text-zinc-400', desc: 'Charge équipe et capacité hebdomadaire' },
      { label: 'Historique', href: '/history', icon: History, color: 'text-zinc-400', desc: 'Journal de toutes les exécutions passées des agents' },
      { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen, color: 'text-zinc-400', desc: 'Wiki interne — process, templates, runbooks et décisions' },
      { label: 'Messagerie', href: '/inbox', icon: Inbox, color: 'text-zinc-400', desc: 'Inbox unifiée — emails, WhatsApp, chat, SMS' },
      { label: 'Alertes', href: '/alerts', icon: Bell, color: 'text-zinc-400', desc: 'Règles d\'alertes et notifications client' },
    ],
  },
];

export const TEAM_AI_ITEMS: NavItem[] = [
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-zinc-400', desc: 'Galerie des projets réalisés et études de cas' },
  { label: 'Branding', href: '/branding', icon: Palette, color: 'text-zinc-400', agent: 'Abdul Musawwir', desc: 'Abdul Musawwir — direction artistique et identité visuelle' },
  { label: 'Web Dev', href: '/web-dev', icon: Code2, color: 'text-zinc-400', agent: 'Abdul Matin', desc: 'Abdul Matin — architecture web et développement React' },
  { label: 'Marketing', href: '/marketing', icon: Megaphone, color: 'text-zinc-400', agent: 'Abdul Fatah', desc: 'Abdul Fatah — stratégie marketing et growth' },
  { label: 'R&D', href: '/rd', icon: FlaskConical, color: 'text-zinc-400', desc: 'Veille technologique, innovations et patterns émergents' },
];
