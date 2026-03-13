import { z } from 'zod';

export const TaskStatusEnum = z.enum([
  'Idle',
  'Processing',
  'Pending_Validation',
  'Completed',
  'Rejected',
]);

export const AgentTypeEnum = z.enum([
  'Supervisor',
  'Branding_Agent',
  'WebDev_Agent',
  'Marketing_Agent',
  'Automation_Agent',
]);

export const PriorityEnum = z.enum(['Low', 'Medium', 'High', 'Critical']);

export const ValidationActionEnum = z.enum(['Approve', 'Reject']);

export const BrandingDeliverableSchema = z.object({
  type: z.literal('branding'),
  logoConcepts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    colorPalette: z.array(z.string()),
    typography: z.object({
      primary: z.string(),
      secondary: z.string(),
    }),
  })).optional(),
  brandGuidelines: z.object({
    mission: z.string(),
    values: z.array(z.string()),
    toneOfVoice: z.string(),
  }).optional(),
});

export const WebDevDeliverableSchema = z.object({
  type: z.literal('webdev'),
  databaseSchema: z.array(z.object({
    table: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean(),
      default: z.string().optional(),
    })),
    relations: z.array(z.string()).optional(),
  })).optional(),
  apiEndpoints: z.array(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    path: z.string(),
    description: z.string(),
    auth: z.boolean(),
  })).optional(),
  componentStructure: z.array(z.object({
    name: z.string(),
    path: z.string(),
    props: z.array(z.string()),
  })).optional(),
});

export const MarketingDeliverableSchema = z.object({
  type: z.literal('marketing'),
  contentCalendar: z.array(z.object({
    week: z.number(),
    channels: z.array(z.enum(['LinkedIn', 'Twitter', 'Email', 'Blog'])),
    topics: z.array(z.string()),
  })).optional(),
  campaignBrief: z.object({
    objective: z.string(),
    targetAudience: z.string(),
    keyMessages: z.array(z.string()),
    kpis: z.array(z.string()),
  }).optional(),
});

export const AutomationDeliverableSchema = z.object({
  type: z.literal('automation'),
  workflows: z.array(z.object({
    name: z.string(),
    trigger: z.string(),
    actions: z.array(z.string()),
    estimatedTimeSaved: z.string(),
  })).optional(),
  integrations: z.array(z.object({
    service: z.string(),
    connectionType: z.enum(['API', 'Webhook', 'Native']),
    syncDirection: z.enum(['In', 'Out', 'Bidirectional']),
  })).optional(),
});

export const DeliverableSchema = z.discriminatedUnion('type', [
  BrandingDeliverableSchema,
  WebDevDeliverableSchema,
  MarketingDeliverableSchema,
  AutomationDeliverableSchema,
]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  agentType: AgentTypeEnum,
  status: TaskStatusEnum,
  priority: PriorityEnum,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  estimatedCompletion: z.string().datetime().optional(),
  deliverable: DeliverableSchema.optional(),
  supervisorNotes: z.string().optional(),
  userFeedback: z.string().optional(),
  validationHistory: z.array(z.object({
    timestamp: z.string().datetime(),
    action: ValidationActionEnum,
    feedback: z.string().optional(),
  })).default([]),
  metadata: z.record(z.unknown()).default({}),
  playbook: z.string().optional(),
});

export const SupervisorResponseSchema = z.object({
  supervisorId: z.string(),
  timestamp: z.string().datetime(),
  routingDecision: z.object({
    targetAgent: AgentTypeEnum,
    task: TaskSchema,
    reasoning: z.string(),
    playbook: z.string().optional(),
  }),
  contextSummary: z.string(),
});

export const ValidationRequestSchema = z.object({
  taskId: z.string().uuid(),
  action: ValidationActionEnum,
  feedback: z.string().max(2000).optional(),
  timestamp: z.string().datetime(),
});

export const OrchestratorStateSchema = z.object({
  currentTasks: z.array(TaskSchema),
  completedTasks: z.array(TaskSchema),
  pendingValidations: z.array(TaskSchema),
  supervisorQueue: z.array(SupervisorResponseSchema),
  isProcessing: z.boolean(),
  lastSync: z.string().datetime(),
});

export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type AgentType = z.infer<typeof AgentTypeEnum>;
export type Priority = z.infer<typeof PriorityEnum>;
export type ValidationAction = z.infer<typeof ValidationActionEnum>;
export type BrandingDeliverable = z.infer<typeof BrandingDeliverableSchema>;
export type WebDevDeliverable = z.infer<typeof WebDevDeliverableSchema>;
export type MarketingDeliverable = z.infer<typeof MarketingDeliverableSchema>;
export type AutomationDeliverable = z.infer<typeof AutomationDeliverableSchema>;
export type Deliverable = z.infer<typeof DeliverableSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type SupervisorResponse = z.infer<typeof SupervisorResponseSchema>;
export type ValidationRequest = z.infer<typeof ValidationRequestSchema>;
export type OrchestratorState = z.infer<typeof OrchestratorStateSchema>;

export const createTask = (input: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Task => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    status: 'Idle',
    createdAt: now,
    updatedAt: now,
    ...input,
  };
};

export const validateSupervisorResponse = (data: unknown): SupervisorResponse => {
  return SupervisorResponseSchema.parse(data);
};

export const validateTask = (data: unknown): Task => {
  return TaskSchema.parse(data);
};

export const validateValidationRequest = (data: unknown): ValidationRequest => {
  return ValidationRequestSchema.parse(data);
};
