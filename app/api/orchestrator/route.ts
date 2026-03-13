import { NextRequest, NextResponse } from 'next/server';
import {
  validateValidationRequest,
  createTask,
  type Task,
  type AgentType,
  type ValidationRequest,
} from '@/lib/schemas/agents';
import {
  createSupervisor,
  SupervisorError,
  SupervisorValidationError,
  SupervisorParseError,
  type BriefInput,
} from '@/lib/ai/supervisor';
import {
  createWorkerManager,
  WorkerError,
  type WorkerInput,
} from '@/lib/ai/workers';
import {
  buildWorkerPrompt,
  type AgentName,
  type PlaybookId,
  DEFAULT_PLAYBOOKS,
  PromptManagerError,
} from '@/lib/ai/prompt-manager';

interface OrchestratorResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    executionTime: number;
    modelUsed?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, { headers: corsHeaders });
}

function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  status: number = 500
): NextResponse<OrchestratorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
      meta: { timestamp: new Date().toISOString(), executionTime: 0 },
    },
    { status, headers: corsHeaders }
  );
}

/**
 * Mappe les AgentType du schéma Zod vers les AgentName du prompt-manager
 */
function mapAgentTypeToName(agentType: AgentType): AgentName {
  const mapping: Record<AgentType, AgentName> = {
    'Supervisor': 'hakim',
    'Branding_Agent': 'musawwir',
    'WebDev_Agent': 'matin',
    'Marketing_Agent': 'fatah',
    'Automation_Agent': 'hasib',
  };
  return mapping[agentType];
}

async function handleInitiateTask(
  brief: BriefInput & { agentType?: AgentType }
): Promise<NextResponse<OrchestratorResponse>> {
  const startTime = Date.now();
  const executionMetadata: {
    supervisorTime?: number;
    workerTime?: number;
    promptAssemblyTime?: number;
    modelUsed?: string;
  } = {};

  try {
    // ÉTAPE 1: Appel au Supervisor (Abdul Hakim) via OpenClaw CLI
    console.log('[Orchestrator] Initializing Supervisor via OpenClaw...');

    const supervisor = createSupervisor();

    const supervisorStart = Date.now();
    const supervisorResponse = await supervisor.analyzeWithRetry(brief);
    executionMetadata.supervisorTime = Date.now() - supervisorStart;

    const routingDecision = supervisorResponse.routingDecision;
    const targetTask = routingDecision.task;

    console.log(`[Orchestrator] Supervisor decision: ${routingDecision.targetAgent}`);
    console.log(`[Orchestrator] Playbook: ${routingDecision.playbook || 'default'}`);

    // ÉTAPE 2: Assembler le prompt avec le Prompt Manager
    const promptAssemblyStart = Date.now();
    
    const agentName = mapAgentTypeToName(routingDecision.targetAgent);
    const playbookId = (routingDecision.playbook || DEFAULT_PLAYBOOKS[agentName]) as PlaybookId;
    
    let assembledPrompt: string;
    try {
      assembledPrompt = buildWorkerPrompt(agentName, playbookId);
    } catch (error) {
      if (error instanceof PromptManagerError) {
        return createErrorResponse(
          'PROMPT_ASSEMBLY_ERROR',
          error.message,
          { agent: agentName, playbook: playbookId },
          500
        );
      }
      throw error;
    }
    
    executionMetadata.promptAssemblyTime = Date.now() - promptAssemblyStart;

    // ÉTAPE 3: Appel au Worker avec le prompt assemblé
    const workerManager = createWorkerManager();

    const workerInput: WorkerInput = {
      taskId: targetTask.id,
      title: targetTask.title,
      description: targetTask.description,
      supervisorNotes: targetTask.supervisorNotes || routingDecision.reasoning,
      priority: targetTask.priority,
    };

    console.log('[Orchestrator] Calling Worker via OpenClaw...');
    
    const workerStart = Date.now();
    const workerOutput = await workerManager.runWorker(
      routingDecision.targetAgent,
      workerInput,
      assembledPrompt
    );
    executionMetadata.workerTime = Date.now() - workerStart;
    executionMetadata.modelUsed = workerOutput.modelUsed;

    console.log(`[Orchestrator] Worker completed in ${executionMetadata.workerTime}ms`);

    // ÉTAPE 4: Construction de la tâche finale
    const finalTask: Task = {
      ...targetTask,
      deliverable: workerOutput.deliverable,
      status: 'Pending_Validation',
      updatedAt: new Date().toISOString(),
      playbook: playbookId,
    };

    const totalExecutionTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          task: finalTask,
          supervisorResponse: {
            supervisorId: supervisorResponse.supervisorId,
            timestamp: supervisorResponse.timestamp,
            routingDecision: {
              targetAgent: routingDecision.targetAgent,
              reasoning: routingDecision.reasoning,
              playbook: playbookId,
            },
            contextSummary: supervisorResponse.contextSummary,
          },
          execution: executionMetadata,
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTime: totalExecutionTime,
          modelUsed: executionMetadata.modelUsed,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('[Orchestrator] Error:', error);

    if (error instanceof SupervisorValidationError) {
      return createErrorResponse(
        'SUPERVISOR_VALIDATION_ERROR',
        'Supervisor response did not match expected schema',
        { zodErrors: error.zodErrors },
        500
      );
    }

    if (error instanceof SupervisorParseError) {
      return createErrorResponse(
        'SUPERVISOR_PARSE_ERROR',
        'Failed to parse supervisor response as JSON',
        { originalError: error.message },
        500
      );
    }

    if (error instanceof SupervisorError) {
      return createErrorResponse(
        'SUPERVISOR_ERROR',
        error.message,
        undefined,
        500
      );
    }

    if (error instanceof WorkerError) {
      return createErrorResponse(
        'WORKER_ERROR',
        error.message,
        undefined,
        500
      );
    }

    if (error instanceof PromptManagerError) {
      return createErrorResponse(
        'PROMPT_MANAGER_ERROR',
        error.message,
        undefined,
        500
      );
    }

    if (error instanceof Error && error.message.includes('timeout')) {
      return createErrorResponse(
        'TIMEOUT_ERROR',
        'Request timed out',
        { executionTime },
        504
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error occurred',
      { executionTime },
      500
    );
  }
}

async function handleSubmitValidation(
  payload: unknown
): Promise<NextResponse<OrchestratorResponse>> {
  try {
    const validation = validateValidationRequest(payload);

    const nextStep =
      validation.action === 'Approve'
        ? {
            action: 'CONTINUE_WORKFLOW',
            message: 'Task approved, continuing to next step',
            nextAgent: 'Supervisor',
          }
        : {
            action: 'REVISION_REQUIRED',
            message: 'Task rejected, returning to worker for revision',
            estimatedRetry: new Date(Date.now() + 1800000).toISOString(),
          };

    return NextResponse.json(
      {
        success: true,
        data: {
          validation,
          nextStep,
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTime: 0,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid validation request format',
        { zodError: error },
        400
      );
    }

    return createErrorResponse(
      'VALIDATION_PROCESSING_ERROR',
      error instanceof Error ? error.message : 'Failed to process validation',
      undefined,
      500
    );
  }
}

async function handleGetStatus(): Promise<NextResponse<OrchestratorResponse>> {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'operational',
        supervisor: 'online (OpenClaw/hakim)',
        engine: 'openclaw-cli',
        agents: {
          Supervisor: 'ready',
          Branding_Agent: 'ready',
          WebDev_Agent: 'ready',
          Marketing_Agent: 'ready',
          Automation_Agent: 'ready',
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTime: 0,
      },
    },
    { headers: corsHeaders }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<OrchestratorResponse>> {
  const requestStartTime = Date.now();

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return createErrorResponse(
        'MISSING_ACTION',
        'Request body must include an "action" field',
        undefined,
        400
      );
    }

    switch (action) {
      case 'initiate_task': {
        if (!payload || typeof payload !== 'object') {
          return createErrorResponse(
            'INVALID_PAYLOAD',
            'initiate_task requires a payload object with title and description',
            undefined,
            400
          );
        }

        const { title, description, context, priority, deadline, constraints } =
          payload;

        if (!title || typeof title !== 'string') {
          return createErrorResponse(
            'INVALID_TITLE',
            'payload.title is required and must be a string',
            undefined,
            400
          );
        }

        if (!description || typeof description !== 'string') {
          return createErrorResponse(
            'INVALID_DESCRIPTION',
            'payload.description is required and must be a string',
            undefined,
            400
          );
        }

        const brief: BriefInput = {
          title,
          description,
          context,
          priority,
          deadline,
          constraints: Array.isArray(constraints) ? constraints : undefined,
        };

        return handleInitiateTask(brief);
      }

      case 'submit_validation': {
        return handleSubmitValidation(payload);
      }

      case 'get_status': {
        return handleGetStatus();
      }

      default:
        return createErrorResponse(
          'UNKNOWN_ACTION',
          `Unknown action: ${action}. Valid actions are: initiate_task, submit_validation, get_status`,
          undefined,
          400
        );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createErrorResponse(
        'INVALID_JSON',
        'Request body is not valid JSON',
        undefined,
        400
      );
    }

    return createErrorResponse(
      'REQUEST_PROCESSING_ERROR',
      error instanceof Error ? error.message : 'Failed to process request',
      { executionTime: Date.now() - requestStartTime },
      500
    );
  }
}

export async function GET(): Promise<NextResponse<OrchestratorResponse>> {
  return NextResponse.json(
    {
      success: true,
      data: {
        name: 'Alt Ctrl Lab Orchestrator',
        version: '0.3.0-kimi',
        description: 'Human-in-the-Loop AI Orchestration Engine (OpenClaw Edition)',
        endpoints: [
          {
            method: 'POST',
            path: '/api/orchestrator',
            actions: ['initiate_task', 'submit_validation', 'get_status'],
          },
        ],
        architecture: {
          supervisor: 'OpenClaw/hakim',
          workers: ['OpenClaw/musawwir', 'OpenClaw/matin', 'OpenClaw/fatah', 'OpenClaw/hasib'],
          pattern: 'Supervisor → Prompt Manager → Worker → Human Validation',
          features: ['Dynamic prompt assembly', 'Playbook routing', 'Multi-agent orchestration'],
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTime: 0,
      },
    },
    { headers: corsHeaders }
  );
}
