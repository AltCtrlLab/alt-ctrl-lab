import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const newsItems = sqliteTable('news_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  url: text('url').notNull(),
  imageUrl: text('image_url'),
  source: text('source').notNull(),
  sourceLabel: text('source_label'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  category: text('category').default('general'),
  importance: integer('importance').default(5),
});

export type NewsItem = typeof newsItems.$inferSelect;
