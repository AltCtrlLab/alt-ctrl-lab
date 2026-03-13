import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type ContentStatus = 'Idée' | 'Brouillon' | 'Planifié' | 'Publié' | 'Archivé';
export type ContentType = 'Post LinkedIn' | 'Carousel' | 'Reel' | 'Newsletter' | 'Article' | 'Thread';
export type ContentPlatform = 'LinkedIn' | 'Instagram' | 'Twitter' | 'Email' | 'Blog';

export const CONTENT_STATUS_META: Record<ContentStatus, { color: string; bg: string }> = {
  'Idée': { color: 'text-zinc-400', bg: 'bg-zinc-800' },
  'Brouillon': { color: 'text-amber-400', bg: 'bg-amber-900/30' },
  'Planifié': { color: 'text-blue-400', bg: 'bg-blue-900/30' },
  'Publié': { color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  'Archivé': { color: 'text-zinc-500', bg: 'bg-zinc-900' },
};

export const PLATFORM_COLORS: Record<ContentPlatform, string> = {
  'LinkedIn': 'text-blue-400',
  'Instagram': 'text-pink-400',
  'Twitter': 'text-sky-400',
  'Email': 'text-amber-400',
  'Blog': 'text-violet-400',
};

export const contentItems = sqliteTable('content_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type', { enum: ['Post LinkedIn', 'Carousel', 'Reel', 'Newsletter', 'Article', 'Thread'] }).notNull().default('Post LinkedIn'),
  platform: text('platform', { enum: ['LinkedIn', 'Instagram', 'Twitter', 'Email', 'Blog'] }).notNull().default('LinkedIn'),
  status: text('status', { enum: ['Idée', 'Brouillon', 'Planifié', 'Publié', 'Archivé'] }).notNull().default('Idée'),
  agent: text('agent', { enum: ['khatib', 'fatah', 'manuel'] }).notNull().default('manuel'),
  hook: text('hook'),
  body: text('body'),
  cta: text('cta'),
  scheduledAt: integer('scheduled_at'),
  publishedAt: integer('published_at'),
  tags: text('tags'), // JSON array
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
