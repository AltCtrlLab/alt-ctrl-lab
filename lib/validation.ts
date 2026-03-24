/**
 * Zod validation helpers for API routes.
 * Centralizes schema definitions and validation logic.
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ─── Generic validation helper ────────────────────────────────────────

export function validateBody<T>(body: unknown, schema: z.ZodType<T>): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 400 },
      ),
    };
  }
  return { success: true, data: result.data };
}

// ─── Leads ────────────────────────────────────────────────────────────

export const leadCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  source: z.string().optional().default('Direct'),
  status: z.string().optional().default('Nouveau'),
  budget: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
  placeId: z.string().nullable().optional(),
  categories: z.string().nullable().optional(),
});

export const leadUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  budget: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
}).passthrough();

// ─── Projects ─────────────────────────────────────────────────────────

export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  clientName: z.string().min(1, 'Le nom client est requis'),
  type: z.string().optional().default('Site Web'),
  phase: z.string().optional().default('Découverte'),
  status: z.string().optional().default('En cours'),
  budget: z.number().nullable().optional(),
  deadline: z.string().nullable().optional(),
  hoursEstimated: z.number().nullable().optional(),
  leadId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  type: z.string().optional(),
  phase: z.string().optional(),
  status: z.string().optional(),
  budget: z.number().nullable().optional(),
  deadline: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).passthrough();

// ─── Finances ─────────────────────────────────────────────────────────

export const invoiceCreateSchema = z.object({
  clientName: z.string().min(1, 'Le nom client est requis'),
  amount: z.number().positive('Le montant doit être positif'),
  status: z.string().optional().default('Brouillon'),
  projectId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const invoiceUpdateSchema = z.object({
  clientName: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  status: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
}).passthrough();

export const expenseCreateSchema = z.object({
  label: z.string().min(1, 'Le libellé est requis'),
  amount: z.number().positive('Le montant doit être positif'),
  category: z.string().optional().default('Autre'),
  date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const expenseUpdateSchema = z.object({
  label: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().optional(),
}).passthrough();

// ─── Content ──────────────────────────────────────────────────────────

export const contentCreateSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  type: z.string().optional().default('Post'),
  platform: z.string().optional().default('LinkedIn'),
  status: z.string().optional().default('Idée'),
  body: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  hook: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  slideData: z.string().nullable().optional(),
  imagePaths: z.string().nullable().optional(),
});

export const contentUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  platform: z.string().optional(),
  status: z.string().optional(),
  body: z.string().nullable().optional(),
  slideData: z.string().nullable().optional(),
  imagePaths: z.string().nullable().optional(),
}).passthrough();

// ─── Automations ──────────────────────────────────────────────────────

export const automationCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  tool: z.string().optional().default('n8n'),
  status: z.string().optional().default('Actif'),
  triggerType: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  n8nWorkflowId: z.string().nullable().optional(),
});

export const automationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.string().optional(),
  description: z.string().nullable().optional(),
}).passthrough();

// ─── Portfolio ────────────────────────────────────────────────────────

export const portfolioCreateSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  projectType: z.string().optional().default('Web'),
  clientName: z.string().min(1, 'Le nom client est requis'),
  description: z.string().nullable().optional(),
  results: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  featured: z.number().optional().default(0),
  published: z.number().optional().default(0),
  projectId: z.string().nullable().optional(),
});

export const portfolioUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  projectType: z.string().optional(),
  clientName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
}).passthrough();

// ─── Followups (Post-Vente) ───────────────────────────────────────────

export const followupCreateSchema = z.object({
  clientName: z.string().min(1, 'Le nom client est requis'),
  type: z.string().min(1, 'Le type est requis'),
  status: z.string().optional().default('À faire'),
  priority: z.string().optional().default('Normale'),
  scheduledAt: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
});

export const followupUpdateSchema = z.object({
  clientName: z.string().min(1).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().nullable().optional(),
}).passthrough();

// ─── Todos ────────────────────────────────────────────────────────────

export const todoCreateSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().nullable().optional(),
  priority: z.string().optional().default('medium'),
  status: z.string().optional().default('pending'),
  assignedAgent: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const todoUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
}).passthrough();

// ─── Webhooks ─────────────────────────────────────────────────────────

export const calBookingSchema = z.object({
  name: z.string().min(1, 'name requis'),
  email: z.string().email().nullable().optional(),
  eventType: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const coldLeadSchema = z.object({
  name: z.string().min(1, 'name requis'),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  source: z.string().optional().default('Google Maps'),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
  placeId: z.string().nullable().optional(),
  categories: z.string().nullable().optional(),
});

export const auditRequestSchema = z.object({
  name: z.string().min(1, 'name requis'),
  email: z.string().email().nullable().optional(),
  url: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const contentIdeaSchema = z.object({
  title: z.string().min(1, 'title requis'),
  type: z.string().optional(),
  platform: z.string().optional(),
  body: z.string().nullable().optional(),
  hook: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
});

export const contentDraftSchema = z.object({
  id: z.string().min(1, 'id requis'),
  body: z.string().min(1, 'body requis'),
  title: z.string().optional(),
});

export const contentPublishedSchema = z.object({
  id: z.string().min(1, 'id requis'),
  publishedUrl: z.string().optional(),
});

export const n8nExecReportSchema = z.object({
  workflowId: z.string().min(1, 'workflowId requis'),
  status: z.string().min(1, 'status requis'),
  executionId: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

// ─── Stripe ──────────────────────────────────────────────────────────

export const stripeCheckoutSchema = z.object({
  invoiceId: z.string().min(1, 'invoiceId requis'),
});

// ─── Slack ───────────────────────────────────────────────────────────

export const slackNotifySchema = z.object({
  event: z.enum(['new_lead', 'invoice_paid', 'project_delivered', 'deadline_t_minus_1', 'ai_agent_error']),
  data: z.record(z.unknown()),
});

// ─── Portal ──────────────────────────────────────────────────────────

export const portalGenerateSchema = z.object({
  projectId: z.string().min(1, 'projectId requis'),
  label: z.string().optional(),
  expiresInDays: z.number().min(1).max(365).optional().default(90),
});

// ─── Deliverables ────────────────────────────────────────────────────

export const deliverableCreateSchema = z.object({
  projectId: z.string().min(1, 'projectId requis'),
  filename: z.string().min(1, 'filename requis'),
});

// ─── Reports ─────────────────────────────────────────────────────────

export const reportGenerateSchema = z.object({
  projectId: z.string().min(1, 'projectId requis'),
  period: z.string().optional(),
});

// ─── Chat (Sprint 9) ─────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Le message est requis').max(4000, 'Message trop long (max 4000 caractères)'),
  conversationId: z.string().optional(),
});

// ─── Rate limit helper ────────────────────────────────────────────────

export { checkRateLimit } from '@/lib/rate-limiter';
