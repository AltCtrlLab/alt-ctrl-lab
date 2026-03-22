/**
 * Token Bucket Rate Limiter — en mémoire, pas de dépendance externe
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitConfig {
  maxTokens: number; // capacité max du bucket
  refillRate: number; // tokens ajoutés par seconde
}

const CONFIGS: Record<string, RateLimitConfig> = {
  'mission': { maxTokens: 10, refillRate: 10 / 60 },         // 10/min
  'war-room': { maxTokens: 2, refillRate: 2 / 60 },          // 2/min
  'vault-search': { maxTokens: 30, refillRate: 30 / 60 },    // 30/min
  'login': { maxTokens: 5, refillRate: 5 / (15 * 60) },      // 5/15min — brute-force protection
  'stripe-webhook': { maxTokens: 120, refillRate: 2 },         // 120/min
  'portal': { maxTokens: 30, refillRate: 30 / 60 },             // 30/min
  'default': { maxTokens: 60, refillRate: 1 },                  // 60/min
};

export function checkRateLimit(key: string, type: string = 'default'): { allowed: boolean; retryAfter?: number } {
  const config = CONFIGS[type] || CONFIGS.default;
  const now = Date.now() / 1000;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Remplir le bucket
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  // Temps d'attente avant le prochain token
  const retryAfter = Math.ceil((1 - bucket.tokens) / config.refillRate);
  return { allowed: false, retryAfter };
}

// Nettoyage périodique des vieux buckets (toutes les 5 min)
setInterval(() => {
  const now = Date.now() / 1000;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 600) buckets.delete(key);
  }
}, 300_000);
