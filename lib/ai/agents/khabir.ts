/**
 * ⭐ ABDUL KHABIR - The Scout (الخبير)
 * 
 * "Celui qui explore les terres inconnues"
 * 
 * Mission: Surveiller le web tech et découvrir les innovations émergentes
 * avant qu'elles ne deviennent mainstream.
 * 
 * Philosophy: "Ne pas scraper pour scraper, mais détecter les signaux faibles"
 */

import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { getDb } from '@/lib/db';
import { discoveries, type NewDiscovery } from '@/lib/db/schema_rd';
import { eq, and, gte, sql } from 'drizzle-orm';

// ============================================================================
// CONFIGURATION
// ============================================================================

const KHABIR_CONFIG = {
  // Sources à surveiller
  sources: {
    producthunt: {
      enabled: true,
      minVotes: 50,
      weight: 1.2, // Product Hunt = signal marché early
    },
    github: {
      enabled: true,
      topics: ['ai-agents', 'llm', 'automation', 'developer-tools'],
      minStars: 100,
      weight: 1.5, // GitHub = validation technique
    },
    hackernews: {
      enabled: true,
      minScore: 30,
      weight: 1.3, // HN = validation business
    },
    arxiv: {
      enabled: true,
      categories: ['cs.AI', 'cs.SE', 'cs.HC'],
      weight: 0.9, // ArXiv = théorique
    },
  },
  
  // Filtres de qualité
  quality: {
    minEngagementScore: 0.3,
    recencyDecayHours: 168, // 1 semaine
    maxDiscoveriesPerRun: 10,
  },
  
  // Keywords stratégiques pour Alt Ctrl Lab
  strategicKeywords: [
    'multi-agent', 'agent orchestration', 'AI workflow', 'LLM pipeline',
    'autonomous AI', 'AI team', 'agent communication', 'tool calling',
    'function calling', 'RAG', 'vector database', 'embedding',
    'prompt engineering', 'chain-of-thought', 'AI architecture',
    'developer productivity', 'code generation', 'AI-assisted development',
    'no-code AI', 'low-code AI', 'AI automation',
  ],
};

// ============================================================================
// TYPES
// ============================================================================

export interface ScrapedContent {
  url: string;
  platform: 'producthunt' | 'github' | 'hackernews' | 'twitter' | 'arxiv' | 'blog';
  rawTitle: string;
  rawContent: string;
  engagement: {
    score: number;
    metric: string; // "upvotes", "stars", "points"
  };
  publishedAt: Date;
  context?: string; // subreddit, repo owner, etc.
}

export interface KhabirAnalysisResult {
  concept: string;
  summary: string;
  techMaturity: 'bleeding_edge' | 'early_adopter' | 'mainstream' | 'legacy';
  relevanceScore: number; // 0-1
  relatedConcepts: string[];
  strategicAlignment: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface DiscoveryResult {
  success: boolean;
  discoveryId?: string;
  error?: string;
  alreadyKnown?: boolean;
}

// ============================================================================
// CORE AGENT
// ============================================================================

export class AbdulKhabir {
  private config = KHABIR_CONFIG;

  /**
   * Exécute une passe de veille technologique
   * 
   * @param options Options de scraping
   * @returns Liste des discoveries créées
   */
  async scout(options: {
    sources?: Array<'producthunt' | 'github' | 'hackernews' | 'arxiv'>;
    limit?: number;
    dryRun?: boolean;
  } = {}): Promise<DiscoveryResult[]> {
    const { sources, limit = 10, dryRun = false } = options;

    console.log('[Khabir] Starting scouting mission...');

    const results: DiscoveryResult[] = [];
    const scrapedContents: ScrapedContent[] = [];

    // 1. Scraper les sources
    if (sources?.includes('producthunt') ?? true) {
      const phContents = await this.scrapeProductHunt();
      scrapedContents.push(...phContents);
    }

    if (sources?.includes('github') ?? true) {
      const githubContents = await this.scrapeGitHub();
      scrapedContents.push(...githubContents);
    }

    if (sources?.includes('hackernews') ?? true) {
      const hnContents = await this.scrapeHackerNews();
      scrapedContents.push(...hnContents);
    }

    console.log(`[Khabir] Scraped ${scrapedContents.length} contents`);

    // 2. Analyser chaque contenu avec LLM
    for (const content of scrapedContents.slice(0, limit)) {
      try {
        const result = await this.analyzeAndStore(content, dryRun);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[Khabir] Mission complete: ${results.filter(r => r.success).length} new discoveries`);
    
    return results;
  }

  /**
   * Analyse un contenu scrapé et le stocke si pertinent
   */
  private async analyzeAndStore(
    content: ScrapedContent,
    dryRun: boolean
  ): Promise<DiscoveryResult> {
    // Vérifier si déjà connu (par URL)
    const db = getDb();
    const existing = await db.select({ id: discoveries.id })
      .from(discoveries)
      .where(eq(discoveries.sourceUrl, content.url))
      .limit(1);
    
    if (existing.length > 0) {
      return { success: false, alreadyKnown: true };
    }

    // Analyser avec LLM
    const analysis = await this.analyzeWithLLM(content);
    
    // Filtrer par relevance
    if (analysis.relevanceScore < 0.5) {
      return { success: false, error: 'Low relevance score' };
    }

    if (dryRun) {
      console.log('[Khabir] Dry run - would have created:', {
        concept: analysis.concept,
        relevance: analysis.relevanceScore,
      });
      return { success: true, discoveryId: 'dry-run' };
    }

    // Calculer les scores
    const engagementScore = this.calculateEngagementScore(content);
    const recencyScore = this.calculateRecencyScore(content.publishedAt);

    // Créer la discovery
    const newDiscovery: NewDiscovery = {
      id: `dsc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceUrl: content.url,
      sourcePlatform: content.platform,
      sourceContext: content.context,
      rawTitle: content.rawTitle,
      rawContent: content.rawContent,
      extractedConcept: analysis.concept,
      engagementScore,
      recencyScore,
      techMaturity: analysis.techMaturity,
      status: 'raw',
      discoveredAt: new Date(),
      discoveredBy: 'abdulkhabir',
      relatedConcepts: JSON.stringify(analysis.relatedConcepts),
    };

    await db.insert(discoveries).values(newDiscovery);

    // Logger l'apprentissage
    await this.logLearning('discovery_made', newDiscovery.id, undefined);

    return { success: true, discoveryId: newDiscovery.id };
  }

  /**
   * Analyse un contenu avec LLM (Kimi)
   */
  private async analyzeWithLLM(content: ScrapedContent): Promise<KhabirAnalysisResult> {
    const prompt = `Tu es AbdulKhabir, expert en veille technologique pour Alt Ctrl Lab.

CONTENU À ANALYSER:
Titre: ${content.rawTitle}
Plateforme: ${content.platform}
Contenu: ${content.rawContent.substring(0, 3000)}

TA MISSION:
Analyse ce contenu et extrait l'information stratégique pour notre agence digitale IA.

FORMAT DE RÉPONSE JSON:
{
  "concept": "Concept clé en 10 mots max",
  "summary": "Résumé technique en 2 phrases",
  "techMaturity": "bleeding_edge|early_adopter|mainstream|legacy",
  "relevanceScore": 0.0-1.0,
  "relatedConcepts": ["concept1", "concept2"],
  "strategicAlignment": "high|medium|low",
  "reasoning": "Pourquoi c'est pertinent pour Alt Ctrl Lab"
}

CONTEXTE ALT CTRL LAB:
- Agence digitale IA multi-agents
- 5 agents spécialisés (CEO, DA, Dev, Growth, Data)
- Focus: automatisation, création, développement
- Standard: Top 1% mondial

Ne retourne QUE le JSON, aucun texte avant ou après.`;

    const result = await executeOpenClawAgent('abdulkhabir', prompt, 60000);

    if (!result.success) {
      throw new Error(`LLM analysis failed: ${result.stderr}`);
    }

    try {
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        concept: parsed.concept || 'Unknown concept',
        summary: parsed.summary || '',
        techMaturity: parsed.techMaturity || 'early_adopter',
        relevanceScore: parsed.relevanceScore || 0.5,
        relatedConcepts: parsed.relatedConcepts || [],
        strategicAlignment: parsed.strategicAlignment || 'medium',
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      console.error('[Khabir] Failed to parse LLM response:', result.stdout);
      throw error;
    }
  }

  // ============================================================================
  // SCRAPING METHODS - Real API implementations
  // ============================================================================

  private async scrapeProductHunt(): Promise<ScrapedContent[]> {
    const token = process.env.PRODUCT_HUNT_TOKEN;
    if (!token) {
      console.warn('[Khabir] Product Hunt skipped: PRODUCT_HUNT_TOKEN not set');
      return [];
    }

    // Fetch top posts from the last 3 days
    const daysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const query = `{
      posts(order: VOTES, postedAfter: "${daysAgo}", first: 20) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            votesCount
            commentsCount
            createdAt
            topics {
              edges { node { name } }
            }
          }
        }
      }
    }`;

    const results: ScrapedContent[] = [];

    try {
      const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AltCtrlLab/1.0',
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        console.error('[Khabir] Product Hunt API error:', res.status);
        return [];
      }

      const data = await res.json() as { data?: { posts?: { edges: Array<{ node: any }> } } };
      const posts = data.data?.posts?.edges || [];

      for (const { node: post } of posts) {
        if (post.votesCount < this.config.sources.producthunt.minVotes) continue;

        const topics = (post.topics?.edges || [])
          .map((e: any) => e.node.name)
          .join(', ');

        results.push({
          url: post.url,
          platform: 'producthunt',
          rawTitle: `${post.name} — ${post.tagline}`,
          rawContent: [
            post.description || post.tagline,
            `Topics: ${topics}`,
            `Votes: ${post.votesCount} | Comments: ${post.commentsCount}`,
          ].join('\n'),
          engagement: { score: post.votesCount, metric: 'votes' },
          publishedAt: new Date(post.createdAt),
          context: topics,
        });
      }
    } catch (err) {
      console.error('[Khabir] Product Hunt scrape error:', err);
    }

    console.log(`[Khabir] Product Hunt: ${results.length} posts fetched`);
    return results;
  }

  private async scrapeGitHub(): Promise<ScrapedContent[]> {
    const topics = this.config.sources.github.topics;
    const results: ScrapedContent[] = [];
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AltCtrlLab/1.0',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    for (const topic of topics) {
      try {
        // Search repos updated in last 7 days with enough stars
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0];
        const query = `topic:${topic} pushed:>=${since} stars:>=${this.config.sources.github.minStars}`;
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`;

        const res = await fetch(url, { headers });

        if (!res.ok) {
          console.error(`[Khabir] GitHub topic:${topic} error:`, res.status);
          continue;
        }

        const data = await res.json() as { items: Array<any> };

        for (const repo of data.items || []) {
          results.push({
            url: repo.html_url,
            platform: 'github',
            rawTitle: `${repo.full_name} - ${repo.description || 'No description'}`,
            rawContent: [
              repo.description || '',
              `Language: ${repo.language || 'unknown'}`,
              `Stars: ${repo.stargazers_count}`,
              `Topics: ${(repo.topics || []).join(', ')}`,
            ].join('\n'),
            engagement: { score: repo.stargazers_count, metric: 'stars' },
            publishedAt: new Date(repo.pushed_at),
            context: topic,
          });
        }
      } catch (err) {
        console.error(`[Khabir] GitHub scrape error for topic:${topic}:`, err);
      }
    }

    console.log(`[Khabir] GitHub: ${results.length} repos fetched`);
    return results;
  }

  private async scrapeHackerNews(): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];

    try {
      // Fetch top 30 story IDs
      const idsRes = await fetch(
        'https://hacker-news.firebaseio.com/v0/topstories.json'
      );
      const ids = (await idsRes.json() as number[]).slice(0, 30);

      // Fetch each story in parallel (batch of 30 is fine, well under rate limits)
      const stories = await Promise.all(
        ids.map(id =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
            .then(r => r.json() as Promise<any>)
            .catch(() => null)
        )
      );

      for (const story of stories) {
        if (!story || story.type !== 'story') continue;
        if ((story.score || 0) < this.config.sources.hackernews.minScore) continue;
        if (!story.title) continue;

        results.push({
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          platform: 'hackernews',
          rawTitle: story.title,
          rawContent: story.text
            ? story.text.replace(/<[^>]*>/g, '').substring(0, 2000)
            : story.title,
          engagement: { score: story.score, metric: 'points' },
          publishedAt: new Date(story.time * 1000),
          context: story.by || '',
        });
      }
    } catch (err) {
      console.error('[Khabir] HackerNews scrape error:', err);
    }

    console.log(`[Khabir] HackerNews: ${results.length} stories fetched`);
    return results;
  }

  // ============================================================================
  // SCORING METHODS
  // ============================================================================

  private calculateEngagementScore(content: ScrapedContent): number {
    const platform = this.config.sources[content.platform];
    if (!platform) return 0.5;

    const normalizedScore = content.engagement.score / 1000; // Normaliser sur 1000
    const weightedScore = normalizedScore * platform.weight;
    
    return Math.min(weightedScore, 1.0);
  }

  private calculateRecencyScore(publishedAt: Date): number {
    const hoursSince = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    const decayFactor = hoursSince / this.config.quality.recencyDecayHours;
    
    return Math.max(0, 1 - decayFactor);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private async logLearning(
    eventType: string,
    discoveryId: string,
    tokensConsumed?: number
  ): Promise<void> {
    // TODO: Implémenter le log dans learning_log table
    console.log(`[Khabir] Learning logged: ${eventType} - ${discoveryId}`);
  }
}

// Singleton export
export const abdulKhabir = new AbdulKhabir();
