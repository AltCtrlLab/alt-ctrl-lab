import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type PortfolioProjectType = 'Web' | 'Branding' | 'IA' | 'Marketing';

export const portfolioItems = sqliteTable('portfolio_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  clientName: text('client_name').notNull(),
  projectType: text('project_type', { enum: ['Web', 'Branding', 'IA', 'Marketing'] }).notNull(),
  description: text('description'),
  results: text('results'), // JSON: { metric: value }
  tags: text('tags'), // JSON array
  coverUrl: text('cover_url'),
  featured: integer('featured').default(0),
  published: integer('published').default(0),
  projectId: text('project_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type NewPortfolioItem = typeof portfolioItems.$inferInsert;
