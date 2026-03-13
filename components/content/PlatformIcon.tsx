'use client';
import { PLATFORM_COLORS, type ContentPlatform } from '@/lib/db/schema_content';
import { Linkedin, Instagram, Twitter, Mail, FileText } from 'lucide-react';

const ICONS: Record<ContentPlatform, React.ElementType> = {
  'LinkedIn': Linkedin,
  'Instagram': Instagram,
  'Twitter': Twitter,
  'Email': Mail,
  'Blog': FileText,
};

export function PlatformIcon({ platform, className }: { platform: ContentPlatform; className?: string }) {
  const Icon = ICONS[platform] ?? FileText;
  const color = PLATFORM_COLORS[platform] ?? 'text-zinc-400';
  return <Icon className={`${color} ${className ?? 'w-4 h-4'}`} />;
}
