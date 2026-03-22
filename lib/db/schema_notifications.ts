import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type NotificationType = 'deadline' | 'invoice' | 'lead' | 'system';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['deadline', 'invoice', 'lead', 'system'] }).notNull().default('info'),
  severity: text('severity', { enum: ['info', 'warning', 'critical'] }).notNull().default('info'),
  title: text('title').notNull(),
  message: text('message'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  isRead: integer('is_read').default(0),
  createdAt: integer('created_at').notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
