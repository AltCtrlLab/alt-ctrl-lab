import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { tasks, agentActivities, agentMetrics, todos, componentVault } from './schema';
import { proposals } from './schema_proposals';
import { discoveries, innovations, knowledgeGraphEdges, detectedPatterns, autoPlaybooks, learningLog, rdMetrics } from './schema_rd';
import { newsItems } from './schema_news';
import { leads } from './schema_leads';
import { projects, timeEntries } from './schema_projects';
import { invoices, expenses } from './schema_finances';
import { contentItems } from './schema_content';
import { automations } from './schema_automations';
import { portfolioItems } from './schema_portfolio';
import { followups } from './schema_postvente';
import { portalTokens, deliverables, clientReports } from './schema_portal';
import { PortalToken, Deliverable, NewDeliverable, ClientReport, NewClientReport } from './schema_portal';
import { Invoice, NewInvoice, Expense, NewExpense } from './schema_finances';
import { ContentItem, NewContentItem } from './schema_content';
import { Automation, NewAutomation } from './schema_automations';
import { PortfolioItem, NewPortfolioItem } from './schema_portfolio';
import { Followup, NewFollowup } from './schema_postvente';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
// Re-export scoring logic (client-safe)
export { computeLeadScore, type ScoreCriteria } from '../scoring';
import path from 'path';
import os from 'os';

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), '.openclaw/altctrl.db');
import fs from 'fs';

export let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const sqlite = new Database(DB_PATH);
    
    // 🔒 RÉSILIENCE DB Phase 2 : Pragmas pour concurrence Swarm
    sqlite.exec('PRAGMA journal_mode = WAL;');
    sqlite.exec('PRAGMA busy_timeout = 5000;');
    
    db = drizzle(sqlite);
    
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        prompt TEXT NOT NULL,
        result TEXT,
        error TEXT,
        iteration INTEGER,
        stage TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);

      CREATE TABLE IF NOT EXISTS agent_activities (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        agent_role TEXT NOT NULL,
        task_id TEXT NOT NULL,
        parent_task_id TEXT,
        activity_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        result TEXT,
        result_size INTEGER,
        tokens_input INTEGER,
        tokens_output INTEGER,
        execution_time_ms INTEGER,
        status TEXT NOT NULL,
        qa_result TEXT,
        is_swarm INTEGER DEFAULT 0,
        swarm_size INTEGER,
        started_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS agent_metrics (
        agent_id TEXT PRIMARY KEY,
        total_tasks INTEGER DEFAULT 0,
        successful_tasks INTEGER DEFAULT 0,
        failed_tasks INTEGER DEFAULT 0,
        qa_rejections INTEGER DEFAULT 0,
        total_tokens_in INTEGER DEFAULT 0,
        total_tokens_out INTEGER DEFAULT 0,
        avg_execution_time_ms INTEGER,
        success_rate REAL DEFAULT 0,
        total_swarms_led INTEGER DEFAULT 0,
        last_activity_at INTEGER,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'work',
        priority TEXT NOT NULL DEFAULT 'medium',
        assigned_to TEXT,
        assigned_to_name TEXT,
        due_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        is_completed INTEGER DEFAULT 0,
        is_recurring INTEGER DEFAULT 0,
        source TEXT DEFAULT 'manual',
        source_task_id TEXT
      );

      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        original_concept TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_platform TEXT,
        alt_ctrl_mutation TEXT NOT NULL,
        technical_architecture TEXT,
        impact_analysis TEXT,
        discovered_by TEXT NOT NULL DEFAULT 'abdulkhabir',
        elevated_by TEXT NOT NULL DEFAULT 'abdulbasir',
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at INTEGER NOT NULL,
        decided_at INTEGER,
        decision_by TEXT,
        implementation_task_id TEXT
      );

      CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id TEXT PRIMARY KEY,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        failed_tasks INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        active_agents INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_created ON metrics_snapshots(created_at);

      CREATE TABLE IF NOT EXISTS component_vault (
        id TEXT PRIMARY KEY,
        brief_text TEXT NOT NULL,
        code_content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        service_id TEXT,
        created_at TEXT NOT NULL,
        success_rate REAL DEFAULT 1.0,
        reuse_count INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_vault_service ON component_vault(service_id);

      -- R&D Tables
      CREATE TABLE IF NOT EXISTS discoveries (
        id TEXT PRIMARY KEY,
        source_url TEXT NOT NULL,
        source_platform TEXT NOT NULL,
        source_context TEXT,
        raw_title TEXT NOT NULL,
        raw_content TEXT NOT NULL,
        extracted_concept TEXT NOT NULL,
        engagement_score REAL,
        recency_score REAL,
        tech_maturity TEXT,
        status TEXT NOT NULL DEFAULT 'raw',
        discovered_at INTEGER NOT NULL,
        processed_at INTEGER,
        discovered_by TEXT NOT NULL DEFAULT 'abdulkhabir',
        embedding TEXT,
        related_concepts TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_discoveries_status ON discoveries(status);
      CREATE INDEX IF NOT EXISTS idx_discoveries_platform ON discoveries(source_platform);
      CREATE INDEX IF NOT EXISTS idx_discoveries_time ON discoveries(discovered_at);

      CREATE TABLE IF NOT EXISTS innovations (
        id TEXT PRIMARY KEY,
        discovery_id TEXT REFERENCES discoveries(id),
        title TEXT NOT NULL,
        original_concept TEXT NOT NULL,
        alt_ctrl_mutation TEXT NOT NULL,
        technical_architecture TEXT,
        implementation_complexity TEXT,
        estimated_implementation_days INTEGER,
        impact_score REAL,
        impact_analysis TEXT,
        business_value TEXT,
        opportunity_score REAL,
        novelty_score REAL,
        feasibility_score REAL,
        strategic_fit_score REAL,
        category TEXT,
        tags TEXT,
        status TEXT NOT NULL DEFAULT 'proposed',
        elevated_by TEXT NOT NULL DEFAULT 'abdulbasir',
        decided_by TEXT,
        implementation_task_id TEXT,
        created_at INTEGER NOT NULL,
        decided_at INTEGER,
        implemented_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_innovations_status ON innovations(status);
      CREATE INDEX IF NOT EXISTS idx_innovations_score ON innovations(opportunity_score);

      CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kg_source ON knowledge_graph_edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_kg_target ON knowledge_graph_edges(target_id);

      CREATE TABLE IF NOT EXISTS detected_patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_ids TEXT NOT NULL,
        evidence_count INTEGER NOT NULL,
        first_seen_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        trend_direction TEXT,
        actionable INTEGER DEFAULT 0,
        suggested_action TEXT,
        status TEXT NOT NULL DEFAULT 'detected',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON detected_patterns(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_status ON detected_patterns(status);

      CREATE TABLE IF NOT EXISTS auto_playbooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        trigger_condition TEXT NOT NULL,
        core_instructions TEXT NOT NULL,
        examples TEXT,
        generated_from_pattern TEXT,
        generated_reasoning TEXT,
        usage_count INTEGER DEFAULT 0,
        success_rate REAL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at INTEGER NOT NULL,
        last_used_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_playbooks_agent ON auto_playbooks(agent_name);

      CREATE TABLE IF NOT EXISTS learning_log (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        related_discovery_id TEXT,
        related_innovation_id TEXT,
        related_task_id TEXT,
        impact_description TEXT NOT NULL,
        tokens_consumed INTEGER,
        time_spent_ms INTEGER,
        outcome TEXT,
        roi_estimate REAL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_learning_event ON learning_log(event_type);

      CREATE TABLE IF NOT EXISTS rd_metrics (
        id TEXT PRIMARY KEY,
        period TEXT NOT NULL,
        period_type TEXT NOT NULL,
        discoveries_count INTEGER DEFAULT 0,
        discoveries_by_platform TEXT,
        avg_engagement_score REAL,
        innovations_generated INTEGER DEFAULT 0,
        innovations_approved INTEGER DEFAULT 0,
        innovations_implemented INTEGER DEFAULT 0,
        avg_opportunity_score REAL,
        estimated_value_created REAL,
        tokens_invested INTEGER,
        implementations_completed INTEGER DEFAULT 0,
        conversion_rate REAL,
        time_to_implementation_days REAL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rd_metrics_period ON rd_metrics(period);

      CREATE TABLE IF NOT EXISTS news_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT NOT NULL,
        image_url TEXT,
        source TEXT NOT NULL,
        source_label TEXT,
        published_at INTEGER,
        fetched_at INTEGER NOT NULL,
        category TEXT DEFAULT 'general',
        importance INTEGER DEFAULT 5
      );
      CREATE INDEX IF NOT EXISTS idx_news_fetched ON news_items(fetched_at);

      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        source TEXT NOT NULL DEFAULT 'Site',
        status TEXT NOT NULL DEFAULT 'Nouveau',
        score INTEGER NOT NULL DEFAULT 0,
        score_criteria TEXT,
        budget TEXT,
        proposition_amount REAL,
        timeline TEXT,
        notes TEXT,
        lost_reason TEXT,
        proposition_sent_at INTEGER,
        relance1_sent_at INTEGER,
        relance2_sent_at INTEGER,
        signed_at INTEGER,
        discovery_call_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        project_type TEXT NOT NULL,
        phase TEXT NOT NULL DEFAULT 'Onboarding',
        status TEXT NOT NULL DEFAULT 'Actif',
        budget REAL,
        start_date INTEGER,
        kickoff_date INTEGER,
        deadline INTEGER,
        delivered_at INTEGER,
        hours_estimated REAL DEFAULT 0,
        hours_actual REAL DEFAULT 0,
        notes TEXT,
        team_agents TEXT,
        lead_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects(phase);
      CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);

      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        description TEXT NOT NULL,
        hours REAL NOT NULL,
        date INTEGER NOT NULL,
        category TEXT NOT NULL DEFAULT 'Autre',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date DESC);

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        project_id TEXT,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Brouillon',
        due_date INTEGER,
        paid_at INTEGER,
        sent_at INTEGER,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL DEFAULT 'Autre',
        date INTEGER NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS content_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Post LinkedIn',
        platform TEXT NOT NULL DEFAULT 'LinkedIn',
        status TEXT NOT NULL DEFAULT 'Idée',
        agent TEXT NOT NULL DEFAULT 'manuel',
        hook TEXT,
        body TEXT,
        cta TEXT,
        scheduled_at INTEGER,
        published_at INTEGER,
        tags TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS automations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        tool TEXT NOT NULL DEFAULT 'n8n',
        status TEXT NOT NULL DEFAULT 'Inactif',
        trigger_type TEXT,
        last_run_at INTEGER,
        run_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        webhook_url TEXT,
        notes TEXT,
        n8n_workflow_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portfolio_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        client_name TEXT NOT NULL,
        project_type TEXT NOT NULL,
        description TEXT,
        results TEXT,
        tags TEXT,
        cover_url TEXT,
        featured INTEGER DEFAULT 0,
        published INTEGER DEFAULT 0,
        project_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS followups (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        project_id TEXT,
        lead_id TEXT,
        type TEXT NOT NULL DEFAULT 'Check-in',
        status TEXT NOT NULL DEFAULT 'À faire',
        priority TEXT NOT NULL DEFAULT 'Normale',
        scheduled_at INTEGER,
        done_at INTEGER,
        score_nps INTEGER,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Migration: add n8n_workflow_id column if not exists
    try {
      sqlite.exec(`ALTER TABLE automations ADD COLUMN n8n_workflow_id TEXT;`);
    } catch (_) { /* column already exists */ }

    // Migration: add prospection fields to leads
    const leadMigrations = [
      `ALTER TABLE leads ADD COLUMN website TEXT;`,
      `ALTER TABLE leads ADD COLUMN website_score INTEGER;`,
      `ALTER TABLE leads ADD COLUMN email_sent_count INTEGER DEFAULT 0;`,
      `ALTER TABLE leads ADD COLUMN last_contacted_at INTEGER;`,
      `ALTER TABLE leads ADD COLUMN ig_handle TEXT;`,
      `ALTER TABLE leads ADD COLUMN ig_followers INTEGER;`,
      `ALTER TABLE leads ADD COLUMN ig_dm_state TEXT DEFAULT NULL;`,
      `ALTER TABLE leads ADD COLUMN ig_dm_sent_at INTEGER;`,
      `ALTER TABLE leads ADD COLUMN ig_dm_content TEXT;`,
      `ALTER TABLE leads ADD COLUMN ig_next_action_at INTEGER;`,
      `ALTER TABLE leads ADD COLUMN ig_prospect_score INTEGER;`,
    ];
    for (const sql of leadMigrations) {
      try { sqlite.exec(sql); } catch (_) { /* column already exists */ }
    }

    // Migration: ig_profiles_cache table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS ig_profiles_cache (
          handle TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          reason TEXT,
          score INTEGER,
          followers INTEGER,
          full_name TEXT,
          bio TEXT,
          niche TEXT,
          analyzed_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ig_cache_status ON ig_profiles_cache(status);
        CREATE INDEX IF NOT EXISTS idx_ig_cache_analyzed ON ig_profiles_cache(analyzed_at);
      `);
    } catch (_) { /* already exists */ }

    // Migration: business_insights table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS business_insights (
          id TEXT PRIMARY KEY,
          topic TEXT NOT NULL,
          source TEXT,
          insight TEXT NOT NULL,
          recommendation TEXT,
          priority INTEGER DEFAULT 5,
          applied INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_bi_topic ON business_insights(topic);
        CREATE INDEX IF NOT EXISTS idx_bi_priority ON business_insights(priority DESC);
      `);
    } catch (_) { /* already exists */ }

    // Migration: business_insights — status/note/rejected/read_at columns
    try { sqlite.exec(`ALTER TABLE business_insights ADD COLUMN status TEXT DEFAULT 'new'`); } catch (_) { /* already exists */ }
    try { sqlite.exec(`ALTER TABLE business_insights ADD COLUMN note TEXT`); } catch (_) { /* already exists */ }
    try { sqlite.exec(`ALTER TABLE business_insights ADD COLUMN rejected INTEGER DEFAULT 0`); } catch (_) { /* already exists */ }
    try { sqlite.exec(`ALTER TABLE business_insights ADD COLUMN read_at INTEGER`); } catch (_) { /* already exists */ }

    // Migration: agent_executions table (Sprint 3 — IA Monitoring)
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS agent_executions (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          task_id TEXT,
          prompt TEXT NOT NULL,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          success INTEGER NOT NULL DEFAULT 0,
          error TEXT,
          token_input INTEGER,
          token_output INTEGER,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_agent_exec_agent ON agent_executions(agent_id);
        CREATE INDEX IF NOT EXISTS idx_agent_exec_created ON agent_executions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_agent_exec_success ON agent_executions(success);
      `);
    } catch (_) { /* already exists */ }

    // user_events — analytics tracking (onboarding tour, etc.)
    try {
      rawDb.exec(`
        CREATE TABLE IF NOT EXISTS user_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_user_events_type_created ON user_events(event_type, created_at DESC);
      `);
    } catch (_) { /* already exists */ }

    // Migration: Stripe fields on invoices
    const stripeInvoiceMigrations = [
      `ALTER TABLE invoices ADD COLUMN stripe_payment_intent_id TEXT;`,
      `ALTER TABLE invoices ADD COLUMN stripe_payment_link_url TEXT;`,
    ];
    for (const m of stripeInvoiceMigrations) {
      try { sqlite.exec(m); } catch (_) { /* column already exists */ }
    }

    // Migration: portal_tokens table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS portal_tokens (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          label TEXT,
          expires_at INTEGER,
          last_accessed_at INTEGER,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_portal_tokens_hash ON portal_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_portal_tokens_project ON portal_tokens(project_id);
      `);
    } catch (_) { /* already exists */ }

    // Migration: deliverables table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS deliverables (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT DEFAULT 'application/octet-stream',
          uploaded_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables(project_id);
      `);
    } catch (_) { /* already exists */ }

    // Migration: client_reports table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS client_reports (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          period TEXT NOT NULL,
          html_content TEXT,
          pdf_path TEXT,
          generated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_client_reports_project ON client_reports(project_id);
      `);
    } catch (_) { /* already exists */ }

    // Sprint 6 — invoice reminder columns
    const invoiceReminderMigrations = [
      `ALTER TABLE invoices ADD COLUMN reminder_sent_at INTEGER;`,
      `ALTER TABLE invoices ADD COLUMN reminder_count INTEGER DEFAULT 0;`,
    ];
    for (const sql of invoiceReminderMigrations) {
      try { sqlite.exec(sql); } catch (_) { /* column already exists */ }
    }

    // Sprint 6 — lead nurture columns
    const nurtureMigrations = [
      `ALTER TABLE leads ADD COLUMN nurture_step INTEGER DEFAULT 0;`,
      `ALTER TABLE leads ADD COLUMN nurture_started_at INTEGER;`,
    ];
    for (const sql of nurtureMigrations) {
      try { sqlite.exec(sql); } catch (_) { /* column already exists */ }
    }

    // Sprint 6 — notifications table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'info',
          severity TEXT NOT NULL DEFAULT 'info',
          title TEXT NOT NULL,
          message TEXT,
          entity_type TEXT,
          entity_id TEXT,
          is_read INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(type);
      `);
    } catch (_) { /* already exists */ }

    // Sprint 6 — audit_trail table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS audit_trail (
          id TEXT PRIMARY KEY,
          user_id TEXT DEFAULT 'system',
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          changes_json TEXT,
          ip TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_trail(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_trail(action);
      `);
    } catch (_) { /* already exists */ }

    // Seed n8n workflow IDs
    const seedWorkflows = [
      { name: "Cal.com → Lead", n8nId: "Abf2sv4YFM6MDzjf", status: "Actif", desc: "Booking Cal.com → création lead cockpit" },
      { name: "Lead Status → Emails", n8nId: "JdlnQqbcXOp05V5K", status: "Actif", desc: "Envoi emails automatiques selon statut lead" },
      { name: "Relances Propositions", n8nId: "2C14mzrMUPd0LFtG", status: "Actif", desc: "Relances automatiques propositions en attente" },
      { name: "Deadline Tracker", n8nId: "F4rA5iSg4hkeYR8u", status: "Actif", desc: "Alertes deadlines projets" },
      { name: "KPIs Recap Hebdo", n8nId: "lWjT0ZFRxT8ooOOe", status: "Actif", desc: "Rapport KPIs hebdomadaire automatique" },
      { name: "Testimonial J+3", n8nId: "d8TDuNjVOA3vGMhJ", status: "Actif", desc: "Demande témoignage 3j après livraison" },
      { name: "Archivage J+10", n8nId: "Du5zWtxfG9R665xt", status: "Actif", desc: "Archivage automatique J+10 livraison" },
      { name: "Website Audit", n8nId: "xs1PZCi6QyKdSba0", status: "Actif", desc: "Audit site web automatisé" },
      { name: "Google Maps Scraper", n8nId: "nrRSJkM4xCBrzRau", status: "Inactif", desc: "Scraping Google Maps pour prospection cold email" },
      { name: "Content Ideas", n8nId: "bw7n0KtV2IKWSxZz", status: "Inactif", desc: "Génération idées de contenu IA" },
      { name: "Auto-Draft Writer", n8nId: "AWBGnPHKwG56YGlC", status: "Inactif", desc: "Rédaction automatique contenu IA" },
      { name: "Auto-Publishing", n8nId: "zstXGRPP2HvaDYVz", status: "Inactif", desc: "Publication automatique contenu" },
      { name: "Performance Tracker", n8nId: "QccQpFcxfiXYpAkJ", status: "Inactif", desc: "Tracking performance contenu publié" },
    ];

    const existingN8n = sqlite.prepare("SELECT n8n_workflow_id FROM automations WHERE n8n_workflow_id IS NOT NULL").all();
    if (existingN8n.length === 0) {
      const insertStmt = sqlite.prepare(`
        INSERT OR IGNORE INTO automations (id, name, description, tool, status, n8n_workflow_id, run_count, error_count, created_at, updated_at)
        VALUES (?, ?, ?, 'n8n', ?, ?, 0, 0, ?, ?)
      `);
      const now = Date.now();
      for (const wf of seedWorkflows) {
        const id = `auto_n8n_${wf.n8nId}`;
        insertStmt.run(id, wf.name, wf.desc, wf.status, wf.n8nId, now, now);
      }
    }
  }
  return db;
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

export async function createLead(data: {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string;
  status?: string;
  score?: number;
  scoreCriteria?: string | null;
  budget?: string | null;
  propositionAmount?: number | null;
  timeline?: string | null;
  notes?: string | null;
  website?: string | null;
  websiteScore?: number | null;
  emailSentCount?: number;
  lastContactedAt?: number | null;
}) {
  const db = getDb();
  const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  await db.insert(leads).values({
    id,
    name: data.name,
    company: data.company ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    source: (data.source as any) ?? 'Site',
    status: (data.status as any) ?? 'Nouveau',
    score: data.score ?? 0,
    scoreCriteria: data.scoreCriteria ?? null,
    budget: (data.budget as any) ?? null,
    propositionAmount: data.propositionAmount ?? null,
    timeline: data.timeline ?? null,
    notes: data.notes ?? null,
    website: data.website ?? null,
    websiteScore: data.websiteScore ?? null,
    emailSentCount: data.emailSentCount ?? 0,
    lastContactedAt: data.lastContactedAt ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

export async function updateLead(id: string, data: Record<string, unknown>) {
  const db = getDb();
  await db.update(leads).set({ ...data, updatedAt: Date.now() } as any).where(eq(leads.id, id));
}

export async function getLeads(status?: string) {
  const db = getDb();
  if (status) {
    return db.select().from(leads).where(eq(leads.status, status as any)).orderBy(desc(leads.createdAt));
  }
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: string) {
  const db = getDb();
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0] ?? null;
}

export async function deleteLead(id: string) {
  const db = getDb();
  await db.delete(leads).where(eq(leads.id, id));
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export async function createProject(data: {
  clientName: string;
  projectType: string;
  phase?: string;
  status?: string;
  budget?: number | null;
  startDate?: number | null;
  kickoffDate?: number | null;
  deadline?: number | null;
  hoursEstimated?: number;
  notes?: string | null;
  teamAgents?: string | null;
  leadId?: string | null;
}) {
  const db = getDb();
  const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  await db.insert(projects).values({
    id,
    clientName: data.clientName,
    projectType: data.projectType as any,
    phase: (data.phase as any) ?? 'Onboarding',
    status: (data.status as any) ?? 'Actif',
    budget: data.budget ?? null,
    startDate: data.startDate ?? null,
    kickoffDate: data.kickoffDate ?? null,
    deadline: data.deadline ?? null,
    hoursEstimated: data.hoursEstimated ?? 0,
    hoursActual: 0,
    notes: data.notes ?? null,
    teamAgents: data.teamAgents ?? null,
    leadId: data.leadId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  const db = getDb();
  await db.update(projects).set({ ...data, updatedAt: Date.now() } as any).where(eq(projects.id, id));
}

export async function getProjects(status?: string) {
  const db = getDb();
  if (status && status !== 'all') {
    return db.select().from(projects).where(eq(projects.status, status as any)).orderBy(desc(projects.createdAt));
  }
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: string) {
  const db = getDb();
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] ?? null;
}

export async function deleteProject(id: string) {
  const db = getDb();
  await db.delete(timeEntries).where(eq(timeEntries.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

// ─── TIME ENTRIES ─────────────────────────────────────────────────────────────

async function recalcProjectHours(projectId: string) {
  const db = getDb();
  const entries = await db.select().from(timeEntries).where(eq(timeEntries.projectId, projectId));
  const total = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  await db.update(projects).set({ hoursActual: total, updatedAt: Date.now() } as any).where(eq(projects.id, projectId));
}

export async function createTimeEntry(data: {
  projectId: string;
  description: string;
  hours: number;
  date: number;
  category?: string;
}) {
  const db = getDb();
  const id = `te_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(timeEntries).values({
    id,
    projectId: data.projectId,
    description: data.description,
    hours: data.hours,
    date: data.date,
    category: (data.category as any) ?? 'Autre',
    createdAt: Date.now(),
  });
  await recalcProjectHours(data.projectId);
  return { id };
}

export async function getTimeEntriesForProject(projectId: string) {
  const db = getDb();
  return db.select().from(timeEntries)
    .where(eq(timeEntries.projectId, projectId))
    .orderBy(desc(timeEntries.date));
}

export async function deleteTimeEntry(id: string) {
  const db = getDb();
  const entry = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);
  await db.delete(timeEntries).where(eq(timeEntries.id, id));
  if (entry[0]) await recalcProjectHours(entry[0].projectId);
}

// Task operations
export async function createTask(data: { id: string; agentName: string; prompt: string }) {
  const db = getDb();
  const now = new Date();
  await db.insert(tasks).values({
    id: data.id,
    agentName: data.agentName,
    prompt: data.prompt,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  });
  return { id: data.id, status: 'PENDING' };
}

export async function updateTaskStatus(
  id: string, 
  status: string, 
  result?: string,
  error?: string,
  iteration?: number,
  stage?: string
) {
  const db = getDb();
  const updateData: any = { status, updatedAt: new Date() };
  if (result !== undefined) updateData.result = result;
  if (error !== undefined) updateData.error = error;
  if (iteration !== undefined) updateData.iteration = iteration;
  if (stage !== undefined) updateData.stage = stage;
  await db.update(tasks).set(updateData).where(eq(tasks.id, id));
}

export async function getTask(id: string) {
  const db = getDb();
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0] || null;
}

export async function getRecentTasks(limit: number = 50) {
  const db = getDb();
  return await db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(limit);
}

// Agent Activity operations
export async function logAgentActivity(data: any) {
  const db = getDb();
  await db.insert(agentActivities).values({
    ...data,
    resultSize: data.result?.length || 0,
  });
}

// Proposals operations
export async function createProposal(data: any) {
  const db = getDb();
  await db.insert(proposals).values({
    ...data,
    discoveredBy: data.discoveredBy || 'abdulkhabir',
    elevatedBy: data.elevatedBy || 'abdulbasir',
    status: 'PENDING',
    createdAt: new Date(),
  });
  return { id: data.id };
}

export async function getPendingProposals() {
  const db = getDb();
  return await db.select().from(proposals).where(eq(proposals.status, 'PENDING')).orderBy(desc(proposals.createdAt));
}

export async function updateProposalStatus(id: string, status: 'APPROVED' | 'REJECTED', decisionBy?: string, implementationTaskId?: string) {
  const db = getDb();
  await db.update(proposals).set({ status, decidedAt: new Date(), decisionBy, implementationTaskId }).where(eq(proposals.id, id));
}

// ============================================================
// FINANCES HELPERS
// ============================================================
export async function createInvoice(data: Omit<NewInvoice, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const id = `inv_${now}_${Math.random().toString(36).slice(2, 7)}`;
  await getDb().insert(invoices).values({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}
export async function updateInvoice(id: string, data: Partial<Invoice>) {
  await getDb().update(invoices).set({ ...data, updatedAt: Date.now() }).where(eq(invoices.id, id));
}
export async function getInvoices(status?: string) {
  const db = getDb();
  if (status) return db.select().from(invoices).where(eq(invoices.status, status as any)).orderBy(desc(invoices.createdAt));
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
}
export async function deleteInvoice(id: string) {
  await getDb().delete(invoices).where(eq(invoices.id, id));
}
export async function createExpense(data: Omit<NewExpense, 'id' | 'createdAt'>) {
  const now = Date.now();
  const id = `exp_${now}_${Math.random().toString(36).slice(2, 7)}`;
  await getDb().insert(expenses).values({ ...data, id, createdAt: now });
  return id;
}
export async function updateExpense(id: string, data: Partial<Expense>) {
  await getDb().update(expenses).set(data).where(eq(expenses.id, id));
}
export async function getExpenses(category?: string) {
  const db = getDb();
  if (category) return db.select().from(expenses).where(eq(expenses.category, category as any)).orderBy(desc(expenses.date));
  return db.select().from(expenses).orderBy(desc(expenses.date));
}
export async function deleteExpense(id: string) {
  await getDb().delete(expenses).where(eq(expenses.id, id));
}

// ============================================================
// CONTENT HELPERS
// ============================================================
export async function createContentItem(data: Omit<NewContentItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const id = `cnt_${now}_${Math.random().toString(36).slice(2, 7)}`;
  await getDb().insert(contentItems).values({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}
export async function updateContentItem(id: string, data: Partial<ContentItem>) {
  await getDb().update(contentItems).set({ ...data, updatedAt: Date.now() }).where(eq(contentItems.id, id));
}
export async function getContentItems(filters?: { status?: string; platform?: string; agent?: string }) {
  const db = getDb();
  let q = db.select().from(contentItems);
  const items = await q.orderBy(desc(contentItems.createdAt));
  if (!filters) return items;
  return items.filter(i =>
    (!filters.status || i.status === filters.status) &&
    (!filters.platform || i.platform === filters.platform) &&
    (!filters.agent || i.agent === filters.agent)
  );
}
export async function deleteContentItem(id: string) {
  await getDb().delete(contentItems).where(eq(contentItems.id, id));
}

// ============================================================
// AUTOMATIONS HELPERS
// ============================================================
export async function createAutomation(data: Omit<NewAutomation, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const id = `aut_${now}_${Math.random().toString(36).slice(2, 7)}`;
  await getDb().insert(automations).values({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}
export async function updateAutomation(id: string, data: Partial<Automation>) {
  await getDb().update(automations).set({ ...data, updatedAt: Date.now() }).where(eq(automations.id, id));
}
export async function getAutomations(status?: string) {
  const db = getDb();
  if (status) return db.select().from(automations).where(eq(automations.status, status as any)).orderBy(desc(automations.createdAt));
  return db.select().from(automations).orderBy(desc(automations.createdAt));
}
export async function deleteAutomation(id: string) {
  await getDb().delete(automations).where(eq(automations.id, id));
}

// ============================================================
// PORTFOLIO HELPERS
// ============================================================
export async function createPortfolioItem(data: Omit<NewPortfolioItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const id = `prt_${now}_${Math.random().toString(36).slice(2, 7)}`;
  await getDb().insert(portfolioItems).values({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}
export async function updatePortfolioItem(id: string, data: Partial<PortfolioItem>) {
  await getDb().update(portfolioItems).set({ ...data, updatedAt: Date.now() }).where(eq(portfolioItems.id, id));
}
export async function getPortfolioItems(filters?: { projectType?: string; featured?: boolean; published?: boolean }) {
  const db = getDb();
  const items = await db.select().from(portfolioItems).orderBy(desc(portfolioItems.createdAt));
  if (!filters) return items;
  return items.filter(i =>
    (!filters.projectType || i.projectType === filters.projectType) &&
    (filters.featured === undefined || Boolean(i.featured) === filters.featured) &&
    (filters.published === undefined || Boolean(i.published) === filters.published)
  );
}
export async function deletePortfolioItem(id: string) {
  await getDb().delete(portfolioItems).where(eq(portfolioItems.id, id));
}

// ============================================================
// POST-VENTE HELPERS
// ============================================================
export async function createFollowup(data: Omit<NewFollowup, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const id = `flw_${now}_${Math.random().toString(36).slice(2, 7)}`;
  await getDb().insert(followups).values({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}
export async function updateFollowup(id: string, data: Partial<Followup>) {
  await getDb().update(followups).set({ ...data, updatedAt: Date.now() }).where(eq(followups.id, id));
}
export async function getFollowups(filters?: { status?: string; type?: string }) {
  const db = getDb();
  const items = await db.select().from(followups).orderBy(desc(followups.createdAt));
  if (!filters) return items;
  return items.filter(i =>
    (!filters.status || i.status === filters.status) &&
    (!filters.type || i.type === filters.type)
  );
}
export async function deleteFollowup(id: string) {
  await getDb().delete(followups).where(eq(followups.id, id));
}

// ============================================================
// INSTAGRAM PROFILE CACHE HELPERS
// ============================================================

export interface IGProfileCache {
  handle: string;
  status: 'qualified' | 'rejected' | 'dm_sent';
  reason?: string;
  score?: number;
  followers?: number;
  fullName?: string;
  bio?: string;
  niche?: string;
  analyzedAt: number;
}

export function getCachedProfile(handle: string): IGProfileCache | null {
  const rawDb = (getDb() as any).$client;
  try {
    const row = rawDb.prepare(
      `SELECT handle, status, reason, score, followers, full_name, bio, niche, analyzed_at FROM ig_profiles_cache WHERE handle = ?`
    ).get(handle.toLowerCase()) as any;
    if (!row) return null;
    return {
      handle: row.handle,
      status: row.status,
      reason: row.reason,
      score: row.score,
      followers: row.followers,
      fullName: row.full_name,
      bio: row.bio,
      niche: row.niche,
      analyzedAt: row.analyzed_at,
    };
  } catch { return null; }
}

export function upsertProfileCache(data: IGProfileCache): void {
  const rawDb = (getDb() as any).$client;
  try {
    rawDb.prepare(`
      INSERT INTO ig_profiles_cache (handle, status, reason, score, followers, full_name, bio, niche, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(handle) DO UPDATE SET
        status = excluded.status,
        reason = excluded.reason,
        score = excluded.score,
        followers = excluded.followers,
        full_name = excluded.full_name,
        bio = excluded.bio,
        niche = excluded.niche,
        analyzed_at = excluded.analyzed_at
    `).run(
      data.handle.toLowerCase(),
      data.status,
      data.reason ?? null,
      data.score ?? null,
      data.followers ?? null,
      data.fullName ?? null,
      data.bio ?? null,
      data.niche ?? null,
      data.analyzedAt,
    );
  } catch { /* ignore */ }
}

export function getProfilesByStatus(status: string): IGProfileCache[] {
  const rawDb = (getDb() as any).$client;
  try {
    const rows = rawDb.prepare(
      `SELECT handle, status, reason, score, followers, full_name, bio, niche, analyzed_at FROM ig_profiles_cache WHERE status = ? ORDER BY analyzed_at DESC`
    ).all(status) as any[];
    return rows.map(row => ({
      handle: row.handle,
      status: row.status,
      reason: row.reason,
      score: row.score,
      followers: row.followers,
      fullName: row.full_name,
      bio: row.bio,
      niche: row.niche,
      analyzedAt: row.analyzed_at,
    }));
  } catch { return []; }
}

export function getAllCachedProfiles(): IGProfileCache[] {
  const rawDb = (getDb() as any).$client;
  try {
    const rows = rawDb.prepare(
      `SELECT handle, status, reason, score, followers, full_name, bio, niche, analyzed_at FROM ig_profiles_cache ORDER BY analyzed_at DESC LIMIT 500`
    ).all() as any[];
    return rows.map(row => ({
      handle: row.handle,
      status: row.status,
      reason: row.reason,
      score: row.score,
      followers: row.followers,
      fullName: row.full_name,
      bio: row.bio,
      niche: row.niche,
      analyzedAt: row.analyzed_at,
    }));
  } catch { return []; }
}

// ============================================================
// AGENT EXECUTIONS — IA Monitoring (Sprint 3)
// ============================================================

export interface AgentExecutionLog {
  agentId: string;
  taskId?: string | null;
  prompt: string;
  durationMs: number;
  success: boolean;
  error?: string | null;
  tokenInput?: number | null;
  tokenOutput?: number | null;
}

export function logAgentExecution(data: AgentExecutionLog): string {
  const rawDb = (getDb() as any).$client;
  const id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  rawDb.prepare(`
    INSERT INTO agent_executions (id, agent_id, task_id, prompt, duration_ms, success, error, token_input, token_output, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.agentId,
    data.taskId ?? null,
    data.prompt.slice(0, 2000), // cap prompt storage
    data.durationMs,
    data.success ? 1 : 0,
    data.error ?? null,
    data.tokenInput ?? null,
    data.tokenOutput ?? null,
    Date.now(),
  );
  return id;
}

export interface AgentExecStats {
  agentId: string;
  totalExecutions: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDurationMs: number;
  totalTokenInput: number;
  totalTokenOutput: number;
}

export function getAgentExecutionStats(agentId?: string, timeframeMs?: number): AgentExecStats[] {
  const rawDb = (getDb() as any).$client;
  const since = timeframeMs ? Date.now() - timeframeMs : 0;

  const whereClause = agentId
    ? `WHERE agent_id = ? AND created_at > ?`
    : `WHERE created_at > ?`;
  const params = agentId ? [agentId, since] : [since];

  const rows = rawDb.prepare(`
    SELECT
      agent_id,
      COUNT(*) as total,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as fail_count,
      AVG(duration_ms) as avg_duration,
      COALESCE(SUM(token_input), 0) as total_token_input,
      COALESCE(SUM(token_output), 0) as total_token_output
    FROM agent_executions
    ${whereClause}
    GROUP BY agent_id
    ORDER BY total DESC
  `).all(...params) as any[];

  return rows.map(r => ({
    agentId: r.agent_id,
    totalExecutions: r.total,
    successCount: r.success_count,
    failCount: r.fail_count,
    successRate: r.total > 0 ? Math.round((r.success_count / r.total) * 100) : 0,
    avgDurationMs: Math.round(r.avg_duration || 0),
    totalTokenInput: r.total_token_input,
    totalTokenOutput: r.total_token_output,
  }));
}

export interface RecentExecution {
  id: string;
  agentId: string;
  taskId: string | null;
  prompt: string;
  durationMs: number;
  success: boolean;
  error: string | null;
  tokenInput: number | null;
  tokenOutput: number | null;
  createdAt: number;
}

export function getRecentExecutions(limit: number = 20): RecentExecution[] {
  const rawDb = (getDb() as any).$client;
  const rows = rawDb.prepare(`
    SELECT id, agent_id, task_id, prompt, duration_ms, success, error, token_input, token_output, created_at
    FROM agent_executions
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map(r => ({
    id: r.id,
    agentId: r.agent_id,
    taskId: r.task_id,
    prompt: r.prompt,
    durationMs: r.duration_ms,
    success: r.success === 1,
    error: r.error,
    tokenInput: r.token_input,
    tokenOutput: r.token_output,
    createdAt: r.created_at,
  }));
}

// ─── User Events (analytics tracking) ───────────────────────────

export function logUserEvent(eventType: string, metadata?: Record<string, unknown>): string {
  const id = crypto.randomUUID();
  const rawDb = (getDb() as any).$client;
  rawDb.prepare(`
    INSERT INTO user_events (id, event_type, metadata, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, eventType, metadata ? JSON.stringify(metadata) : null, Date.now());
  return id;
}

// ============================================================
// PORTAL TOKENS
// ============================================================

import crypto from 'crypto';

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function createPortalToken(projectId: string, label?: string, expiresInDays: number = 90): { id: string; rawToken: string } {
  const rawDb = (getDb() as any).$client;
  const id = `ptk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = now + expiresInDays * 24 * 60 * 60 * 1000;

  rawDb.prepare(`
    INSERT INTO portal_tokens (id, project_id, token_hash, label, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, projectId, tokenHash, label ?? null, expiresAt, now);

  return { id, rawToken };
}

export function getProjectByPortalToken(rawToken: string): { projectId: string; tokenId: string; expired: boolean } | null {
  const rawDb = (getDb() as any).$client;
  const tokenHash = hashToken(rawToken);

  const row = rawDb.prepare(`
    SELECT id, project_id, expires_at FROM portal_tokens WHERE token_hash = ?
  `).get(tokenHash) as { id: string; project_id: string; expires_at: number | null } | undefined;

  if (!row) return null;

  // Update last_accessed_at
  rawDb.prepare(`UPDATE portal_tokens SET last_accessed_at = ? WHERE id = ?`).run(Date.now(), row.id);

  const expired = row.expires_at ? Date.now() > row.expires_at : false;
  return { projectId: row.project_id, tokenId: row.id, expired };
}

export function revokePortalToken(id: string): void {
  const rawDb = (getDb() as any).$client;
  rawDb.prepare(`DELETE FROM portal_tokens WHERE id = ?`).run(id);
}

export function getPortalTokensForProject(projectId: string): Array<{ id: string; label: string | null; expiresAt: number | null; createdAt: number }> {
  const rawDb = (getDb() as any).$client;
  const rows = rawDb.prepare(`
    SELECT id, label, expires_at, created_at FROM portal_tokens WHERE project_id = ? ORDER BY created_at DESC
  `).all(projectId) as Array<{ id: string; label: string | null; expires_at: number | null; created_at: number }>;
  return rows.map(r => ({ id: r.id, label: r.label, expiresAt: r.expires_at, createdAt: r.created_at }));
}

// ============================================================
// DELIVERABLES
// ============================================================

export function createDeliverable(data: { projectId: string; filename: string; filePath: string; fileSize?: number; mimeType?: string }): string {
  const rawDb = (getDb() as any).$client;
  const id = `dlv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  rawDb.prepare(`
    INSERT INTO deliverables (id, project_id, filename, file_path, file_size, mime_type, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.projectId, data.filename, data.filePath, data.fileSize ?? null, data.mimeType ?? 'application/octet-stream', Date.now());
  return id;
}

export function getDeliverablesForProject(projectId: string): Deliverable[] {
  const rawDb = (getDb() as any).$client;
  const rows = rawDb.prepare(`
    SELECT id, project_id, filename, file_path, file_size, mime_type, uploaded_at
    FROM deliverables WHERE project_id = ? ORDER BY uploaded_at DESC
  `).all(projectId) as Array<Record<string, unknown>>;
  return rows.map(r => ({
    id: r.id as string,
    projectId: r.project_id as string,
    filename: r.filename as string,
    filePath: r.file_path as string,
    fileSize: r.file_size as number | null,
    mimeType: r.mime_type as string | null,
    uploadedAt: r.uploaded_at as number,
  }));
}

export function deleteDeliverable(id: string): void {
  const rawDb = (getDb() as any).$client;
  rawDb.prepare(`DELETE FROM deliverables WHERE id = ?`).run(id);
}

// ============================================================
// CLIENT REPORTS
// ============================================================

export function createClientReport(data: { projectId: string; period: string; htmlContent?: string; pdfPath?: string }): string {
  const rawDb = (getDb() as any).$client;
  const id = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  rawDb.prepare(`
    INSERT INTO client_reports (id, project_id, period, html_content, pdf_path, generated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.projectId, data.period, data.htmlContent ?? null, data.pdfPath ?? null, Date.now());
  return id;
}

export function getClientReportsForProject(projectId: string): ClientReport[] {
  const rawDb = (getDb() as any).$client;
  const rows = rawDb.prepare(`
    SELECT id, project_id, period, html_content, pdf_path, generated_at
    FROM client_reports WHERE project_id = ? ORDER BY generated_at DESC
  `).all(projectId) as Array<Record<string, unknown>>;
  return rows.map(r => ({
    id: r.id as string,
    projectId: r.project_id as string,
    period: r.period as string,
    htmlContent: r.html_content as string | null,
    pdfPath: r.pdf_path as string | null,
    generatedAt: r.generated_at as number,
  }));
}

// ============================================================
// INVOICES — extra helpers
// ============================================================

export function getInvoicesByProjectId(projectId: string): Invoice[] {
  const rawDb = (getDb() as any).$client;
  const rows = rawDb.prepare(`
    SELECT * FROM invoices WHERE project_id = ? ORDER BY created_at DESC
  `).all(projectId) as Array<Record<string, unknown>>;
  return rows.map(r => ({
    id: r.id as string,
    clientName: r.client_name as string,
    projectId: r.project_id as string | null,
    amount: r.amount as number,
    status: r.status as string,
    dueDate: r.due_date as number | null,
    paidAt: r.paid_at as number | null,
    sentAt: r.sent_at as number | null,
    notes: r.notes as string | null,
    stripePaymentIntentId: r.stripe_payment_intent_id as string | null,
    stripePaymentLinkUrl: r.stripe_payment_link_url as string | null,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
  }));
}

export function getInvoiceById(id: string): Invoice | null {
  const rawDb = (getDb() as any).$client;
  const r = rawDb.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: r.id as string,
    clientName: r.client_name as string,
    projectId: r.project_id as string | null,
    amount: r.amount as number,
    status: r.status as string,
    dueDate: r.due_date as number | null,
    paidAt: r.paid_at as number | null,
    sentAt: r.sent_at as number | null,
    notes: r.notes as string | null,
    stripePaymentIntentId: r.stripe_payment_intent_id as string | null,
    stripePaymentLinkUrl: r.stripe_payment_link_url as string | null,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
  };
}

export function findInvoiceByStripeIntent(stripePaymentIntentId: string): Invoice | null {
  const rawDb = (getDb() as any).$client;
  const r = rawDb.prepare(`SELECT * FROM invoices WHERE stripe_payment_intent_id = ?`).get(stripePaymentIntentId) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: r.id as string,
    clientName: r.client_name as string,
    projectId: r.project_id as string | null,
    amount: r.amount as number,
    status: r.status as string,
    dueDate: r.due_date as number | null,
    paidAt: r.paid_at as number | null,
    sentAt: r.sent_at as number | null,
    notes: r.notes as string | null,
    stripePaymentIntentId: r.stripe_payment_intent_id as string | null,
    stripePaymentLinkUrl: r.stripe_payment_link_url as string | null,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
  };
}
