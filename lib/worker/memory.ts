/**
 * 🧠 PILIER 2 : MÉMOIRE LONG-TERME & RAG
 * Semantic Component Vault - Capitalisation de l'agence
 */

import { getDb } from '../db';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

const WORKSPACE_DIR = path.join(os.homedir(), '.openclaw/workspace');

// Interface du composant mémorisé
export interface VaultedComponent {
  id: string;
  briefText: string;
  codeContent: string;
  embedding: number[];
  metadata: {
    serviceId: string;
    createdAt: string;
    successRate: number;
    reuseCount: number;
  };
}

// Type pour la base de données SQLite
interface Database {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number };
    get: (...params: unknown[]) => Record<string, unknown> | undefined;
    all: (...params: unknown[]) => Record<string, unknown>[];
  };
}

/**
 * 🔮 Génération d'Embedding via Kimi
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await getEmbeddingFromKimi(text);
  } catch (error) {
    console.warn('[MemoryVault] Kimi embedding failed, using fallback');
    return generateFallbackEmbedding(text);
  }
}

/**
 * 🔮 Appel à Kimi pour embedding
 */
async function getEmbeddingFromKimi(text: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const prompt = `Génère un vecteur d'embedding JSON de 50 nombres entre -1 et 1. Texte: "${text.substring(0, 500)}"`;
    
    const child = spawn('openclaw', [
      'agent', '--agent', 'abdulhakim', '--message', prompt, '--local', '--timeout', '30'
    ], { cwd: WORKSPACE_DIR, env: { ...process.env, FORCE_COLOR: '0' }});

    let stdout = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    
    child.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error('Embedding failed'));
        return;
      }
      const match = stdout.match(/\[([\d\s,.\-]+)\]/);
      if (match) {
        const embedding = JSON.parse(match[0]) as number[];
        if (Array.isArray(embedding) && embedding.length > 0) {
          resolve(embedding);
          return;
        }
      }
      reject(new Error('Invalid format'));
    });
    
    child.on('error', reject);
  });
}

/**
 * 🔮 Fallback embedding
 */
function generateFallbackEmbedding(text: string): number[] {
  const VECTOR_SIZE = 50;
  const vector = new Array(VECTOR_SIZE).fill(0);
  
  const keywords = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w: string) => w.length >= 4);
  
  keywords.forEach((keyword: string) => {
    const position = simpleHash(keyword) % VECTOR_SIZE;
    vector[position] = Math.min(1, vector[position] + 0.2);
  });
  
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * 📐 Similarité Cosinus
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 💾 SAUVEGARDE DANS LE VAULT
 */
export async function saveToVault(
  briefText: string,
  codeContent: string,
  serviceId: string = 'generic',
  successRate: number = 1.0
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log(`[MemoryVault] Saving component...`);
    const embedding = await generateEmbedding(briefText);
    
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    const id = `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare(`
      INSERT INTO component_vault (id, brief_text, code_content, embedding, service_id, created_at, success_rate, reuse_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      briefText.substring(0, 2000),
      codeContent.substring(0, 50000),
      JSON.stringify(embedding),
      serviceId,
      new Date().toISOString(),
      successRate,
      0
    );
    
    console.log(`[MemoryVault] ✅ Saved: ${id}`);
    return { success: true, id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Save failed';
    console.error('[MemoryVault] ❌', msg);
    return { success: false, error: msg };
  }
}

/**
 * 🔍 RECHERCHE DANS LE VAULT
 */
export async function searchVault(
  briefText: string,
  threshold: number = 0.85,
  limit: number = 3
): Promise<{ success: boolean; matches?: VaultedComponent[]; error?: string }> {
  try {
    console.log(`[MemoryVault] Searching...`);
    const queryEmbedding = await generateEmbedding(briefText);
    
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    const rows = db.prepare(`
      SELECT id, brief_text, code_content, embedding, service_id, created_at, success_rate, reuse_count
      FROM component_vault
    `).all();
    
    const scored = rows.map((row: Record<string, unknown>) => {
      const compEmbedding = JSON.parse(row.embedding as string) as number[];
      return {
        id: row.id as string,
        briefText: row.brief_text as string,
        codeContent: row.code_content as string,
        serviceId: row.service_id as string,
        createdAt: row.created_at as string,
        successRate: row.success_rate as number,
        reuseCount: row.reuse_count as number,
        similarity: cosineSimilarity(queryEmbedding, compEmbedding)
      };
    });
    
    const matches = scored
      .filter((c) => c.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        briefText: c.briefText,
        codeContent: c.codeContent,
        embedding: queryEmbedding,
        metadata: {
          serviceId: c.serviceId,
          createdAt: c.createdAt,
          successRate: c.successRate,
          reuseCount: c.reuseCount
        }
      }));
    
    if (matches.length > 0) {
      console.log(`[MemoryVault] ✅ Found ${matches.length} matches`);
      for (const match of matches) {
        db.prepare(`UPDATE component_vault SET reuse_count = reuse_count + 1 WHERE id = ?`).run(match.id);
      }
    }
    
    return { success: true, matches };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Search failed';
    console.error('[MemoryVault] ❌', msg);
    return { success: false, error: msg };
  }
}

/**
 * 📊 Stats du Vault
 */
export async function getVaultStats(): Promise<{ total: number; reused: number }> {
  try {
    const drizzleDb = getDb();
    const db = (drizzleDb as unknown as { $client: Database }).$client;
    
    const result = db.prepare(`SELECT COUNT(*) as total, SUM(reuse_count) as reused FROM component_vault`).get();
    
    return {
      total: (result?.total as number) || 0,
      reused: (result?.reused as number) || 0
    };
  } catch {
    return { total: 0, reused: 0 };
  }
}
