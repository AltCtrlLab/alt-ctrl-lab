import { spawn, execSync } from 'child_process';
import { updateTaskStatus, logAgentActivity } from '../db';
import { extractJSON } from '../utils/json';
import { captureComponent, captureComponentResponsive } from './vision';
import { saveToVault, searchVault, VaultedComponent } from './memory';
import { executeOpenClawAgent, WORKSPACE_DIR } from './exec-agent';
import { pushEventToHistory } from '../warroom-state';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PROJECTS_DIR = path.join(os.homedir(), '.openclaw/projects');

// Titres métier par agent — remplace les prompts génériques "Directeur Technique Senior"
const AGENT_TITLES: Record<string, { director: string; executor: string }> = {
  musawwir: { director: 'Directeur Artistique Senior (Branding & Identité Visuelle)', executor: 'Directeur Artistique' },
  raqim:    { director: 'Exécutant Créatif Senior (UI/UX & Motion)', executor: 'Exécutant Créatif' },
  matin:    { director: 'Lead Developer & Directeur Technique', executor: 'Lead Developer' },
  banna:    { director: 'Développeur Full-Stack Senior', executor: 'Développeur Full-Stack' },
  fatah:    { director: 'Chief Growth Officer (CGO)', executor: 'Directeur Marketing' },
  khatib:   { director: 'Copywriter & Content Strategist Senior', executor: 'Copywriter' },
  hasib:    { director: 'Directeur Data & Architecte Automation', executor: 'Directeur Data' },
  sani:     { director: 'Ingénieur Automation & Intégrations Senior', executor: 'Ingénieur Automation' },
};

function getAgentTitle(agentId: string, role: 'director' | 'executor' = 'director'): string {
  return AGENT_TITLES[agentId]?.[role] ?? `Agent ${agentId}`;
}

// SSE Clients registry
const sseClients = new Map<string, (data: string) => void>();

export function registerSSEClient(clientId: string, send: (data: string) => void) {
  sseClients.set(clientId, send);
}

export function unregisterSSEClient(clientId: string) {
  sseClients.delete(clientId);
}

export function broadcastTaskUpdate(task: {
  id: string;
  status: string;
  result?: string | null;
  error?: string | null;
  iteration?: number;
  stage?: string;
  currentSubtask?: number;
  totalSubtasks?: number;
  swarmWorkers?: number;
  agentName?: string;
  data?: Record<string, unknown>;
}) {
  // P1-5: Stocker dans l'historique pour hydratation
  pushEventToHistory({
    id: task.id,
    status: task.status,
    stage: task.stage,
    agentName: (task as Record<string, unknown>).agentName as string | undefined,
    data: task.data,
    timestamp: Date.now(),
  });

  const message = `data: ${JSON.stringify({ type: 'task_update', task })}

`;
  sseClients.forEach((send, clientId) => {
    try {
      send(message);
    } catch (e) {
      sseClients.delete(clientId);
    }
  });
}

/**
 * 🔧 PILIER 3 : DÉTERMINISME & TOOL CALLING
 * Validation mécanique du code avant QA sémantique (Pre-QA Gate)
 */

/**
 * 🔒 CAGE DE COMPILATION : Valide la syntaxe du code
 * Utilise TypeScript compiler ou JSON.parse pour validation mécanique
 */
async function validateSyntax(codeString: string, isJson: boolean = false): Promise<{ valid: boolean; error?: string }> {
  try {
    if (isJson) {
      // Validation JSON stricte
      JSON.parse(codeString);
      return { valid: true };
    } else {
      // Validation TypeScript/JavaScript via tsc en mémoire
      // On écrit temporairement le code et on vérifie la syntaxe
      const tempFile = `/tmp/validate_${Date.now()}.ts`;
      fs.writeFileSync(tempFile, codeString, 'utf-8');
      
      try {
        // Vérification syntaxique uniquement (noEmit)
        execSync(`npx tsc --noEmit --skipLibCheck --target ES2020 --module ESNext --moduleResolution node ${tempFile} 2>&1`, {
          timeout: 10000,
          encoding: 'utf-8'
        });
        
        // Nettoyage
        fs.unlinkSync(tempFile);
        return { valid: true };
      } catch (compileError: any) {
        // Nettoyage en cas d'erreur
        try { fs.unlinkSync(tempFile); } catch (e) {}
        
        // Extraction de l'erreur de compilation
        const errorOutput = compileError.stdout || compileError.stderr || compileError.message || '';
        const firstError = errorOutput.split('\n').find((line: string) => line.includes('error TS')) || 'Syntax Error';
        
        return { valid: false, error: firstError };
      }
    }
  } catch (error: any) {
    return { valid: false, error: error.message || 'Validation failed' };
  }
}

/**
 * 🔒 BOUCLE D'AUTO-FIX : Validation + Retry automatique
 * Garantit que le code compile avant envoi au Directeur
 */
async function validateWithAutoFix(
  taskId: string,
  executorId: string,
  codeString: string,
  isJson: boolean,
  brief: string,
  subTask: string,
  qaHistory: Array<{ iteration: number; draft: string; feedback: string }>,
  maxAttempts: number = 3
): Promise<{ success: boolean; validatedCode: string; errors: string[] }> {
  const errors: string[] = [];
  let currentCode = codeString;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[DeterminismGate] Task ${taskId}: Validation attempt ${attempt}/${maxAttempts}`);
    
    const validation = await validateSyntax(currentCode, isJson);
    
    if (validation.valid) {
      console.log(`[DeterminismGate] Task ${taskId}: ✅ Syntax validation passed`);
      return { success: true, validatedCode: currentCode, errors };
    }
    
    // Échec de validation - on tente l'auto-fix
    console.warn(`[DeterminismGate] Task ${taskId}: ❌ Syntax error - ${validation.error}`);
    errors.push(`Attempt ${attempt}: ${validation.error}`);
    
    if (attempt >= maxAttempts) {
      break; // Max attempts atteint
    }
    
    // Préparer le prompt d'auto-fix
    const historyText = qaHistory.length > 0 
      ? qaHistory.map(h => `Tentative ${h.iteration}: ${h.feedback}`).join('\n')
      : '';
    
    const autoFixPrompt = `TEST DÉTERMINISTE ÉCHOUÉ. Ton code ne compile pas.

ERREUR EXACTE DU COMPILATEUR:
${validation.error}

${historyText ? `HISTORIQUE DES CORRECTIONS:\n${historyText}\n` : ''}

CODE À CORRIGER:
${currentCode}

INSTRUCTIONS:
- Corrige l'erreur de syntaxe identifiée ci-dessus
- Ne change PAS la logique métier
- Ne réponds qu'avec le code corrigé, aucun blabla
- Assure-toi que le code est strictement valide TypeScript

CODE CORRIGÉ:`;

    console.log(`[DeterminismGate] Task ${taskId}: Sending auto-fix request to ${executorId}`);
    
    const fixResult = await executeOpenClawAgent(executorId, autoFixPrompt, 60000);
    
    if (fixResult.success) {
      currentCode = fixResult.stdout.trim();
      
      // Stocker dans l'historique pour contexte futur
      qaHistory.push({
        iteration: attempt,
        draft: currentCode,
        feedback: `Auto-fix pour: ${validation.error}`
      });
    } else {
      errors.push(`Auto-fix attempt ${attempt} failed: ${fixResult.stderr}`);
    }
  }
  
  return { success: false, validatedCode: currentCode, errors };
}

/**
 * ⭐ PROTOCOLE D'ESSAIMAGE CONTRÔLÉ (Controlled Swarm Protocol)
 * 
 * L'Exécutant peut choisir de déléguer à jusqu'à 5 micro-workers en parallèle
 */
interface SwarmIntent {
  intent: 'SWARM' | 'DIRECT';
  workers?: Array<{
    id: string;
    micro_task: string;
  }>;
}

/**
 * Exécute un essaim de micro-workers en parallèle, puis SYNTHÉTISE les résultats
 */
async function executeSwarm(
  taskId: string,
  executorId: string,
  brief: string,
  subTask: string,
  accumulatedContext: string,
  workers: Array<{ id: string; micro_task: string }>,
  timeoutMs: number = 60000
): Promise<{ success: boolean; finalResult: string; errors: string[] }> {
  console.log(`[SwarmProtocol] Task ${taskId}: Launching ${workers.length} micro-workers`);
  
  broadcastTaskUpdate({
    id: taskId,
    status: 'EXECUTOR_SWARMING',
    stage: 'EXECUTOR_SWARMING',
    swarmWorkers: workers.length
  });

  const microWorkerPromises = workers.map(async (worker) => {
    const microPrompt = `Tu es un Micro-Worker (Agent ${executorId}) exécutant une micro-tâche spécifique.

CONTEXTE GLOBAL DU PROJET:
${brief}

CONTEXTE ACCUMULÉ:
${accumulatedContext}

TA MICRO-TÂCHE STRICTE (${worker.id}):
${worker.micro_task}

RÈGLES ABSOLUES:
- Génère UNIQUEMENT le résultat demandé
- Pas d'explications, pas de contexte, juste le livrable
- TypeScript strict, production-ready
- Réponds directement avec le code/texte

OUTPUT:`;

    console.log(`[SwarmProtocol] Task ${taskId}: Launching ${worker.id}`);
    
    const result = await executeOpenClawAgent(executorId, microPrompt, timeoutMs);
    
    console.log(`[SwarmProtocol] Task ${taskId}: ${worker.id} completed (${result.stdout.length} chars)`);
    
    return {
      id: worker.id,
      microTask: worker.micro_task,
      result: result.success ? result.stdout : `[ERROR: ${result.stderr}]`,
      success: result.success
    };
  });

  // Étape 1: Exécution parallèle de tous les micro-workers
  const swarmResults = await Promise.all(microWorkerPromises);
  
  const errors = swarmResults.filter(r => !r.success).map(r => `${r.id}: ${r.result}`);
  
  console.log(`[SwarmProtocol] Task ${taskId}: Swarm phase 1 completed. ${errors.length} errors.`);
  
  // Étape 2: SYNTHÈSE (The Reducer) - L'Exécutant fusionne les résultats
  console.log(`[SwarmProtocol] Task ${taskId}: Entering SYNTHESIS phase`);
  
  broadcastTaskUpdate({
    id: taskId,
    status: 'EXECUTOR_SYNTHESIZING',
    stage: 'EXECUTOR_SYNTHESIZING',
    swarmWorkers: workers.length
  });

  const rawResultsFormatted = swarmResults.map(r => `
=== ${r.id} | ${r.microTask} ===
${r.result}
`).join('\n---\n');

  const synthesisPrompt = `Tu es l'Exécutant Squad Leader (Agent ${executorId}) en mode SYNTHÈSE.

MISSION ORIGINELLE:
${subTask}

CONTEXTE GLOBAL:
${brief}

RÉSULTATS BRUTS DE TON ESSAIM (${workers.length} workers):
${rawResultsFormatted}

⭐ TA MISSION DE SYNTHÈSE:
Fusionne ces composants isolés pour générer UN SEUL livrable final, fonctionnel et propre.

TÂCHES DE FUSION:
1. Gère les imports (regroupe-les en haut du fichier)
2. Unifie les variables et types (élimine les doublons)
3. Résous les conflits de noms
4. Organise le code logiquement
5. Élimine les redondances
6. Assure la cohérence du style

FORMAT DE SORTIE:
Un seul fichier/code cohérent, prêt pour la production. N'explique pas ce que tu fais, livre directement le résultat fusionné.

OUTPUT FINAL:`;

  const synthesisResult = await executeOpenClawAgent(executorId, synthesisPrompt, 180000);
  
  if (!synthesisResult.success) {
    console.error(`[SwarmProtocol] Task ${taskId}: Synthesis failed - ${synthesisResult.stderr}`);
    // Fallback: retourner les résultats bruts concaténés
    return {
      success: false,
      finalResult: `--- SYNTHESIS FAILED ---\n${rawResultsFormatted}`,
      errors: [...errors, `Synthesis: ${synthesisResult.stderr}`]
    };
  }

  console.log(`[SwarmProtocol] Task ${taskId}: Synthesis completed (${synthesisResult.stdout.length} chars)`);
  
  return {
    success: errors.length === 0,
    finalResult: synthesisResult.stdout,
    errors
  };
}

/**
 * Détecte si l'exécutant a choisi l'Option B (Swarm) ou Option A (Direct)
 */
function detectSwarmIntent(executorOutput: string): SwarmIntent {
  try {
    // Essayer d'extraire un JSON avec intent: SWARM
    const jsonMatch = executorOutput.match(/\{[\s\S]*"intent"\s*:\s*"SWARM"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.intent === 'SWARM' && Array.isArray(parsed.workers) && parsed.workers.length > 0) {
        // Limiter à 5 workers max
        return {
          intent: 'SWARM',
          workers: parsed.workers.slice(0, 5)
        };
      }
    }
  } catch (e) {
    // Pas un JSON valide, considérer comme exécution directe
  }
  
  return { intent: 'DIRECT' };
}

/**
 * ⭐ MOTEUR D'EXÉCUTION PHYSIQUE (Infrastructure-as-Code)
 * VERSION SÉCURISÉE - Phase 1 : Bouclier Système
 * Protection contre: Path Traversal (Faille 10) + Command Injection (Faille 9)
 */
interface ProjectManifest {
  project_name: string;
  setup_commands: string[];
  files: {
    path: string;
    content: string;
  }[];
}

async function buildPhysicalProject(
  taskId: string,
  manifest: ProjectManifest
): Promise<{ success: boolean; projectPath: string; error?: string }> {
  // 🔒 SÉCURITÉ: Définir le répertoire de base de manière stricte et absolue
  const BASE_PROJECT_DIR = path.resolve(process.cwd(), './projects');
  const projectPath = path.join(BASE_PROJECT_DIR, manifest.project_name);
  
  console.log(`[BuildEngine] Starting SECURE physical build for ${manifest.project_name}`);
  console.log(`[BuildEngine] Base directory: ${BASE_PROJECT_DIR}`);
  broadcastTaskUpdate({
    id: taskId,
    status: 'BUILDING',
    stage: 'PHYSICAL_BUILD',
    result: `Building project: ${manifest.project_name}`
  });

  try {
    // 🔒 SÉCURITÉ: Créer le dossier projects s'il n'existe pas
    if (!fs.existsSync(BASE_PROJECT_DIR)) {
      fs.mkdirSync(BASE_PROJECT_DIR, { recursive: true });
    }

    // 🔒 SÉCURITÉ: Whitelist stricte des commandes autorisées
    const allowedCommands = /^(npm (install|init|run|build)|npx (create-|tailwindcss|tsc|eslint)|mkdir|cd|touch|cp|mv|rm|git (clone|init|add|commit|push|pull)|pnpm|yarn)\b/;
    const forbiddenChars = /[;|&><`$(){}[\]"'\n\r]/;

    // Étape 1: Exécuter les commandes de setup avec validation paranoïaque
    console.log(`[BuildEngine] Executing ${manifest.setup_commands.length} setup commands (SECURE MODE)`);
    
    for (const cmd of manifest.setup_commands) {
      // 🔒 GARDE-FOU 1: Vérifier que la commande est dans la whitelist
      if (!allowedCommands.test(cmd)) {
        const errorMsg = `Commande non autorisée détectée: ${cmd}. Seules les commandes npm/npx/mkdir/cd/git sont permises.`;
        console.error(`[BuildEngine] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // 🔒 GARDE-FOU 2: Vérifier l'absence de caractères dangereux
      if (forbiddenChars.test(cmd)) {
        const errorMsg = `Caractères dangereux détectés dans la commande: ${cmd}. Chaînage interdit.`;
        console.error(`[BuildEngine] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log(`[BuildEngine] $ ${cmd}`);
      broadcastTaskUpdate({
        id: taskId,
        status: 'BUILDING',
        stage: 'SETUP_COMMANDS',
        result: `Executing (validated): ${cmd}`
      });

      try {
        // 🔒 SÉCURITÉ: Exécution avec timeout et environnement contrôlé
        execSync(cmd, {
          cwd: BASE_PROJECT_DIR,
          stdio: 'pipe', // Changé de 'inherit' à 'pipe' pour éviter l'affichage direct
          timeout: 120000, // 2 min max par commande
          env: { 
            ...process.env, 
            CI: 'true',
            PATH: process.env.PATH // Limiter le PATH si possible
          },
          shell: '/bin/bash' // Shell explicite et contrôlé
        });
      } catch (cmdError) {
        const errorMsg = cmdError instanceof Error ? cmdError.message : 'Command failed';
        console.error(`[BuildEngine] Command failed: ${cmd}`, errorMsg);
        throw new Error(`Setup command failed: ${cmd} - ${errorMsg}`);
      }
    }

    // Étape 2: Créer les fichiers avec protection Path Traversal
    console.log(`[BuildEngine] Creating ${manifest.files.length} files (PATH VALIDATED)`);
    
    for (const file of manifest.files) {
      // 🔒 GARDE-FOU ABSOLU: Calculer le chemin absolu et vérifier qu'il reste dans BASE_PROJECT_DIR
      const targetPath = path.resolve(BASE_PROJECT_DIR, file.path);
      
      // Normaliser les chemins pour la comparaison (enlever les symlinks, etc.)
      const realBasePath = fs.realpathSync(BASE_PROJECT_DIR);
      const realTargetPath = targetPath; // On vérifie avant création donc realpath n'existe pas encore
      
      // Vérification stricte: le chemin cible doit commencer par le répertoire de base
      if (!realTargetPath.startsWith(realBasePath)) {
        const errorMsg = `🚨 PATH TRAVERSAL DÉTECTÉ 🚨
Tentative d'écriture hors du répertoire autorisé:
- Chemin demandé: ${file.path}
- Chemin résolu: ${realTargetPath}
- Base autorisée: ${realBasePath}
Exécution annulée pour sécurité.`;
        console.error(`[BuildEngine] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // 🔒 Vérification supplémentaire: pas de .. qui sort du répertoire
      const relativePath = path.relative(realBasePath, realTargetPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        const errorMsg = `Path Traversal détecté via relative path: ${file.path}`;
        console.error(`[BuildEngine] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const fileDir = path.dirname(targetPath);
      
      console.log(`[BuildEngine] Writing (validated): ${targetPath}`);
      
      // Créer les dossiers manquants (sécurisé car targetPath est déjà validé)
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      // 🔒 Écrire le fichier avec encodage strict
      fs.writeFileSync(targetPath, file.content, { encoding: 'utf-8', flag: 'w' });
      
      // 🔒 Vérification post-écriture: confirmer que le fichier existe et est lisible
      if (!fs.existsSync(targetPath)) {
        throw new Error(`Échec de la création du fichier: ${targetPath}`);
      }
    }

    console.log(`[BuildEngine] ✅ Build successful (SECURE): ${projectPath}`);
    
    broadcastTaskUpdate({
      id: taskId,
      status: 'BUILD_SUCCESS',
      stage: 'PHYSICAL_BUILD_COMPLETE',
      result: `Project built securely at: ${projectPath}`
    });

    return { success: true, projectPath };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Build failed';
    console.error(`[BuildEngine] ❌ Build failed (SECURE MODE):`, errorMsg);
    
    broadcastTaskUpdate({
      id: taskId,
      status: 'FAILED_EXECUTION',
      stage: 'PHYSICAL_BUILD_FAILED',
      error: errorMsg
    });

    return { success: false, projectPath, error: errorMsg };
  }
}

/**
 * 🔒 PHASE 3 : Ingénierie du Contexte
 * Compression intelligente pour éviter la fuite de tokens (Faille 4)
 */
function compressContext(text: string, maxLength: number = 15000): string {
  if (text.length <= maxLength) return text;
  
  // Garder le début (brief global) et la fin (dernier livrable)
  const headLength = Math.floor(maxLength * 0.3); // 30% du début
  const tailLength = Math.floor(maxLength * 0.7); // 70% de la fin
  
  const head = text.substring(0, headLength);
  const tail = text.substring(text.length - tailLength);
  
  return `${head}

/* ... [CONTEXTE COMPRESSÉ - ${text.length - maxLength} CARACTÈRES OMISES] ... */

${tail}`;
}

/**
 * 🔒 PHASE 3 : Extraction stricte du Director Takeover
 * Évite les hallucinations markdown (Faille 7)
 */
function extractDirectorTakeover(stdout: string): string {
  // Regex stricte : [FORCED_VALIDATION] suivi de code markdown optionnel
  const codeMatch = stdout.match(/\[FORCED_VALIDATION\][\s\S]*?(?:```[a-z]*\n?)?([\s\S]*?)(?:```)?$/i);
  
  if (!codeMatch) {
    throw new Error('Director Takeover: Format invalide - balise [FORCED_VALIDATION] ou code manquant');
  }
  
  const extracted = codeMatch[1].trim();
  
  // Vérification taille minimale
  if (extracted.length < 50) {
    throw new Error(`Director Takeover: Livrable trop court (${extracted.length} chars). Minimum: 50.`);
  }
  
  return extracted;
}

/**
 * ⭐ MICRO-DÉLÉGATION + PROTOCOLE D'ESSAIMAGE CONTRÔLÉ
 * 
 * Étape 1: Directeur découpe en sous-tâches JSON
 * Étape 2: Pour chaque sous-tâche:
 *    - L'Exécutant choisit OPTION A (Direct) ou OPTION B (Swarm)
 *    - Si Swarm: Promise.all de max 5 micro-workers
 *    - QA par le Directeur
 * Étape 3: Concaténation des résultats validés
 */
export async function executeHierarchicalTask(
  taskId: string,
  director_id: string,
  executor_id: string,
  brief: string,
  serviceId?: string,
  timeoutMs: number = 900000
): Promise<void> {
  
  console.log(`[MicroDelegation] Starting task ${taskId}: ${director_id} → ${executor_id} | Service: ${serviceId || 'generic'}`);

  const isWebDev = serviceId === 'web_dev' || brief.toLowerCase().includes('bootstrap') || brief.toLowerCase().includes('npm init');
  
  if (isWebDev) {
    console.log(`[MicroDelegation] Task ${taskId}: PHYSICAL BUILD MODE enabled`);
  }

  // 🧠 PILIER 2 : RAG - Réminiscence avant génération
  let vaultMatches: VaultedComponent[] = [];
  let ragPrompt = '';
  
  try {
    const vaultSearch = await searchVault(brief, 0.85, 2);
    if (vaultSearch.success && vaultSearch.matches && vaultSearch.matches.length > 0) {
      vaultMatches = vaultSearch.matches;
      console.log(`[MemoryVault] Task ${taskId}: Found ${vaultMatches.length} similar components in vault`);
      
      // Construire le prompt RAG
      const topMatch = vaultMatches[0];
      ragPrompt = `
[SYSTÈME - MÉMOIRE AGENCE] Tu as déjà résolu un problème similaire dans le passé. 
Voici le composant Top 1% que nous avons validé (similarité: ${((vaultSearch.matches[0] as any).similarity || 0.9).toFixed(2)}):

\`\`\`tsx
${topMatch.codeContent.substring(0, 3000)}
\`\`\`

Ne pars pas de zéro. Utilise cette architecture comme base et adapte-la uniquement aux nouvelles contraintes de ce brief.
`;
      
      broadcastTaskUpdate({
        id: taskId,
        status: 'RAG_MEMORY_HIT',
        stage: 'SEMANTIC_CACHE_HIT',
        result: `Found similar component: ${topMatch.id}`
      });
    }
  } catch (ragError) {
    console.warn(`[MemoryVault] Task ${taskId}: RAG search failed (non-blocking)`, ragError);
  }

  try {
    // ============================================================================
    // ÉTAPE 1: PLANNING DU DIRECTEUR
    // ============================================================================
    
    await updateTaskStatus(taskId, 'DIRECTOR_PLANNING', undefined, undefined, undefined, 'DIRECTOR_PLANNING');
    broadcastTaskUpdate({ 
      id: taskId, 
      status: 'DIRECTOR_PLANNING', 
      stage: 'DIRECTOR_PLANNING' 
    });

    let planningPrompt: string;
    
    if (isWebDev) {
      planningPrompt = `Tu es le ${getAgentTitle(director_id)} (Agent ${director_id}) en mode BOOTSTRAP PROJET.

BRIEF UTILISATEUR:
${brief}

TA MISSION:
Génère un MANIFESTE JSON strict qui décrit comment bootstrapper ce projet web.

RÈGLES ABSOLUES:
1. Le JSON doit être VALIDE et STRICT
2. Les commandes npm/yarn DOIVENT utiliser les flags non-interactifs (-y, --yes)

TU DOIS RÉPONDRE UNIQUEMENT PAR UN JSON VALIDE:
{
  "sub_tasks": ["Générer le manifeste de projet JSON"],
  "project_manifest": {
    "project_name": "nom-du-projet-kebab-case",
    "setup_commands": ["mkdir -p nom-du-projet", "cd nom-du-projet && npm init -y"],
    "files": [{"path": "nom-du-projet/app/page.tsx", "content": "..."}]
  }
}

Pas de texte avant ou après le JSON.`;
    } else {
      planningPrompt = `Tu es le ${getAgentTitle(director_id)} (Agent ${director_id}).

BRIEF UTILISATEUR:
${brief}

TA MISSION:
Découpe ce brief en un plan d'exécution atomique pour ton exécutant.

RÈGLES ABSOLUES:
- Chaque sous-tâche doit être courte (30-60 secondes de génération)
- Maximum 5-7 sous-tâches
- Ordre séquentiel logique

TU DOIS RÉPONDRE UNIQUEMENT PAR UN JSON VALIDE:
{
  "sub_tasks": [
    "Description courte de la sous-tâche 1",
    "Description courte de la sous-tâche 2"
  ]
}

Pas de texte avant ou après le JSON.`;
    }

    const planningResult = await executeOpenClawAgent(director_id, planningPrompt, 300000);
    
    if (!planningResult.success) {
      throw new Error(`Director planning failed: ${planningResult.stderr}`);
    }

    let plan: { sub_tasks: string[]; project_manifest?: ProjectManifest };
    let manifest: ProjectManifest | null = null;
    
    try {
      plan = extractJSON(planningResult.stdout) as { sub_tasks: string[]; project_manifest?: ProjectManifest };
      if (!Array.isArray(plan.sub_tasks)) {
        throw new Error('Invalid plan format: sub_tasks must be array');
      }
      
      if (isWebDev && plan.project_manifest) {
        manifest = plan.project_manifest;
        console.log(`[MicroDelegation] Task ${taskId}: Manifest extracted for ${manifest.project_name}`);
      }
    } catch (parseError) {
      console.error('[MicroDelegation] Failed to parse director plan:', planningResult.stdout);
      throw new Error(`Failed to parse director plan: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
    }

    console.log(`[MicroDelegation] Task ${taskId}: ${plan.sub_tasks.length} sub-tasks planned`);

    // Mode web_dev
    if (isWebDev && manifest) {
      await updateTaskStatus(taskId, 'DIRECTOR_QA', undefined, undefined, 1, 'DIRECTOR_QA');
      broadcastTaskUpdate({ id: taskId, status: 'DIRECTOR_QA', stage: 'VALIDATING_MANIFEST' });

      const validationPrompt = `Tu es le ${getAgentTitle(director_id)} (Agent ${director_id}) en mode AUDIT MANIFEST.

MANIFESTE PROPOSÉ:
${JSON.stringify(manifest, null, 2)}

RÈGLES DE VALIDATION:
1. Le project_name doit être en kebab-case
2. Les commandes npm doivent TOUJOURS avoir --yes ou -y
3. Les chemins de fichiers doivent être cohérents avec project_name
4. Le code dans les fichiers doit être TypeScript valide

FORMAT DE RÉPONSE:
[VALIDATED]
OU
[REJECTED]
1. Problème détecté...
2. Correction demandée...`;

      const validationResult = await executeOpenClawAgent(director_id, validationPrompt, 60000);
      
      if (!validationResult.success || validationResult.stdout.includes('[REJECTED]')) {
        const feedback = validationResult.stdout.includes('[REJECTED]') 
          ? validationResult.stdout.replace('[REJECTED]', '').trim()
          : 'Validation failed';
        throw new Error(`Manifest validation failed: ${feedback}`);
      }

      console.log(`[MicroDelegation] Task ${taskId}: Manifest VALIDATED`);

      const buildResult = await buildPhysicalProject(taskId, manifest);
      
      if (!buildResult.success) {
        await updateTaskStatus(taskId, 'FAILED_EXECUTION', undefined, buildResult.error, undefined, 'FAILED_EXECUTION');
        broadcastTaskUpdate({ id: taskId, status: 'FAILED_EXECUTION', error: buildResult.error, stage: 'PHYSICAL_BUILD_FAILED' });
        return;
      }

      const successResult = `
# Projet Bootstrapé avec Succès

**Projet:** ${manifest.project_name}
**Chemin:** ${buildResult.projectPath}

## Commandes exécutées
${manifest.setup_commands.map(cmd => `- \`${cmd}\``).join('\n')}

## Fichiers créés
${manifest.files.map(f => `- \`${f.path}\``).join('\n')}
`;

      await updateTaskStatus(taskId, 'COMPLETED', successResult, undefined, 1, 'COMPLETED');
      broadcastTaskUpdate({ id: taskId, status: 'COMPLETED', result: successResult, stage: 'PHYSICAL_BUILD_COMPLETE' });
      console.log(`[MicroDelegation] Task ${taskId}: PHYSICAL BUILD COMPLETED at ${buildResult.projectPath}`);
      return;
    }

    // ============================================================================
    // ÉTAPE 2: EXÉCUTION AVEC PROTOCOLE D'ESSAIMAGE
    // ============================================================================
    
    let finalDeliverable = "";
    const totalSubtasks = plan.sub_tasks.length;

    for (let i = 0; i < totalSubtasks; i++) {
      const subTask = plan.sub_tasks[i];
      
      await updateTaskStatus(taskId, 'EXECUTING_SUBTASK', undefined, undefined, i + 1, 'EXECUTING_SUBTASK');
      broadcastTaskUpdate({ 
        id: taskId, 
        status: 'EXECUTING_SUBTASK', 
        stage: 'EXECUTING_SUBTASK',
        currentSubtask: i + 1,
        totalSubtasks: totalSubtasks
      });

      console.log(`[MicroDelegation] Task ${taskId}: Executing sub-task ${i + 1}/${totalSubtasks}: ${subTask.substring(0, 50)}...`);

      // ⭐ NOUVEAU: Prompt avec Option Tactique (Direct vs Swarm) + Garde-fou + RAG
      const executorPrompt = `${ragPrompt ? ragPrompt + '\n\n' : ''}Tu es le ${getAgentTitle(executor_id, 'executor')} (Agent ${executor_id}) en mode SQUAD LEADER.

CONTEXTE GLOBAL DU PROJET:
${brief}

SOUS-TÂCHE À ACCOMPLIR (${i + 1}/${totalSubtasks}):
${subTask}

⭐ CHOIX TACTIQUE - Tu as DEUX OPTIONS:

OPTION A (Exécution Directe):
Tu génères le code/texte directement. Réponds normalement avec le livrable.

OPTION B (Essaimage Contrôlé - Max 5 workers):
Si la tâche contient des éléments INDÉPENDANTS (ex: coder 4 composants distincts, rédiger 3 sections isolées), tu peux déléguer à un essaim.

🚨 GARDE-FOU ABSOLU (Swarm Threshold):
N'utilise l'OPTION B QUE SI:
- La tâche nécessite plus de 150 lignes de code estimées, OU
- La tâche contient au moins 3 sous-sections distinctes et indépendantes

Pour des tâches simples (< 150 lignes, < 3 sections), l'OPTION A est OBLIGATOIRE.

FORMAT OPTION B (uniquement si threshold atteint):
{
  "intent": "SWARM",
  "workers": [
    { "id": "worker_1", "micro_task": "Coder le composant Button" },
    { "id": "worker_2", "micro_task": "Coder le composant Input" },
    { "id": "worker_3", "micro_task": "Coder le composant Card" }
  ]
}

Contraintes:
- Max 5 workers
- Chaque micro_task doit être ATOMIQUE et INDÉPENDANTE
- Si tu choisis OPTION A, réponds directement avec le livrable (pas de JSON)

CHOIX ?`;

      let executorDraft = "";
      let isValidated = false;
      let qaAttempts = 0;
      const maxQaAttempts = 3;
      
      // 🔒 PHASE 3 : Historique QA pour éviter la perte d'état (Faille 6)
      const qaHistory: Array<{ iteration: number; draft: string; feedback: string }> = [];

      while (!isValidated && qaAttempts < maxQaAttempts) {
        qaAttempts++;
        
        // DIRECTOR TAKEOVER - Itération 3
        if (qaAttempts === 3) {
          console.log(`[MicroDelegation] Sub-task ${i + 1}: Director Takeover (3rd attempt)`);
          
          const takeoverPrompt = `Tu es le ${getAgentTitle(director_id)} (Agent ${director_id}) en mode TAKEOVER.

C'est la 3ème et dernière itération. Ton exécutant a échoué.

CONTEXTE GLOBAL:
${brief}

SOUS-TÂCHE À RÉÉCRIRE:
${subTask}

PRÉCÉDENT LIVRABLE (INADÉQUAT):
${executorDraft}

EN TANT QUE DIRECTEUR TOP 1%, TU DOIS RÉÉCRIRE LE LIVRABLE TOI-MÊME PARFAITEMENT.

RÈGLES:
- Génère le livrable final, parfait, prêt pour la production
- N'explique pas ce que tu fais, juste livre
- Commence ta réponse par le tag [FORCED_VALIDATION]

OUTPUT:`;

          const takeoverResult = await executeOpenClawAgent(director_id, takeoverPrompt, 180000);
          
          if (takeoverResult.success && takeoverResult.stdout.includes('[FORCED_VALIDATION]')) {
            try {
              // 🔒 PHASE 3 : Extraction stricte du Takeover (Faille 7)
              executorDraft = extractDirectorTakeover(takeoverResult.stdout);
              isValidated = true;
              console.log(`[MicroDelegation] Sub-task ${i + 1}: FORCED_VALIDATION by Director (${executorDraft.length} chars)`);
            } catch (extractionError) {
              const errorMsg = extractionError instanceof Error ? extractionError.message : 'Extraction failed';
              console.error(`[MicroDelegation] Sub-task ${i + 1}: Director Takeover extraction failed - ${errorMsg}`);
              throw new Error(`Director Takeover failed: ${errorMsg}`);
            }
            
            // LOG: Director Takeover
            await logAgentActivity({
              id: `act_${Date.now()}_${director_id}`,
              agentId: director_id,
              agentName: director_id,
              agentRole: 'director',
              taskId: taskId,
              activityType: 'DIRECTOR_TAKEOVER',
              prompt: `Takeover for: ${subTask.substring(0, 100)}...`,
              result: executorDraft,
              status: 'SUCCESS',
              startedAt: new Date(),
              completedAt: new Date(),
              qaResult: 'VALIDATED',
            });
            break;
          } else {
            executorDraft = takeoverResult.stdout || "[Directeur override failed]";
            isValidated = true;
            console.log(`[MicroDelegation] Sub-task ${i + 1}: Director override applied (with warnings)`);
            break;
          }
        }
        
        // Exécution par l'Exécutant (avec détection Swarm)
        if (qaAttempts === 1 || executorDraft === "") {
          // 🔒 PHASE 3 : Construire le prompt dynamique avec historique QA (Faille 6)
          let dynamicExecutorPrompt = executorPrompt;
          
          if (qaHistory.length > 0) {
            // Injecter l'historique des échecs précédents
            const historyText = qaHistory.map((h, idx) => `
=== ITÉRATION ${h.iteration} ===
TON CODE:
${h.draft.substring(0, 500)}...

CRITIQUE DU DIRECTEUR:
${h.feedback}
`).join('\n---\n');

            dynamicExecutorPrompt = `Tu es le ${getAgentTitle(executor_id, 'executor')} (Agent ${executor_id}) en mode CORRECTION.

${executorPrompt}

🚨 HISTORIQUE DES TENTATIVES PRÉCÉDENTES (À CORRIGER) :
${historyText}

INSTRUCTIONS DE CORRECTION :
- Analyse les critiques du Directeur ci-dessus
- Corrige TOUTES les failles mentionnées
- Ne réintroduis pas les erreurs déjà signalées
- Livre une version parfaite cette fois

OUTPUT CORRIGÉ :`;
          }
          
          const execResult = await executeOpenClawAgent(executor_id, dynamicExecutorPrompt, 180000);
          
          if (!execResult.success) {
            console.warn(`[MicroDelegation] Sub-task ${i + 1} execution failed (attempt ${qaAttempts}): ${execResult.stderr}`);
            continue;
          }
          
          // ⭐ NOUVEAU: Détection du choix tactique
          const swarmIntent = detectSwarmIntent(execResult.stdout);
          
          if (swarmIntent.intent === 'SWARM' && swarmIntent.workers && swarmIntent.workers.length > 0) {
            // OPTION B: Essaime détecté → Lancement parallèle des micro-workers + Synthèse
            console.log(`[SwarmProtocol] Task ${taskId}: SWARM DETECTED with ${swarmIntent.workers.length} workers`);
            
            const accumulatedContext = finalDeliverable; // Contexte accumulé des sous-tâches précédentes
            
            const swarmResult = await executeSwarm(
              taskId,
              executor_id,
              brief,
              subTask, // Passer la sous-tâche pour la phase de synthèse
              accumulatedContext,
              swarmIntent.workers,
              120000 // 2 min par micro-worker
            );
            
            if (swarmResult.success) {
              executorDraft = swarmResult.finalResult;
              console.log(`[SwarmProtocol] Task ${taskId}: Swarm synthesized (${executorDraft.length} chars)`);
            } else {
              console.warn(`[SwarmProtocol] Task ${taskId}: Swarm synthesis had errors`);
              executorDraft = swarmResult.finalResult;
            }
            
            // LOG: Swarm Leader activity
            await logAgentActivity({
              id: `act_${Date.now()}_${executor_id}`,
              agentId: executor_id,
              agentName: executor_id,
              agentRole: 'executor',
              taskId: taskId,
              activityType: 'SWARM_LEADER',
              prompt: subTask,
              result: executorDraft,
              status: swarmResult.success ? 'SUCCESS' : 'FAILED',
              startedAt: new Date(),
              completedAt: new Date(),
              isSwarm: true,
              swarmSize: swarmIntent.workers?.length,
            });
          } else {
            // OPTION A: Exécution directe
            console.log(`[MicroDelegation] Task ${taskId}: DIRECT execution detected`);
            
            // 🎯 PILIER 5 : AUTONOMOUS GROWTH LOOP (Marketing A/B Testing)
            if (serviceId === 'marketing') {
              console.log(`[GrowthLoop] Task ${taskId}: Generating 3 copy variants for A/B testing...`);
              broadcastTaskUpdate({
                id: taskId,
                status: 'GENERATING_VARIANTS',
                stage: 'MULTI_VARIANT_CREATION'
              });

              // Forcer Khatib à générer 3 variantes
              const variantsPrompt = `${dynamicExecutorPrompt}

🚨 INSTRUCTION SPÉCIALE - GÉNÈRE 3 VARIANTES:
Tu es un Copywriter Growth. Génère 3 variantes de copywriting pour cette même mission.

VARIANTE A: Approche Urgence (FOMO, deadline, peur de manquer)
VARIANTE B: Approche Autorité (Expertise, chiffres, crédibilité)
VARIANTE C: Approche Preuve Sociale (Témoignages, communauté, "comme 1000+ autres")

Réponds EXCLUSIVEMENT avec ce JSON:
{
  "variants": [
    "Texte de la variante A...",
    "Texte de la variante B...",
    "Texte de la variante C..."
  ]
}

Ne mets aucun autre texte que le JSON.`;

              const variantsResult = await executeOpenClawAgent(executor_id, variantsPrompt, 120000);
              
              if (variantsResult.success) {
                try {
                  const parsed = JSON.parse(variantsResult.stdout.match(/\{[\s\S]*\}/)?.[0] || '{}');
                  const variants = parsed.variants || [];
                  
                  if (variants.length === 3) {
                    console.log(`[GrowthLoop] Task ${taskId}: 3 variants generated, scoring with Hasib...`);
                    broadcastTaskUpdate({
                      id: taskId,
                      status: 'SIMULATING_AUDIENCE_TEST',
                      stage: 'CRO_DATA_SCORING'
                    });

                    // Hasib (Directeur Data) évalue les 3 variantes
                    const scoringPrompt = `[SYSTÈME - SIMULATION CRO] 
Tu es Hasib, Directeur Data. Tu simules un algorithme de conversion prédictive.

Voici 3 variantes de copywriting:

VARIANTE A:
${variants[0]}

VARIANTE B:
${variants[1]}

VARIANTE C:
${variants[2]}

Évalue chaque variante sur 3 critères (0-100):
1. Friction (100 = zéro friction, très fluide)
2. Désir (100 = désir intense irrésistible)
3. Clarté (100 = message cristallin, instantané)

Calcule un score global (moyenne des 3 critères).

Réponds EXCLUSIVEMENT avec ce format:
GAGNANTE: [A|B|C]
SCORE_A: [0-100]
SCORE_B: [0-100]
SCORE_C: [0-100]
JUSTIFICATION: [2 phrases max]`;

                    const scoringResult = await executeOpenClawAgent('hasib', scoringPrompt, 60000);
                    
                    if (scoringResult.success) {
                      // Extraire la variante gagnante
                      const winnerMatch = scoringResult.stdout.match(/GAGNANTE:\s*([ABC])/i);
                      const winner = winnerMatch ? winnerMatch[1] : 'A';
                      const winnerIndex = winner === 'A' ? 0 : winner === 'B' ? 1 : 2;
                      
                      executorDraft = variants[winnerIndex];
                      console.log(`[GrowthLoop] Task ${taskId}: Variant ${winner} selected by Hasib`);
                      
                      broadcastTaskUpdate({
                        id: taskId,
                        status: 'WINNER_VARIANT_SELECTED',
                        stage: 'CRO_OPTIMIZED',
                        result: `Winner: Variant ${winner} (scored by Hasib)`
                      });

                      // Log de l'activité
                      await logAgentActivity({
                        id: `act_${Date.now()}_hasib`,
                        agentId: 'hasib',
                        agentName: 'Hasib',
                        agentRole: 'director',
                        taskId: taskId,
                        activityType: 'CRO_SCORING',
                        prompt: 'A/B Testing simulation for 3 copy variants',
                        result: `Winner: Variant ${winner}`,
                        status: 'SUCCESS',
                        startedAt: new Date(),
                        completedAt: new Date()
                      });
                    } else {
                      // Fallback si scoring échoue
                      executorDraft = variants[0];
                      console.log(`[GrowthLoop] Task ${taskId}: Scoring failed, using Variant A`);
                    }
                  } else {
                    // Fallback si parsing échoue
                    executorDraft = variantsResult.stdout;
                    console.log(`[GrowthLoop] Task ${taskId}: Variant parsing failed, using raw output`);
                  }
                } catch (parseError) {
                  executorDraft = variantsResult.stdout;
                  console.log(`[GrowthLoop] Task ${taskId}: JSON parse error, using raw output`);
                }
              } else {
                executorDraft = variantsResult.stdout;
              }
            } else {
              // Non-marketing: comportement normal
              executorDraft = execResult.stdout;
            }
            
            // LOG: Direct execution
            await logAgentActivity({
              id: `act_${Date.now()}_${executor_id}`,
              agentId: executor_id,
              agentName: executor_id,
              agentRole: 'executor',
              taskId: taskId,
              activityType: 'DIRECT_EXECUTION',
              prompt: subTask,
              result: executorDraft,
              status: execResult.success ? 'SUCCESS' : 'FAILED',
              startedAt: new Date(),
              completedAt: new Date(),
              isSwarm: false,
            });
          }
        }

        // 🔧 PILIER 3 : DÉTERMINISME - Pre-QA Validation Gate (web_dev uniquement)
        if (serviceId === 'web_dev' && executorDraft.length > 0) {
          console.log(`[DeterminismGate] Task ${taskId}: Running syntax validation for web_dev...`);
          
          // Détecter si c'est du JSON (manifest) ou du TypeScript
          const isJson = executorDraft.trim().startsWith('{') || executorDraft.trim().startsWith('[');
          
          const validation = await validateWithAutoFix(
            taskId,
            executor_id,
            executorDraft,
            isJson,
            brief,
            subTask,
            qaHistory
          );
          
          if (!validation.success) {
            const errorMsg = `Syntax validation failed after 3 attempts: ${validation.errors.join('; ')}`;
            console.error(`[DeterminismGate] Task ${taskId}: ${errorMsg}`);
            throw new Error(`Sub-task ${i + 1} failed deterministic validation: ${errorMsg}`);
          }
          
          // Mettre à jour avec le code validé (peut avoir été auto-fixé)
          executorDraft = validation.validatedCode;
          console.log(`[DeterminismGate] Task ${taskId}: ✅ Code passed deterministic validation`);
        }

        // 🎨 PILIER 1 : VISUAL QA LOOP - Capture visuelle pour Branding/UI
        let visualQaContext = '';
        let screenshotBase64: string | null = null;
        
        if ((serviceId === 'branding' || serviceId === 'web_dev') && executorDraft.length > 0) {
          console.log(`[VisualQA] Task ${taskId}: Capturing visual rendering for ${serviceId}...`);
          
          try {
            const captureResult = await captureComponent(executorDraft);
            
            if (captureResult.success && captureResult.base64) {
              screenshotBase64 = captureResult.base64;
              visualQaContext = `[SYSTÈME] Voici la capture d'écran exacte du composant généré par ton exécutant. Tu as accès à l'image en base64: ${captureResult.base64.substring(0, 200)}... [IMAGE TRONQUÉE]`;
              
              console.log(`[VisualQA] Task ${taskId}: ✅ Screenshot captured successfully`);
            } else {
              console.warn(`[VisualQA] Task ${taskId}: ⚠️ Screenshot failed, falling back to text QA`);
              visualQaContext = '[SYSTÈME] Capture visuelle indisponible - QA textuelle uniquement';
              
              broadcastTaskUpdate({
                id: taskId,
                status: 'VISUAL_QA_FAILED_FALLBACK_TO_TEXT',
                stage: 'QA_WITH_TEXT_FALLBACK'
              });
            }
          } catch (visualError) {
            console.error(`[VisualQA] Task ${taskId}: Error during capture:`, visualError);
            visualQaContext = '[SYSTÈME] Erreur lors de la capture visuelle - QA textuelle';
            
            broadcastTaskUpdate({
              id: taskId,
              status: 'VISUAL_QA_FAILED_FALLBACK_TO_TEXT',
              stage: 'QA_WITH_TEXT_FALLBACK'
            });
          }
        }

        // QA par le Directeur (avec enrichissement visuel si disponible)
        const qaPrompt = serviceId === 'web_dev' 
          ? `Tu es le ${getAgentTitle(director_id)} (Agent ${director_id}) en mode AUDIT STRICT.

[SYSTÈME] Le code soumis a passé les tests de syntaxe mécaniques (tsc --noEmit). 
Ton rôle est d'auditer l'architecture, la propreté, la logique métier et le respect du Design System.

${visualQaContext}

CONTEXTE GLOBAL:
${brief}

SOUS-TÂCHE:
${subTask}

LIVRABLE DE L'EXÉCUTANT (ou assemblé par son essaim):
${executorDraft}

TA MISSION:
Audite UNIQUEMENT cette sous-tâche. Ne regarde pas le reste du projet.

RÈGLES:
- Si PARFAIT (respecte le brief, code impeccable): réponds EXACTEMENT par [VALIDATED]
- Si DÉFAUT: réponds EXACTEMENT par [REJECTED] suivi de ton feedback chirurgical

FORMAT:
[VALIDATED]
OU
[REJECTED]
1. Problème #1...
2. Instructions précises de correction`
          : serviceId === 'branding' && visualQaContext.includes('SYSTÈME')
          ? `Tu es le ${getAgentTitle(director_id)} (Agent ${director_id}) - Standard Top 1% Alt Ctrl Lab.

${visualQaContext}

Agis comme un Directeur Artistique de classe mondiale. Analyse l'image fournie (si disponible) OU le code ci-dessous.

Juge avec une exigence absolue :
• Hiérarchie visuelle : Le CTA est-il dominant ? Le texte secondaire est-il subordonné ?
• Équilibre des espaces (whitespace) : Respect des 8pt grid ? Marges cohérentes ?
• Contraste typographique : Hiérarchie font-size claire (H1 >> H2 >> body) ?
• Psychologie des couleurs : Palette en accord avec l'émotion souhaitée ?
• Alignement au pixel près : Tout est-il parfaitement aligné ?

CONTEXTE GLOBAL:
${brief}

SOUS-TÂCHE:
${subTask}

LIVRABLE DE L'EXÉCUTANT:
${executorDraft}

RÈGLES:
- Si PARFAIT (niveau Apple/Linear): [VALIDATED]
- Si un pixel est mal aligné, si l'espacement est approximatif, si la hiérarchie est floue : [REJECTED]

FORMAT:
[VALIDATED]
OU
[REJECTED]
1. Problème visuel précis (ex: "m-4 au lieu de m-6 sur le bouton principal")
2. Correction Tailwind spécifique requise`
          : `Tu es le ${getAgentTitle(director_id)} (Agent ${director_id}) en mode AUDIT STRICT.

CONTEXTE GLOBAL:
${brief}

SOUS-TÂCHE:
${subTask}

LIVRABLE DE L'EXÉCUTANT (ou assemblé par son essaim):
${executorDraft}

TA MISSION:
Audite UNIQUEMENT cette sous-tâche. Ne regarde pas le reste du projet.

RÈGLES:
- Si PARFAIT (respecte le brief, code impeccable): réponds EXACTEMENT par [VALIDATED]
- Si DÉFAUT: réponds EXACTEMENT par [REJECTED] suivi de ton feedback chirurgical

FORMAT:
[VALIDATED]
OU
[REJECTED]
1. Problème #1...
2. Instructions précises de correction`;

        const qaResult = await executeOpenClawAgent(director_id, qaPrompt, 60000);
        
        if (!qaResult.success) {
          console.warn(`[MicroDelegation] QA failed for sub-task ${i + 1}, assuming rejection`);
          continue;
        }

        if (qaResult.stdout.includes('[VALIDATED]')) {
          isValidated = true;
          console.log(`[MicroDelegation] Sub-task ${i + 1} VALIDATED`);
          
          // LOG: QA Validation
          await logAgentActivity({
            id: `act_${Date.now()}_${director_id}`,
            agentId: director_id,
            agentName: director_id,
            agentRole: 'director',
            taskId: taskId,
            activityType: 'QA_VALIDATION',
            prompt: `QA for: ${subTask.substring(0, 100)}...`,
            result: '[VALIDATED]',
            status: 'SUCCESS',
            startedAt: new Date(),
            completedAt: new Date(),
            qaResult: 'VALIDATED',
          });
        } else if (qaResult.stdout.includes('[REJECTED]')) {
          const feedback = qaResult.stdout.replace('[REJECTED]', '').trim();
          console.log(`[MicroDelegation] Sub-task ${i + 1} REJECTED (attempt ${qaAttempts}): ${feedback.substring(0, 100)}...`);
          
          // 🔒 PHASE 3 : Stocker l'historique QA pour éviter la perte d'état (Faille 6)
          qaHistory.push({
            iteration: qaAttempts,
            draft: executorDraft,
            feedback: feedback
          });
          
          executorDraft = "";
          
          // LOG: QA Rejection
          await logAgentActivity({
            id: `act_${Date.now()}_${director_id}`,
            agentId: director_id,
            agentName: director_id,
            agentRole: 'director',
            taskId: taskId,
            activityType: 'QA_REJECTION',
            prompt: `QA for: ${subTask.substring(0, 100)}...`,
            result: feedback.substring(0, 200),
            status: 'SUCCESS',
            startedAt: new Date(),
            completedAt: new Date(),
            qaResult: 'REJECTED',
          });
          
          if (qaAttempts < maxQaAttempts) {
            console.log(`[MicroDelegation] Retrying sub-task ${i + 1} with feedback...`);
          }
        }
      }

      if (!isValidated) {
        throw new Error(`Sub-task ${i + 1} failed QA after ${maxQaAttempts} attempts`);
      }

      finalDeliverable += `\n\n/* --- SOUS-TÂCHE ${i + 1}: ${subTask} --- */\n\n${executorDraft}`;
    }

    // ============================================================================
    // ÉTAPE 3: FINALISATION
    // ============================================================================
    
    await updateTaskStatus(taskId, 'COMPLETED', finalDeliverable, undefined, totalSubtasks, 'COMPLETED');
    broadcastTaskUpdate({ 
      id: taskId, 
      status: 'COMPLETED', 
      result: finalDeliverable,
      stage: 'COMPLETED',
      currentSubtask: totalSubtasks,
      totalSubtasks: totalSubtasks
    });
    
    console.log(`[MicroDelegation] Task ${taskId}: COMPLETED (${finalDeliverable.length} chars)`);
    
    // 🧠 PILIER 2 : Mémorisation dans le Vault après validation finale
    try {
      if (serviceId && (serviceId === 'web_dev' || serviceId === 'branding')) {
        console.log(`[MemoryVault] Task ${taskId}: Saving validated deliverable to vault...`);
        await saveToVault(brief, finalDeliverable, serviceId, 1.0);
        console.log(`[MemoryVault] Task ${taskId}: ✅ Component archived successfully`);
      }
    } catch (vaultError) {
      console.warn(`[MemoryVault] Task ${taskId}: Failed to save (non-blocking)`, vaultError);
    }

  } catch (fatalError) {
    const errorMsg = fatalError instanceof Error ? fatalError.message : 'Fatal worker error';
    console.error(`[MicroDelegation] Task ${taskId} FATAL ERROR:`, fatalError);
    
    try {
      await updateTaskStatus(taskId, 'FAILED', undefined, `FATAL: ${errorMsg}`, undefined, 'FATAL_ERROR');
      broadcastTaskUpdate({ 
        id: taskId, 
        status: 'FAILED', 
        error: `FATAL: ${errorMsg}`,
        stage: 'FATAL_ERROR'
      });
    } catch (dbError) {
      console.error(`[MicroDelegation] Could not update DB for task ${taskId}:`, dbError);
    }
  }
}

/**
 * Fonction legacy pour compatibilité
 * @deprecated Utiliser executeHierarchicalTask
 */
export async function executeAgentTask(
  taskId: string,
  agentName: string,
  prompt: string,
  timeoutMs: number = 900000
): Promise<void> {
  console.warn(`[Worker] Using legacy executeAgentTask for ${taskId}`);
  
  try {
    await updateTaskStatus(taskId, 'RUNNING');
    broadcastTaskUpdate({ id: taskId, status: 'RUNNING', stage: 'LEGACY_EXECUTION' });

    const result = await executeOpenClawAgent(agentName, prompt, timeoutMs);

    if (result.success) {
      await updateTaskStatus(taskId, 'COMPLETED', result.stdout);
      broadcastTaskUpdate({ id: taskId, status: 'COMPLETED', result: result.stdout });
    } else {
      await updateTaskStatus(taskId, 'FAILED', undefined, result.stderr);
      broadcastTaskUpdate({ id: taskId, status: 'FAILED', error: result.stderr });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Execution error';
    await updateTaskStatus(taskId, 'FAILED', undefined, errorMsg);
    broadcastTaskUpdate({ id: taskId, status: 'FAILED', error: errorMsg });
  }
}
