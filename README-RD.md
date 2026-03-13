# ⭐ Alt Ctrl Lab - R&D Autonome (Option A)

Système d'auto-amélioration et de veille technologique autonome.

## 🎯 Vision

> "Une agence qui s'améliore toute seule pendant que tu dors"

Le système R&D découvre automatiquement les innovations émergentes, les transforme en opportunités Alt Ctrl Lab, et les intègre à l'agence via le War Room Protocol.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALT CTRL LAB R&D SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │Abdul Khabir │───▶│Abdul Basir  │───▶│  CEO Validation     │ │
│  │  (Scout)    │    │ (Elevator)  │    │   (War Room)        │ │
│  └──────┬──────┘    └──────┬──────┘    └─────────────────────┘ │
│         │                  │                                    │
│         ▼                  ▼                                    │
│  ┌─────────────────────────────────────┐                       │
│  │      KNOWLEDGE FUSION ENGINE        │                       │
│  └──────────────────┬──────────────────┘                       │
│                     │                                           │
│         ┌───────────┴───────────┐                              │
│         ▼                       ▼                              │
│  ┌─────────────┐         ┌─────────────┐                       │
│  │VAULT        │         │AUTO-PLAYBOOK│                       │
│  │ENRICHER     │         │GENERATOR    │                       │
│  └─────────────┘         └─────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 👥 Agents R&D

### AbdulKhabir (الخبير) - The Scout
**Mission:** Veille technologique multi-source

```typescript
import { abdulKhabir } from '@/lib/ai/agents';

// Lancer un scouting manuel
const results = await abdulKhabir.scout({
  sources: ['reddit', 'github', 'hackernews'],
  limit: 10,
});
```

**Sources surveillées:**
- Reddit (r/MachineLearning, r/LocalLLaMA, r/webdev)
- GitHub (trending repos)
- HackerNews
- ArXiv

### AbdulBasir (البصير) - The Elevator
**Mission:** Transformer les découvertes en innovations Alt Ctrl Lab

```typescript
import { abdulBasir } from '@/lib/ai/agents';

// Élever les découvertes en attente
const results = await abdulBasir.processPendingDiscoveries();
```

**Scoring:**
- `opportunityScore` (0-100): Score composite
- `noveltyScore` (0-10): Nouveauté du concept
- `feasibilityScore` (0-10): Faisabilité technique
- `strategicFitScore` (0-10): Alignement stratégique

### Knowledge Fusion Engine
**Mission:** Détecter les patterns et tendances

```typescript
import { fusionEngine } from '@/lib/ai/agents';

const analysis = await fusionEngine.analyze({
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  minEvidenceCount: 3,
});
```

### Vault Enricher
**Mission:** Capturer les livrables de qualité pour réutilisation

```typescript
import { vaultEnricher } from '@/lib/ai/agents';

await vaultEnricher.processApprovedDeliverables({ limit: 10 });
```

### Auto-Playbook Generator
**Mission:** Formaliser les patterns réussis en playbooks

```typescript
import { autoPlaybookGenerator } from '@/lib/ai/agents';

await autoPlaybookGenerator.generateFromSources();
```

## 📡 API Endpoints

### Overview
```bash
GET /api/rd?action=overview
```

### Découvertes
```bash
GET /api/rd?action=discoveries&status=raw&limit=20
```

### Innovations
```bash
GET /api/rd?action=innovations&status=proposed
```

### Actions
```bash
# Lancer un scouting
POST /api/rd
{ "action": "scout", "payload": { "limit": 10 } }

# Élever les découvertes
POST /api/rd
{ "action": "elevate" }

# Pipeline complet
POST /api/rd
{ "action": "run-pipeline" }

# Approuver une innovation
POST /api/rd
{ "action": "approve-innovation", "payload": { "innovationId": "inn_xxx" } }
```

### Métriques
```bash
GET /api/rd/metrics?period=7d
```

### Cron (Automatisation)
```bash
# Exécute le cycle R&D complet
GET /api/rd/cron
Authorization: Bearer altctrl-rnd-2024
```

## 🗄️ Database Schema

### Tables principales

| Table | Description |
|-------|-------------|
| `discoveries` | Découvertes brutes de Khabir |
| `innovations` | Innovations élevées par Basir |
| `knowledge_graph_edges` | Liens entre concepts |
| `detected_patterns` | Patterns détectés par le Fusion Engine |
| `auto_playbooks` | Playbooks auto-générés |
| `learning_log` | Log d'apprentissage |
| `rd_metrics` | Métriques agrégées |

## ⚙️ Configuration

### Variables d'environnement
```bash
# Cron secret pour sécuriser les endpoints cron
CRON_SECRET=altctrl-rnd-2024

# Fréquences (optionnel)
RD_SCOUT_FREQUENCY=6h
RD_ELEVATE_FREQUENCY=12h
```

### Seuils de qualité (dans le code)
- `minOpportunityScore`: 60/100
- `minNoveltyScore`: 5/10
- `minFeasibilityScore`: 4/10
- `autoApproveThreshold`: 85/100

## 🔄 Workflow Complet

### 1. Discovery (Toutes les 6h)
```
Sources Web → Khabir → DB (discoveries)
```

### 2. Elevation (Toutes les 12h)
```
Discoveries (raw) → Basir → Innovations (proposed)
```

### 3. Analysis (Quotidien)
```
Discoveries + Innovations → Fusion Engine → Patterns
```

### 4. Approval (Manuel ou Auto)
```
Innovations (proposed) → CEO Review → Innovations (approved)
```

### 5. Implementation (Auto)
```
Innovations (approved) → War Room Connector → War Room Protocol
```

### 6. Learning (Continue)
```
Livrables approuvés → Vault Enricher → Component Vault
Patterns réussis → Playbook Generator → Auto Playbooks
```

## 📊 Métriques Clés

### Conversion Funnel
```
Découvertes → Élevées → Approuvées → Implémentées
    │           │          │            │
   100%       ~30%       ~20%         ~10%
```

### ROI Estimation
```
Tokens investis: ~5000/découverte
Valeur créée estimée: €500-5000/innovation implémentée
ROI: ~10x
```

## 🚀 Démarrage Rapide

### 1. Initialisation
```bash
# Les tables sont créées automatiquement au démarrage
npm run dev
```

### 2. Premier Scouting
```bash
curl -X POST http://localhost:3000/api/rd \
  -H "Content-Type: application/json" \
  -d '{"action": "scout", "payload": {"limit": 5}}'
```

### 3. Élévation
```bash
curl -X POST http://localhost:3000/api/rd \
  -H "Content-Type: application/json" \
  -d '{"action": "elevate"}'
```

### 4. Pipeline Complet
```bash
curl -X POST http://localhost:3000/api/rd \
  -H "Content-Type: application/json" \
  -d '{"action": "run-pipeline"}'
```

### 5. Cron (Automatisation)
```bash
# Manuellement
curl http://localhost:3000/api/rd/cron

# Ou ajouter au crontab:
# 0 */6 * * * curl -H "Authorization: Bearer altctrl-rnd-2024" http://localhost:3000/api/rd/cron
```

## 🎓 Bonnes Pratiques

### 1. Review régulière
```bash
# Voir les innovations proposées
curl http://localhost:3000/api/rd?action=innovations&status=proposed

# Approuver manuellement
curl -X POST http://localhost:3000/api/rd \
  -d '{"action": "approve-innovation", "payload": {"innovationId": "inn_xxx"}}'
```

### 2. Surveillance des métriques
```bash
curl http://localhost:3000/api/rd/metrics?period=7d
```

### 3. Ajustement des seuils
Si trop de bruit → Augmenter `minOpportunityScore`
Si trop peu de découvertes → Baisser les seuils ou augmenter les sources

## 🔮 Roadmap

- [ ] Vrai scraping (Puppeteer/API Reddit/GitHub)
- [ ] Embeddings vectoriels (vrai RAG)
- [ ] Auto-prompter (amélioration des prompts)
- [ ] Prédiction de tendances (time-series)
- [ ] Benchmarking automatique

---

**"L'innovation n'est pas un accident, c'est un système"** 🤖
