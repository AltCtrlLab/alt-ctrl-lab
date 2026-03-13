import { z } from 'zod';
import {
  SupervisorResponseSchema,
  type SupervisorResponse,
  type Priority,
} from '@/lib/schemas/agents';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

export interface BriefInput {
  title: string;
  description: string;
  context?: string;
  priority?: Priority;
  deadline?: string;
  constraints?: string[];
}

const SUPERVISOR_SYSTEM_PROMPT = `Tu es ABDUL HAKIM (عبد الحكيم), Serviteur du Sage, Celui qui juge avec discernement.
Tu es le CTO d'Alt Ctrl Lab, une agence digitale qui opère dans le top 1% mondial.

Ton mantra : "Je ne tolère que l'excellence. La médiocrité est une insulte à l'intelligence."

PERSONNALITÉ :
- Direct, sans filtre
- Analytique chirurgical — tu vois les failles avant qu'elles n'apparaissent
- Exigeant à la limite de l'impossible
- Tu parles avec l'autorité d'un fondateur technique

MISSION :
Analyser les briefs clients et router les tâches vers les bons agents spécialisés.

RÈGLES ABSOLUES :
1. Tu dois OBLIGATOIREMENT retourner un JSON valide et rien d'autre
2. Ce JSON doit correspondre EXACTEMENT au schéma demandé
3. Tu analyses le brief et choisis le bon agent selon :
   - "Branding_Agent" : identité visuelle, logos, charte graphique, DA
   - "WebDev_Agent" : architecture, base de données, APIs, composants frontend
   - "Marketing_Agent" : stratégie de contenu, calendrier éditorial, campagnes
   - "Automation_Agent" : workflows, intégrations, scripts d'automatisation

FORMAT JSON DE RÉPONSE OBLIGATOIRE :
{
  "supervisorId": "string",
  "timestamp": "string (ISO 8601)",
  "routingDecision": {
    "targetAgent": "Branding_Agent | WebDev_Agent | Marketing_Agent | Automation_Agent",
    "task": {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "agentType": " même que targetAgent",
      "status": "Pending_Validation",
      "priority": "Low | Medium | High | Critical",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601",
      "estimatedCompletion": "ISO 8601 (dans 1-4h selon complexité)",
      "supervisorNotes": "string (instructions précises pour l'agent cible)",
      "playbook": "identity | campaign | architecture | code_review | cro_copywriting | growth_loop | workflow | scraping"
    },
    "reasoning": "string (explique pourquoi cet agent et pas un autre)"
  },
  "contextSummary": "string (résumé de ta compréhension du brief)"
}

CONTRAINTES :
- Le status doit TOUJOURS être "Pending_Validation"
- L'id doit être un UUID v4 valide
- Les dates doivent être en format ISO 8601
- Le playbook doit correspondre au type de tâche
- Si brief flou, choisis quand même le meilleur agent

NE JAMAIS AJOUTER DE TEXTE EN DEHORS DU JSON. JSON PUR UNIQUEMENT.`;

export class Supervisor {
  async analyzeBrief(input: BriefInput): Promise<SupervisorResponse> {
    const fullPrompt = `${SUPERVISOR_SYSTEM_PROMPT}\n\n---\n\n${this.buildUserPrompt(input)}`;

    try {
      const result = await executeOpenClawAgent('hakim', fullPrompt);

      if (!result.success && !result.stdout) {
        throw new SupervisorError(
          `OpenClaw agent 'hakim' failed: ${result.stderr || 'No output'}`
        );
      }

      const rawContent = result.stdout || result.stderr;
      const parsed = this.parseJsonResponse(rawContent);
      return this.validateResponse(parsed);
    } catch (error) {
      if (
        error instanceof SupervisorError ||
        error instanceof SupervisorValidationError ||
        error instanceof SupervisorParseError
      ) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new SupervisorValidationError('Supervisor response validation failed', error.errors);
      }
      if (error instanceof SyntaxError) {
        throw new SupervisorParseError('Failed to parse supervisor response as JSON');
      }
      throw new SupervisorError(
        `Supervisor analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async analyzeWithRetry(input: BriefInput, maxRetries: number = 2): Promise<SupervisorResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(1000 * attempt);
        }
        return await this.analyzeBrief(input);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (error instanceof SupervisorValidationError && attempt < maxRetries) {
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private buildUserPrompt(input: BriefInput): string {
    const parts = [
      'BRIEF CLIENT:',
      `Titre: ${input.title}`,
      `Description: ${input.description}`,
    ];

    if (input.context) parts.push(`\nContexte additionnel: ${input.context}`);
    if (input.priority) parts.push(`\nPriorité indiquée: ${input.priority}`);
    if (input.deadline) parts.push(`\nDeadline: ${input.deadline}`);
    if (input.constraints?.length) parts.push(`\nContraintes: ${input.constraints.join(', ')}`);

    parts.push(
      '\n---',
      'Analyse ce brief et retourne UNIQUEMENT le JSON de décision de routing.'
    );

    return parts.join('\n');
  }

  private parseJsonResponse(rawContent: string): unknown {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new SyntaxError('No JSON object found in response');
    }
    return JSON.parse(jsonMatch[0]);
  }

  private validateResponse(parsed: unknown): SupervisorResponse {
    return SupervisorResponseSchema.parse(parsed);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class SupervisorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupervisorError';
  }
}

export class SupervisorValidationError extends Error {
  public readonly zodErrors: z.ZodIssue[];
  constructor(message: string, zodErrors: z.ZodIssue[]) {
    super(message);
    this.name = 'SupervisorValidationError';
    this.zodErrors = zodErrors;
  }
}

export class SupervisorParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupervisorParseError';
  }
}

export function createSupervisor(): Supervisor {
  return new Supervisor();
}
