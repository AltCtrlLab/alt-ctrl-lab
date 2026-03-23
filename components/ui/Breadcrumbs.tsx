'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { NAV_SECTIONS, TEAM_AI_ITEMS } from '@/lib/constants/navigation';

/** Build slug→label and slug→section maps from the navigation constants */
function buildMaps() {
  const slugToLabel: Record<string, string> = {};
  const slugToSection: Record<string, string> = {};
  const sectionToHref: Record<string, string> = {};

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const slug = item.href.split('/').pop() ?? '';
      slugToLabel[slug] = item.label;
      if (section.title !== 'Accueil') {
        slugToSection[slug] = section.title;
        if (!sectionToHref[section.title]) {
          sectionToHref[section.title] = item.href;
        }
      }
    }
  }

  for (const item of TEAM_AI_ITEMS) {
    const slug = item.href.split('/').pop() ?? '';
    slugToLabel[slug] = item.label;
    slugToSection[slug] = 'Équipe IA';
    if (!sectionToHref['Équipe IA']) {
      sectionToHref['Équipe IA'] = item.href;
    }
  }

  return { slugToLabel, slugToSection, sectionToHref };
}

const { slugToLabel, slugToSection, sectionToHref } = buildMaps();

function fallbackLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname ? pathname.split('/').filter(Boolean) : [];
  if (segments.length === 0 || pathname === '/dashboard') return null;

  const pageSlug = segments[segments.length - 1];
  const pageLabel = slugToLabel[pageSlug] ?? fallbackLabel(pageSlug);
  const section = slugToSection[pageSlug];
  const sectionHref = section ? sectionToHref[section] : undefined;

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden md:flex items-center gap-1.5 px-6 py-2 text-xs text-zinc-400"
    >
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
        <Home className="w-3 h-3" />
        <span>Dashboard</span>
      </Link>

      {section && (
        <>
          <ChevronRight className="w-3 h-3 text-zinc-700" />
          {sectionHref ? (
            <Link href={sectionHref} className="text-zinc-400 hover:text-zinc-300 transition-colors">
              {section}
            </Link>
          ) : (
            <span className="text-zinc-400">{section}</span>
          )}
        </>
      )}

      <ChevronRight className="w-3 h-3 text-zinc-700" />
      <span className="text-zinc-300 font-medium">{pageLabel}</span>
    </nav>
  );
}
