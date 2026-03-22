import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Portal Tokens ───────────────────────────────────────────────────────

export const portalTokens = sqliteTable('portal_tokens', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  label: text('label'),
  expiresAt: integer('expires_at'),
  lastAccessedAt: integer('last_accessed_at'),
  createdAt: integer('created_at').notNull(),
});

export type PortalToken = typeof portalTokens.$inferSelect;
export type NewPortalToken = typeof portalTokens.$inferInsert;

// ─── Deliverables ────────────────────────────────────────────────────────

export const deliverables = sqliteTable('deliverables', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type').default('application/octet-stream'),
  uploadedAt: integer('uploaded_at').notNull(),
});

export type Deliverable = typeof deliverables.$inferSelect;
export type NewDeliverable = typeof deliverables.$inferInsert;

// ─── Client Reports ──────────────────────────────────────────────────────

export const clientReports = sqliteTable('client_reports', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  period: text('period').notNull(),
  htmlContent: text('html_content'),
  pdfPath: text('pdf_path'),
  generatedAt: integer('generated_at').notNull(),
});

export type ClientReport = typeof clientReports.$inferSelect;
export type NewClientReport = typeof clientReports.$inferInsert;
