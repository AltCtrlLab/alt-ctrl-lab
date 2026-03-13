import {
  type AgentType,
  type BrandingDeliverable,
  type WebDevDeliverable,
  type MarketingDeliverable,
  type AutomationDeliverable,
  type Deliverable,
} from '@/lib/schemas/agents';
import { z } from 'zod';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

// Mapping AgentType → OpenClaw agent ID
const AGENT_ID_MAP: Record<AgentType, string> = {
  'Supervisor':       'hakim',
  'Branding_Agent':   'musawwir',
  'WebDev_Agent':     'matin',
  'Marketing_Agent':  'fatah',
  'Automation_Agent': 'hasib',
};

export interface WorkerInput {
  taskId: string;
  title: string;
  description: string;
  supervisorNotes?: string;
  priority: string;
}

export interface WorkerOutput {
  taskId: string;
  status: 'Pending_Validation';
  deliverable: Deliverable;
  executionTime: number;
  modelUsed: string;
}

export class WorkerManager {
  async runWorker(
    agentType: AgentType,
    input: WorkerInput,
    systemPrompt: string
  ): Promise<WorkerOutput> {
    const startTime = Date.now();
    const agentId = AGENT_ID_MAP[agentType];
    const fullPrompt = `${systemPrompt}\n\n---\n\n${this.buildUserPrompt(input)}`;

    try {
      const result = await executeOpenClawAgent(agentId, fullPrompt);

      if (!result.success && !result.stdout) {
        throw new WorkerError(
          `OpenClaw agent '${agentId}' failed: ${result.stderr || 'No output'}`
        );
      }

      const rawContent = result.stdout || result.stderr;
      const deliverable = this.parseDeliverable(rawContent, agentType);

      return {
        taskId: input.taskId,
        status: 'Pending_Validation',
        deliverable,
        executionTime: Date.now() - startTime,
        modelUsed: `openclaw/${agentId}`,
      };
    } catch (error) {
      if (error instanceof WorkerError) throw error;
      throw new WorkerError(
        `Worker execution failed for ${agentType}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private buildUserPrompt(input: WorkerInput): string {
    const parts = [
      'TÂCHE À RÉALISER:',
      `Titre: ${input.title}`,
      `Description: ${input.description}`,
    ];

    if (input.supervisorNotes) parts.push(`\nNotes du superviseur: ${input.supervisorNotes}`);
    parts.push(
      `\nPriorité: ${input.priority}`,
      '\nGénère le livrable en respectant STRICTEMENT le format JSON demandé.'
    );

    return parts.join('\n');
  }

  private parseDeliverable(rawContent: string, agentType: AgentType): Deliverable {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new WorkerError('No JSON object found in worker response');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new WorkerError(
        `Invalid JSON in worker response: ${error instanceof Error ? error.message : 'Parse error'}`
      );
    }

    switch (agentType) {
      case 'Branding_Agent':
        return z.object({
          type: z.literal('branding'),
          logoConcepts: z.array(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            colorPalette: z.array(z.string()),
            typography: z.object({ primary: z.string(), secondary: z.string() }),
          })).optional(),
          brandGuidelines: z.object({
            mission: z.string(),
            values: z.array(z.string()),
            toneOfVoice: z.string(),
          }).optional(),
        }).parse(parsed) as BrandingDeliverable;

      case 'WebDev_Agent':
        return z.object({
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
        }).parse(parsed) as WebDevDeliverable;

      case 'Marketing_Agent':
        return z.object({
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
        }).parse(parsed) as MarketingDeliverable;

      case 'Automation_Agent':
        return z.object({
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
        }).parse(parsed) as AutomationDeliverable;

      default:
        throw new WorkerError(`Unknown agent type: ${agentType}`);
    }
  }
}

export class WorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkerError';
  }
}

export function createWorkerManager(): WorkerManager {
  return new WorkerManager();
}
