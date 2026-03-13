import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  agentName: text('agent_name').notNull(),
  status: text('status', { 
    enum: [
      'PENDING', 
      'RUNNING',
      'DIRECTOR_PLANNING',
      'EXECUTING_SUBTASK',
      'EXECUTOR_DRAFTING', 
      'DIRECTOR_QA',
      'EXECUTOR_REVISING',
      'EXECUTOR_SWARMING',
      'EXECUTOR_SYNTHESIZING',
      'COMPLETED', 
      'FAILED',
      'FAILED_QA'
    ] 
  }).notNull().default('PENDING'),
  prompt: text('prompt').notNull(),
  result: text('result'),
  error: text('error'),
  iteration: integer('iteration'),
  stage: text('stage'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ⭐ Agent Activity Ledger
export const agentActivities = sqliteTable('agent_activities', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  agentName: text('agent_name').notNull(),
  agentRole: text('agent_role').notNull(),
  taskId: text('task_id').notNull(),
  parentTaskId: text('parent_task_id'),
  activityType: text('activity_type').notNull(),
  prompt: text('prompt').notNull(),
  result: text('result'),
  resultSize: integer('result_size'),
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),
  executionTimeMs: integer('execution_time_ms'),
  status: text('status').notNull(),
  qaResult: text('qa_result'),
  isSwarm: integer('is_swarm', { mode: 'boolean' }).default(false),
  swarmSize: integer('swarm_size'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// ⭐ Agent Metrics (cumulative)
export const agentMetrics = sqliteTable('agent_metrics', {
  agentId: text('agent_id').primaryKey(),
  totalTasks: integer('total_tasks').default(0),
  successfulTasks: integer('successful_tasks').default(0),
  failedTasks: integer('failed_tasks').default(0),
  qaRejections: integer('qa_rejections').default(0),
  totalTokensIn: integer('total_tokens_in').default(0),
  totalTokensOut: integer('total_tokens_out').default(0),
  avgExecutionTimeMs: integer('avg_execution_time_ms'),
  successRate: real('success_rate').default(0),
  totalSwarmsLed: integer('total_swarms_led').default(0),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ⭐ Todos
export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull().default('work'),
  priority: text('priority').notNull().default('medium'),
  assignedTo: text('assigned_to'),
  assignedToName: text('assigned_to_name'),
  dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  source: text('source').default('manual'),
  sourceTaskId: text('source_task_id'),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type AgentActivity = typeof agentActivities.$inferSelect;
export type AgentMetric = typeof agentMetrics.$inferSelect;
export type Todo = typeof todos.$inferSelect;

// ⭐ Metrics Snapshots (historique horaire)
export const metricsSnapshots = sqliteTable('metrics_snapshots', {
  id: text('id').primaryKey(),
  totalTasks: integer('total_tasks').default(0),
  completedTasks: integer('completed_tasks').default(0),
  failedTasks: integer('failed_tasks').default(0),
  totalTokens: integer('total_tokens').default(0),
  successRate: real('success_rate').default(0),
  activeAgents: integer('active_agents').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ⭐ Component Vault (RAG Memory)
export const componentVault = sqliteTable('component_vault', {
  id: text('id').primaryKey(),
  briefText: text('brief_text').notNull(),
  codeContent: text('code_content').notNull(),
  embedding: text('embedding').notNull(), // JSON string of number[]
  serviceId: text('service_id'),
  createdAt: text('created_at').notNull(),
  successRate: real('success_rate').default(1.0),
  reuseCount: integer('reuse_count').default(0),
});

export type VaultedComponent = typeof componentVault.$inferSelect;
