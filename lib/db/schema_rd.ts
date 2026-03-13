import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// ⭐ R&D DISCOVERY SYSTEM - AbdulKhabir & AbdulBasir
// ============================================================================

/**
 * Raw discoveries from web scraping (AbdulKhabir)
 * Sources: Reddit, GitHub, HN, Twitter/X, ArXiv, Blogs tech
 */
export const discoveries = sqliteTable('discoveries', {
  id: text('id').primaryKey(),
  
  // Source identification
  sourceUrl: text('source_url').notNull(),
  sourcePlatform: text('source_platform', { 
    enum: ['reddit', 'github', 'hackernews', 'twitter', 'arxiv', 'blog', 'youtube', 'discord'] 
  }).notNull(),
  sourceContext: text('source_context'), // subreddit, repo owner, etc.
  
  // Content
  rawTitle: text('raw_title').notNull(),
  rawContent: text('raw_content').notNull(),
  extractedConcept: text('extracted_concept').notNull(), // Ce que Khabir a compris
  
  // Metadata
  engagementScore: real('engagement_score'), // upvotes, stars, etc.
  recencyScore: real('recency_score'), // 0-1, plus c'est récent plus c'est haut
  techMaturity: text('tech_maturity', { enum: ['bleeding_edge', 'early_adopter', 'mainstream', 'legacy'] }),
  
  // Processing status
  status: text('status', { enum: ['raw', 'analyzing', 'elevated', 'rejected', 'implemented'] })
    .notNull()
    .default('raw'),
  
  // Timestamps
  discoveredAt: integer('discovered_at', { mode: 'timestamp' }).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  
  // Attribution
  discoveredBy: text('discovered_by').notNull().default('abdulkhabir'),
  
  // Vector embedding for semantic search (JSON string)
  embedding: text('embedding'),
  
  // Related concepts (JSON array)
  relatedConcepts: text('related_concepts'),
}, (table) => ({
  statusIdx: index('discoveries_status_idx').on(table.status),
  platformIdx: index('discoveries_platform_idx').on(table.sourcePlatform),
  discoveredAtIdx: index('discoveries_time_idx').on(table.discoveredAt),
}));

/**
 * Elevated innovations (AbdulBasir output)
 * Transformation "concept web" → "opportunité Alt Ctrl Lab"
 */
export const innovations = sqliteTable('innovations', {
  id: text('id').primaryKey(),
  
  // Link to discovery
  discoveryId: text('discovery_id').references(() => discoveries.id),
  
  // Elevated content
  title: text('title').notNull(), // Titre "Top 1%" style Alt Ctrl Lab
  originalConcept: text('original_concept').notNull(), // Résumé de la découverte originale
  altCtrlMutation: text('alt_ctrl_mutation').notNull(), // Notre version élevée
  
  // Technical analysis
  technicalArchitecture: text('technical_architecture'), // Comment on l'implémente
  implementationComplexity: text('implementation_complexity', { 
    enum: ['trivial', 'easy', 'medium', 'hard', 'epic'] 
  }),
  estimatedImplementationDays: integer('estimated_implementation_days'),
  
  // Impact analysis
  impactScore: real('impact_score'), // 0-10
  impactAnalysis: text('impact_analysis'), // Texte détaillé
  businessValue: text('business_value'), // € potentiel ou économies
  
  // Opportunity scoring (Top 1% criteria)
  opportunityScore: real('opportunity_score'), // 0-100, composite
  noveltyScore: real('novelty_score'), // 0-10, qu'est-ce qui est nouveau
  feasibilityScore: real('feasibility_score'), // 0-10, peut-on le faire
  strategicFitScore: real('strategic_fit_score'), // 0-10, correspond à notre vision
  
  // Categorization
  category: text('category', { 
    enum: ['ai_capability', 'dev_tool', 'design_system', 'automation', 'workflow', 'infrastructure'] 
  }),
  tags: text('tags'), // JSON array
  
  // Status lifecycle
  status: text('status', { 
    enum: ['proposed', 'ceo_review', 'approved', 'rejected', 'in_progress', 'implemented', 'archived'] 
  }).notNull().default('proposed'),
  
  // Attribution
  elevatedBy: text('elevated_by').notNull().default('abdulbasir'),
  decidedBy: text('decided_by'), // CEO qui a validé/rejeté
  
  // Links
  implementationTaskId: text('implementation_task_id'), // Lien vers la task d'implémentation
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  decidedAt: integer('decided_at', { mode: 'timestamp' }),
  implementedAt: integer('implemented_at', { mode: 'timestamp' }),
}, (table) => ({
  statusIdx: index('innovations_status_idx').on(table.status),
  scoreIdx: index('innovations_score_idx').on(table.opportunityScore),
  categoryIdx: index('innovations_category_idx').on(table.category),
  discoveryIdx: index('innovations_discovery_idx').on(table.discoveryId),
}));

// ============================================================================
// ⭐ KNOWLEDGE GRAPH - Connections entre concepts
// ============================================================================

/**
 * Graph edges: Liens sémantiques entre découvertes et concepts existants
 */
export const knowledgeGraphEdges = sqliteTable('knowledge_graph_edges', {
  id: text('id').primaryKey(),
  
  sourceId: text('source_id').notNull(), // ID d'une discovery ou innovation
  sourceType: text('source_type', { enum: ['discovery', 'innovation', 'component'] }).notNull(),
  
  targetId: text('target_id').notNull(), // ID d'une autre entité
  targetType: text('target_type', { enum: ['discovery', 'innovation', 'component', 'playbook'] }).notNull(),
  
  // Relationship type
  relationType: text('relation_type', { 
    enum: ['extends', 'inspired_by', 'alternative_to', 'builds_on', 'conflicts_with', 'complements'] 
  }).notNull(),
  
  // Strength of relationship (0-1)
  confidence: real('confidence').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  sourceIdx: index('kg_source_idx').on(table.sourceId),
  targetIdx: index('kg_target_idx').on(table.targetId),
  relationIdx: index('kg_relation_idx').on(table.relationType),
}));

// ============================================================================
// ⭐ PATTERN DETECTION - Insights auto-générés
// ============================================================================

/**
 * Patterns détectés automatiquement par le Knowledge Fusion Engine
 */
export const detectedPatterns = sqliteTable('detected_patterns', {
  id: text('id').primaryKey(),
  
  patternType: text('pattern_type', { 
    enum: ['recurring_problem', 'emerging_tech', 'market_shift', 'tool_opportunity'] 
  }).notNull(),
  
  title: text('title').notNull(),
  description: text('description').notNull(),
  
  // Evidence
  evidenceIds: text('evidence_ids').notNull(), // JSON array de discovery IDs
  evidenceCount: integer('evidence_count').notNull(),
  
  // Temporal analysis
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  trendDirection: text('trend_direction', { enum: ['rising', 'stable', 'declining'] }),
  
  // Actionability
  actionable: integer('actionable', { mode: 'boolean' }).default(false),
  suggestedAction: text('suggested_action'),
  
  // Status
  status: text('status', { enum: ['detected', 'validated', 'converted', 'dismissed'] })
    .notNull()
    .default('detected'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  typeIdx: index('patterns_type_idx').on(table.patternType),
  statusIdx: index('patterns_status_idx').on(table.status),
}));

// ============================================================================
// ⭐ AUTO-PLAYBOOKS - Playbooks générés dynamiquement
// ============================================================================

/**
 * Playbooks auto-générés basés sur les patterns détectés
 */
export const autoPlaybooks = sqliteTable('auto_playbooks', {
  id: text('id').primaryKey(),
  
  name: text('name').notNull(),
  agentName: text('agent_name', { 
    enum: ['hakim', 'musawwir', 'matin', 'fatah', 'hasib', 'khabir', 'basir'] 
  }).notNull(),
  
  // Content
  triggerCondition: text('trigger_condition').notNull(), // Quand ce playbook s'applique
  coreInstructions: text('core_instructions').notNull(),
  examples: text('examples'), // JSON array d'exemples
  
  // Origin
  generatedFromPattern: text('generated_from_pattern').references(() => detectedPatterns.id),
  generatedReasoning: text('generated_reasoning'), // Pourquoi ce playbook a été créé
  
  // Validation
  usageCount: integer('usage_count').default(0),
  successRate: real('success_rate'), // % de livrables approuvés
  
  // Status
  status: text('status', { enum: ['draft', 'active', 'deprecated', 'rejected'] })
    .notNull()
    .default('draft'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
}, (table) => ({
  agentIdx: index('playbooks_agent_idx').on(table.agentName),
  statusIdx: index('playbooks_status_idx').on(table.status),
}));

// ============================================================================
// ⭐ LEARNING LOG - Feedback loop tracking
// ============================================================================

/**
 * Log de ce qui a été appris et comment ça améliore le système
 */
export const learningLog = sqliteTable('learning_log', {
  id: text('id').primaryKey(),
  
  eventType: text('event_type', { 
    enum: ['discovery_made', 'innovation_elevated', 'pattern_detected', 'playbook_generated', 
           'vault_enriched', 'implementation_completed', 'feedback_received'] 
  }).notNull(),
  
  // References
  relatedDiscoveryId: text('related_discovery_id'),
  relatedInnovationId: text('related_innovation_id'),
  relatedTaskId: text('related_task_id'),
  
  // Impact metrics
  impactDescription: text('impact_description').notNull(),
  tokensConsumed: integer('tokens_consumed'),
  timeSpentMs: integer('time_spent_ms'),
  
  // Outcome
  outcome: text('outcome', { enum: ['success', 'partial', 'failure', 'pending'] }),
  roiEstimate: real('roi_estimate'), // Return on investment estimé
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  eventIdx: index('learning_event_idx').on(table.eventType),
  createdIdx: index('learning_created_idx').on(table.createdAt),
}));

// ============================================================================
// ⭐ R&D METRICS - Performance tracking
// ============================================================================

/**
 * Métriques agrégées pour le dashboard R&D
 */
export const rdMetrics = sqliteTable('rd_metrics', {
  id: text('id').primaryKey(),
  
  period: text('period').notNull(), // '2024-W01', '2024-01', etc.
  periodType: text('period_type', { enum: ['daily', 'weekly', 'monthly'] }).notNull(),
  
  // Discovery metrics
  discoveriesCount: integer('discoveries_count').default(0),
  discoveriesByPlatform: text('discoveries_by_platform'), // JSON
  avgEngagementScore: real('avg_engagement_score'),
  
  // Elevation metrics
  innovationsGenerated: integer('innovations_generated').default(0),
  innovationsApproved: integer('innovations_approved').default(0),
  innovationsImplemented: integer('innovations_implemented').default(0),
  avgOpportunityScore: real('avg_opportunity_score'),
  
  // Impact metrics
  estimatedValueCreated: real('estimated_value_created'), // En € ou équivalent
  tokensInvested: integer('tokens_invested'),
  implementationsCompleted: integer('implementations_completed'),
  
  // Efficiency
  conversionRate: real('conversion_rate'), // discoveries → implementations
  timeToImplementation: real('time_to_implementation_days'), // Moyenne en jours
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  periodIdx: index('metrics_period_idx').on(table.period),
}));

// ============================================================================
// Types exportés
// ============================================================================

export type Discovery = typeof discoveries.$inferSelect;
export type NewDiscovery = typeof discoveries.$inferInsert;

export type Innovation = typeof innovations.$inferSelect;
export type NewInnovation = typeof innovations.$inferInsert;

export type KnowledgeGraphEdge = typeof knowledgeGraphEdges.$inferSelect;
export type NewKnowledgeGraphEdge = typeof knowledgeGraphEdges.$inferInsert;

export type DetectedPattern = typeof detectedPatterns.$inferSelect;
export type NewDetectedPattern = typeof detectedPatterns.$inferInsert;

export type AutoPlaybook = typeof autoPlaybooks.$inferSelect;
export type NewAutoPlaybook = typeof autoPlaybooks.$inferInsert;

export type LearningLog = typeof learningLog.$inferSelect;
export type NewLearningLog = typeof learningLog.$inferInsert;

export type RdMetric = typeof rdMetrics.$inferSelect;
export type NewRdMetric = typeof rdMetrics.$inferInsert;
