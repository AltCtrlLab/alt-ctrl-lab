/**
 * Extrait et parse le JSON d'une réponse de LLM (Kimi/Claude/etc)
 * Gère les réponses bavardes avec texte avant/après
 */

export class JSONExtractionError extends Error {
  constructor(message: string, public rawResponse: string) {
    super(message);
    this.name = 'JSONExtractionError';
  }
}

/**
 * Extrait le premier bloc JSON valide d'une chaîne
 * Supporte : {objet}, [tableau], et JSON multilignes
 */
export function extractJSON(text: string): unknown {
  if (!text || typeof text !== 'string') {
    throw new JSONExtractionError('Input is empty or not a string', String(text));
  }

  // 1. Try parsing directly first (clean response)
  try {
    return JSON.parse(text.trim());
  } catch {
    // Continue to extraction
  }

  // 2. Extract JSON block with regex
  // Match: { ... } or [ ... ] (greedy but stops at first valid parse)
  const patterns = [
    // Code block: ```json { ... } ```
    /```(?:json)?\s*([\s\S]*?)```/,
    // Curly braces object
    /(\{[\s\S]*\})/,
    // Square brackets array
    /(\[[\s\S]*\])/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1] || match[0];
      try {
        return JSON.parse(candidate.trim());
      } catch {
        continue;
      }
    }
  }

  // 3. Brute force: find first { or [ and try parsing from there
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  
  const startIndex = firstBrace === -1 ? firstBracket : 
                     firstBracket === -1 ? firstBrace : 
                     Math.min(firstBrace, firstBracket);

  if (startIndex === -1) {
    throw new JSONExtractionError('No JSON structure found in response', text);
  }

  // Try parsing from each possible end position
  for (let i = text.length; i > startIndex; i--) {
    const candidate = text.slice(startIndex, i);
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  throw new JSONExtractionError('Could not extract valid JSON from response', text);
}

/**
 * Type-guarded extraction pour le Superviseur (Nouveau Format Top 1%)
 */
export interface SupervisorPlan {
  diagnostic_implacable: string;
  vision_long_terme_roi: string;
  actions: Array<{
    agent_id: 'musawwir' | 'matin' | 'fatah' | 'hasib';
    directive_top_1_percent: string;
    angle_psychologique_ou_technique: string;
    livrable_attendu: string;
    priority: string;
  }>;
}

export function extractSupervisorPlan(text: string): SupervisorPlan {
  const parsed = extractJSON(text);
  
  if (!parsed || typeof parsed !== 'object') {
    throw new JSONExtractionError('Parsed JSON is not an object', text);
  }

  const plan = parsed as Record<string, unknown>;

  // Validate new structure
  if (typeof plan.diagnostic_implacable !== 'string') {
    throw new JSONExtractionError('Missing or invalid "diagnostic_implacable"', text);
  }

  if (typeof plan.vision_long_terme_roi !== 'string') {
    throw new JSONExtractionError('Missing or invalid "vision_long_terme_roi"', text);
  }

  if (!Array.isArray(plan.actions)) {
    throw new JSONExtractionError('Missing or invalid "actions" array', text);
  }

  // Validate each action
  const validAgents = ['musawwir', 'matin', 'fatah', 'hasib'];
  
  for (const action of plan.actions) {
    if (!action || typeof action !== 'object') {
      throw new JSONExtractionError('Invalid action item', text);
    }
    
    if (!validAgents.includes(action.agent_id)) {
      throw new JSONExtractionError(`Invalid agent_id: ${action.agent_id}`, text);
    }
    
    if (!action.directive_top_1_percent || typeof action.directive_top_1_percent !== 'string') {
      throw new JSONExtractionError('Missing or invalid directive_top_1_percent', text);
    }

    if (!action.livrable_attendu || typeof action.livrable_attendu !== 'string') {
      throw new JSONExtractionError('Missing or invalid livrable_attendu', text);
    }
  }

  return plan as unknown as SupervisorPlan;
}

/**
 * Nettoie et sanitize une réponse Kimi pour debug
 */
export function debugResponse(text: string): { 
  original: string; 
  extracted: unknown;
  success: boolean;
  error?: string 
} {
  try {
    const extracted = extractJSON(text);
    return { original: text, extracted, success: true };
  } catch (e) {
    return { 
      original: text, 
      extracted: null, 
      success: false, 
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}
