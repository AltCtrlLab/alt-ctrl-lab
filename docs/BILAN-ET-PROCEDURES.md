# AltCtrl.Lab Cockpit — Bilan Complet & Fiches de Procedures

> Document genere le 26 mars 2026
> Version cockpit : post-Vague 4 (30/30 features)

---

## PARTIE 1 — BILAN DE LA SESSION

### Ce qu'on a construit aujourd'hui

En une session, nous avons implemente **30 features manquantes** identifiees apres un audit complet du cockpit, organisees en 4 vagues :

| Vague | Theme | Features | Lignes | Tables DB | Commit |
|-------|-------|----------|--------|-----------|--------|
| 1 | Quick Wins | 7 | ~3 750 | 6 | `44fafba8` |
| 2 | High Value | 10 | ~3 200 | 3 | `a8ee3f8e` |
| 3 | Strategic | 9 | 2 257 | 12 | `972fc026` |
| 4 | Polish | 4 | 1 483 | 6 | `98cbe2a6` |
| **TOTAL** | | **30** | **~10 700** | **27** | **4 commits** |

### Inventaire complet du cockpit

| Categorie | Nombre |
|-----------|--------|
| Routes API totales | **125+** |
| Pages dashboard | **21** |
| Crons automatiques | **16** |
| Webhooks | **8** |
| Routes IA | **16** |
| Routes marketing | **7** |
| Routes branding | **3** |
| Tables SQLite | **60+** |

### Les 30 features ajoutees — Liste complete

#### Vague 1 — Quick Wins
| # | Feature | Route API | Ce que ca fait |
|---|---------|-----------|----------------|
| 1 | Branded PDF Templates | `/api/documents/generate-pdf` | Genere des PDF brandes (proposal, invoice, audit, contrat, welcome-pack) |
| 3 | Email Signature | `/api/branding/email-signature` | Genere des signatures HTML Gmail/Outlook compatibles |
| 9 | UTM Builder | `/api/marketing/utm` | Cree des liens UTM, track les campagnes par canal |
| 13 | Testimonial Collector | `/api/marketing/testimonial` | Formulaire public + widget "wall of love" embeddable |
| 19 | Send Time Optimizer | `/api/marketing/send-time` | Calcule la meilleure heure d'envoi par contact |
| 27 | Expense Analytics | `/api/finances/expenses` | Categorisation IA des depenses, profit net, trends |
| 30 | Client Weekly Digest | `/api/cron/client-weekly-digest` | Email hebdo automatique aux clients (avancement projets) |

#### Vague 2 — High Value
| # | Feature | Route API | Ce que ca fait |
|---|---------|-----------|----------------|
| 2 | Brand Asset Kit | `/api/branding/kit` | One-pager HTML avec logo, couleurs, typo, ton |
| 5 | Case Study Generator | `/api/content/case-study` | Transforme un projet livre en case study IA |
| 7 | Contract Templates | `/api/documents/contract` | 4 templates juridiques (prestation, NDA, maintenance, CGV) |
| 11 | Lead Magnet System | `/api/marketing/lead-magnet` | PDF gates avec capture email + nurture auto |
| 17 | AI Pricing Optimizer | `/api/ai/pricing-optimizer` | Recommandation prix basee sur historique + marche |
| 18 | Churn Detection | `/api/cron/churn-detection` | Score de risque + email win-back automatique |
| 20 | AI Content Calendar | `/api/ai/content-calendar` | Calendrier editorial mensuel genere par IA |
| 22 | Objection Handler | `/api/ai/objection-handler` | 3 reponses IA par objection commerciale |
| 25 | Client Health Score | `/api/analytics/client-health` | Score 0-100 par client (paiement, projet, engagement, satisfaction) |
| 29 | Knowledge Base | `/api/knowledge` | Wiki interne CRUD avec recherche |

#### Vague 3 — Strategic
| # | Feature | Route API | Ce que ca fait |
|---|---------|-----------|----------------|
| 4 | Social Media Templates | `/api/content/social-template` | 6 types de templates (quote, stat, testimonial, etc.) |
| 6 | White-Label Reports | SEO Pilot + Client Monthly | Rapports au branding du client |
| 10 | A/B Test Engine | `/api/marketing/ab-test` | Tests A/B avec split deterministe + statistiques |
| 12 | Referral Tracking | `/api/marketing/referral` | Programme d'affiliation avec commissions |
| 14 | SERP Monitor | `/api/cron/serp-monitor` | Suivi positions Google par mot-cle |
| 16 | Multi-Channel Inbox | `/api/inbox` | Conversations unifiees (email, WhatsApp, chat, SMS...) |
| 21 | Client Alerts | `/api/alerts` | Alertes temps reel (email, Slack, webhook) |
| 23 | Portfolio Builder | `/api/portfolio/showcase` | Page portfolio HTML publique auto-generee |
| 26 | Capacity Planner | `/api/analytics/capacity` | Charge par semaine, utilisation, deadlines |

#### Vague 4 — Polish
| # | Feature | Route API | Ce que ca fait |
|---|---------|-----------|----------------|
| 8 | Media Kit Generator | `/api/branding/media-kit` | Dossier de presse HTML (logo, stats, contact) |
| 15 | Email Health Monitor | `/api/marketing/email-health` | Verification SPF/DKIM/DMARC + delivrabilite |
| 24 | VoC Analyzer | `/api/ai/voc-analysis` | Analyse voix du client (NPS + testimonials + conversations) |
| 28 | SLA Monitor | `/api/cron/sla-monitor` | Surveillance SLA + alertes de depassement |

---

## PARTIE 2 — UTILISATION AU QUOTIDIEN

### Journee type d'un gerant d'agence avec le cockpit

#### 07:30 — Morning Briefing (automatique)
Le cockpit genere votre briefing IA du jour :
```
GET /api/ai/morning-briefing
```
**Ce que vous voyez sur le dashboard :** KPIs du jour, leads chauds, deadlines imminentes, factures en retard, recommandations d'actions.

**Automatismes actifs pendant la nuit :**
- Le cron `followup` a envoye les relances email (J+3, J+7, J+14)
- Le cron `cold-email` a envoye les emails de prospection
- Le cron `nurture` a avance les sequences d'engagement
- Le cron `invoice-reminder` a relance les factures impayees

#### 08:00 — Verifier le pipeline leads
**Page :** `/leads`

1. Nouveaux leads arrives (webhooks Cal.com, formulaires, Google Maps scraper)
2. Leads chauds identifies par le scoring automatique
3. Ouvrir le detail d'un lead → bouton "Generer Proposition IA"

#### 09:00 — Gerer les projets
**Page :** `/projets`

1. Verifier les phases de chaque projet actif
2. Capacity Planner : `GET /api/analytics/capacity` → voir la charge semaine par semaine
3. Si surcharge > 120% → decaler ou sous-traiter

#### 10:00 — Marketing & Contenu
**Page :** `/content` + `/marketing`

1. Content Calendar IA : voir les posts planifies pour la semaine
2. Carousel Studio : creer un carrousel Instagram en 2 min
3. Verifier les campagnes UTM et le ROI par canal
4. A/B tests en cours : quelle variante gagne ?

#### 14:00 — Commercial & Propositions
1. Lead arrive chaud → Pricing Optimizer suggere le prix optimal
2. Generer la proposition PDF brandee
3. Si objection client → Objection Handler donne 3 reponses

#### 16:00 — Suivi client & Post-vente
**Page :** `/postvente`

1. Client Health Score : qui est en zone rouge ?
2. Inbox unifie : repondre aux messages tous canaux
3. SLA Monitor : sommes-nous dans les temps ?

#### 17:30 — Administratif
1. Expenses : categoriser les depenses du jour
2. Finances : verifier le profit net du mois
3. Knowledge Base : documenter un process ou une decision

#### Lundi matin (automatique)
- **Client Weekly Digest** : chaque client recoit un email avec l'avancement de son projet
- **KPI Digest** : recap hebdo envoye au CEO
- **Churn Detection** : score de risque mis a jour, alertes si necessaire

---

## PARTIE 3 — FICHES DE PROCEDURE

---

### FICHE 1 — Gestion du pipeline leads

**Objectif :** Transformer un prospect en client signe

#### Etape 1 : Acquisition des leads
Les leads arrivent automatiquement via :
- **Cal.com** → Webhook `/api/webhooks/cal-booking` (status "Qualifie")
- **Formulaire audit** → Webhook `/api/webhooks/audit-request`
- **Google Maps scraper** → Webhook `/api/webhooks/cold-lead`
- **Lead magnets** → `PATCH /api/marketing/lead-magnet` (capture email)

**Action manuelle :** Ajouter un lead manuellement depuis la page `/leads` → bouton "Nouveau Lead"

#### Etape 2 : Qualification automatique
Le systeme score chaque lead automatiquement (0-100) base sur :
- Budget declare
- Source (Cal.com = +20, Recommandation = +15)
- Engagement email (opens, clicks via webhook Mailjet)
- Taille entreprise / site web

#### Etape 3 : Premier contact
```
POST /api/cron/cold-email  ← Automatique (email personnalise IA)
```
Pour un lead chaud :
1. Ouvrir le lead dans `/leads`
2. Cliquer "Generer Proposition IA"
3. La proposition est generee avec le bon pricing (via Pricing Optimizer)
4. Envoyer au prospect

#### Etape 4 : Suivi et relances
**Automatique :** Le cron `nurture` gere la sequence :
- J+1 : Email de bienvenue
- J+3 : Etude de cas pertinente
- J+7 : Proposition de valeur
- J+14 : Derniere chance (breakup email)

**Manuel :** En cas d'objection, utiliser l'Objection Handler :
```
POST /api/ai/objection-handler
Body: { "objection": "C'est trop cher", "context": "PME, budget 5k" }
→ 3 reponses (empathique, data-driven, reframe)
```

#### Etape 5 : Signature
Passer le lead en status "Signe" → le systeme auto-chain cree :
- Le projet associe
- La premiere facture
- Le followup de bienvenue

---

### FICHE 2 — Gestion de projet client

**Objectif :** Livrer a temps, dans le budget, avec satisfaction client

#### Etape 1 : Kickoff
1. Le projet est cree automatiquement quand un lead est signe
2. Verifier les infos projet : client, type, budget, deadline
3. Generer le contrat :
```
POST /api/documents/contract
Body: { "type": "prestation", "clientName": "...", "projectDescription": "..." }
```

#### Etape 2 : Suivi quotidien
1. **Capacity Planner** : verifier la charge
```
GET /api/analytics/capacity?weeks=4
→ Voir utilisation par semaine, alertes surcharge
```

2. **Saisir les heures** : via la page `/projets` → time entries

3. **Deadlines** : le cron `deadline-alert` vous alerte a J-3, J-1 et en retard

#### Etape 3 : Communication client
- **Weekly Digest automatique** (lundi matin) : le client recoit un email avec :
  - Taches completees cette semaine
  - Heures consommees vs estimees
  - Prochaine deadline
  - Prochaines etapes

- **Inbox** : si le client repond → la reponse arrive dans l'inbox unifie
```
GET /api/inbox?clientId=xxx
```

#### Etape 4 : Livraison
Passer le projet en phase "Livre" → le systeme auto-chain :
- Cree un followup NPS J+3
- Envoi automatique de la demande de temoignage

#### Etape 5 : Post-livraison
1. **Testimonial** : le client remplit le formulaire → apparait dans le widget
2. **Case Study** : generer une etude de cas IA :
```
POST /api/content/case-study
Body: { "projectId": "proj_xxx" }
```
3. **Portfolio** : ajouter au portfolio showcase si le projet est remarquable

---

### FICHE 3 — Facturation et finances

**Objectif :** Maximiser le cash flow, minimiser les impayes

#### Facturation
1. Les factures sont creees automatiquement au passage en "Signe"
2. Page `/finances` → voir toutes les factures, statuts, montants

#### Relances automatiques
Le cron `invoice-reminder` gere l'escalade :
| Delai | Action | Ton |
|-------|--------|-----|
| J+15 | Email de rappel | Poli |
| J+30 | Relance ferme | Insistant |
| J+45 | Alerte CEO + email final | Urgent |

#### Suivi des depenses
```
POST /api/finances/expenses
Body: { "description": "Abonnement Vercel Pro", "amount": 20, "date": "2026-03-26" }
→ L'IA categorise automatiquement (hosting)
```

**Categories :** api, hosting, tools, freelance, ads, office, legal, other

#### Dashboard financier
```
GET /api/finances/expenses
→ { profitNet, margin, breakdownByCategory, monthlyTrend, recurringExpenses }
```

---

### FICHE 4 — Marketing et acquisition

**Objectif :** Generer des leads qualifies de maniere previsible

#### 4.1 — Campagnes UTM
Creer une campagne tracee :
```
POST /api/marketing/utm
Body: {
  "name": "Campagne LinkedIn Mars",
  "source": "linkedin",
  "medium": "social",
  "baseUrl": "https://altctrllab.com/audit"
}
→ { utmUrl: "https://altctrllab.com/audit?utm_source=linkedin&utm_medium=social&..." }
```
Partager ce lien → chaque clic et conversion sont traces.

#### 4.2 — Lead Magnets
1. Creer un lead magnet :
```
POST /api/marketing/lead-magnet
Body: { "title": "Guide SEO 2026", "fileUrl": "/guides/seo-2026.pdf", "slug": "guide-seo" }
```
2. Le prospect remplit le formulaire → recoit le PDF + est cree comme lead
3. La nurture sequence demarre automatiquement

#### 4.3 — A/B Tests
```
POST /api/marketing/ab-test
Body: { "name": "Landing V2 vs V3", "pageUrl": "/landing", "splitRatio": 50 }
```
Assigner un visiteur :
```
GET /api/marketing/ab-test?testId=ab_xxx&assign=true&visitorId=visitor_123
→ { variant: "A", label: "Variante A" }
```
Tracker une conversion :
```
PATCH /api/marketing/ab-test
Body: { "id": "ab_xxx", "action": "convert", "variant": "A" }
```

#### 4.4 — Programme de referral
```
POST /api/marketing/referral
Body: { "referrerName": "Jean Dupont", "referrerEmail": "jean@example.com", "commissionPercent": 10 }
→ { code: "jeandupoxk4m", referralUrl: "https://altctrllab.com?ref=jeandupoxk4m" }
```

#### 4.5 — Testimonials
Le widget embeddable "Wall of Love" :
```
GET /api/marketing/testimonial?format=widget
→ HTML complet a integrer sur votre site
```

---

### FICHE 5 — Contenu et reseaux sociaux

**Objectif :** Publier du contenu regulier et de qualite

#### 5.1 — Calendrier editorial IA
```
POST /api/ai/content-calendar
Body: { "month": "2026-04", "postsPerWeek": 4, "platforms": ["linkedin", "instagram"] }
→ Plan de 30 jours avec themes, formats, briefs
```

#### 5.2 — Carrousels Instagram
1. Aller sur `/content/carousel-studio`
2. Suggestions de sujets IA → choisir un sujet
3. Generer le carrousel (slides visuelles via Gemini)
4. Telecharger et publier

#### 5.3 — Templates sociaux
```
POST /api/content/social-template
Body: { "templateType": "stat", "title": "ROI moyen", "data": { "stat": "+340%", "context": "ROI de nos clients e-commerce" } }
→ HTML du template 1080x1080 pret a exporter
```

Types disponibles : `quote`, `stat`, `testimonial`, `before-after`, `listicle`, `story`

#### 5.4 — Case Studies
Transformer un projet livre en contenu marketing :
```
POST /api/content/case-study
Body: { "projectId": "proj_xxx" }
→ { title, challenge, approach, solution, results[], testimonial }
```

#### 5.5 — Repurposing
Transformer un article en 5 formats :
```
POST /api/ai/repurpose-content
Body: { "content": "votre article long...", "formats": ["linkedin", "twitter", "newsletter", "instagram"] }
```

---

### FICHE 6 — Branding et documents

**Objectif :** Maintenir une image de marque coherente

#### 6.1 — Brand Kit client
```
POST /api/branding/kit
Body: {
  "clientId": "client_xxx",
  "companyName": "TechStartup",
  "primaryColor": "#2563eb",
  "secondaryColor": "#7c3aed",
  "fontHeading": "Poppins",
  "fontBody": "Inter",
  "tagline": "Innovation digitale"
}
```
Previsualiser : `GET /api/branding/kit?clientId=xxx&format=html`

#### 6.2 — Signature email
```
POST /api/branding/email-signature
Body: { "name": "Marie Durand", "title": "CEO", "email": "marie@altctrl.lab", "phone": "+33 6 12 34 56 78" }
→ HTML signature compatible Gmail/Outlook
```

#### 6.3 — Media Kit / Dossier de presse
```
POST /api/branding/media-kit
Body: {
  "companyName": "AltCtrl.Lab",
  "tagline": "Agence Digitale Premium",
  "stats": { "Clients": "50+", "Projets livres": "120+", "NPS": "78" },
  "contactEmail": "press@altctrl.lab"
}
→ HTML complet du dossier de presse
```
Previsualiser : `GET /api/branding/media-kit?id=mkit_xxx&format=html`

#### 6.4 — White-Label Reports
Pour envoyer des rapports au branding du client :
```
POST /api/products/seo-pilot
Body: {
  "action": "configure",
  "clientId": "client_xxx",
  "url": "https://client-site.com",
  "whiteLabel": true,
  "brandKitId": "bkit_xxx"
}
```
Les rapports mensuels utiliseront le logo et les couleurs du client.

#### 6.5 — Contrats
4 templates disponibles :
```
POST /api/documents/contract
Body: { "type": "prestation", "clientName": "...", "amount": 5000, "duration": "3 mois" }
```
Types : `prestation`, `nda`, `maintenance`, `cgv`

---

### FICHE 7 — Monitoring et alertes

**Objectif :** Ne jamais etre pris au depourvu

#### 7.1 — Client Health Score
```
GET /api/analytics/client-health
→ Score 0-100 par client, trie du pire au meilleur
  - healthy (75+), watch (50-74), at-risk (25-49), critical (<25)
```
**Action :** Si un client passe en "at-risk", le cron churn-detection envoie un email win-back automatique.

#### 7.2 — SLA Monitor
Configurer un SLA :
```
PATCH /api/cron/sla-monitor
Body: {
  "action": "create",
  "name": "Temps de reponse client X",
  "clientId": "client_xxx",
  "metric": "response_time",
  "thresholdHours": 24,
  "alertEmail": "team@altctrl.lab"
}
```
Metriques disponibles : `response_time`, `delivery`, `uptime`, `resolution`, `first_response`

Le cron quotidien verifie et alerte a 80% du seuil (warning) et a 100% (breach).

#### 7.3 — Alertes temps reel
Configurer une alerte client :
```
POST /api/alerts
Body: {
  "clientId": "client_xxx",
  "alertType": "invoice_overdue",
  "channel": "email",
  "emailTo": "client@example.com"
}
```
Types : `new_lead`, `site_down`, `kpi_reached`, `invoice_overdue`, `project_milestone`, `nps_response`, `budget_exceeded`, `custom`

Canaux : `email`, `slack`, `webhook`

#### 7.4 — SERP Monitoring
Ajouter un mot-cle a suivre :
```
PATCH /api/cron/serp-monitor
Body: { "action": "add", "keyword": "agence digitale paris", "targetDomain": "altctrllab.com" }
```
Historique des positions :
```
GET /api/cron/serp-monitor?keywordId=serpkw_xxx
→ { keyword, history: [{ position, date }...] }
```

#### 7.5 — Email Deliverability
```
POST /api/marketing/email-health
Body: { "domain": "altctrl.lab" }
→ { score: 85, checks: { spfValid: true, dkimValid: true, dmarcValid: false }, recommendations: [...] }
```

---

### FICHE 8 — Analytics et intelligence

**Objectif :** Prendre des decisions basees sur les donnees

#### 8.1 — Revenue Intelligence
```
GET /api/analytics/revenue
→ MRR, ARR, revenus par mois, par client, par type de projet, growth rate
```

#### 8.2 — Capacity Planner
```
GET /api/analytics/capacity?weeks=8
→ {
    weeklyLoad: [{ week, projectHours, pipelineHours, utilization, status }...],
    upcomingDeadlines: [...],
    alerts: ["2 semaines en surcharge"]
  }
```

**Regles d'or :**
- Utilisation 60-90% = **optimal**
- > 90% = **attention**, anticiper la delegation
- > 120% = **surcharge**, refuser ou decaler
- < 40% = **sous-utilisation**, booster la prospection

#### 8.3 — Voice of Customer
```
POST /api/ai/voc-analysis
→ {
    overallSentiment: "positive",
    themes: [{ name: "reactivite", sentiment: "positive" }...],
    painPoints: [{ issue: "delais de livraison", impact: "medium" }...],
    recommendations: [{ action: "...", priority: "high" }...]
  }
```

#### 8.4 — Client Health Dashboard
```
GET /api/analytics/client-health
→ Chaque client avec son score decompose :
    - Paiement (25 pts) : factures payees a temps
    - Projet (25 pts) : avancement, livraisons
    - Engagement (25 pts) : frequence interactions
    - Satisfaction (25 pts) : NPS, feedbacks
```

---

### FICHE 9 — Automatisations (Crons)

**Objectif :** Laisser le cockpit travailler pour vous

| Cron | Frequence | Ce qu'il fait |
|------|-----------|---------------|
| `cold-email` | Quotidien | Envoie des emails de prospection personnalises IA |
| `followup` | Quotidien 9h | Relances leads GMB (J+3, J+7, J+14) |
| `nurture` | Quotidien | Sequence nurture multi-etapes adaptative |
| `invoice-reminder` | Quotidien | Relances factures (J+15, J+30, J+45) |
| `deadline-alert` | Quotidien | Alertes deadlines (J-3, J-1, overdue) |
| `auto-archive` | Quotidien | Archive les leads inactifs 30j+ |
| `sla-monitor` | Quotidien 7h | Verifie les SLA, alerte sur les depassements |
| `client-weekly-digest` | Lundi 8h | Email recap hebdo aux clients |
| `kpi-digest` | Lundi 7h | Recap KPIs envoye au CEO |
| `churn-detection` | Hebdomadaire | Score risque churn + win-back auto |
| `serp-monitor` | Dimanche 6h | Suivi positions Google |
| `veille-concurrentielle` | Hebdomadaire | Analyse des sites concurrents |
| `prospection` | Lundi 8h | Pipeline de prospection automatisee |
| `tech-watch` | Quotidien 9h | Veille technologique IA |
| `news` | Quotidien 8h | Agregation news secteur |
| `metrics-snapshot` | Periodique | Snapshot metriques systeme |

**Pour declencher un cron manuellement :**
```
curl -X POST https://votre-url/api/cron/NOM_DU_CRON \
  -H "Authorization: Bearer VOTRE_CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

### FICHE 10 — Knowledge Base (Wiki interne)

**Objectif :** Centraliser le savoir de l'agence

#### Creer un article
```
POST /api/knowledge
Body: {
  "title": "Process onboarding nouveau client",
  "contentMd": "## Etape 1\nEnvoyer le welcome pack...",
  "category": "process",
  "tags": "onboarding,client,process"
}
```

#### Categories
| Categorie | Usage |
|-----------|-------|
| `process` | Procedures operationnelles (cette fiche !) |
| `template` | Templates reutilisables |
| `runbook` | Guides techniques pas-a-pas |
| `decision` | Decisions architecturales documentees |
| `faq` | Questions frequentes |
| `resource` | Ressources utiles et liens |

#### Rechercher
```
GET /api/knowledge?search=onboarding&category=process
```

---

## PARTIE 4 — BEST PRACTICES & PROCESS OPTIMAUX

### Les 10 commandements du cockpit

1. **Tu ne feras rien manuellement que le cockpit peut automatiser.**
   Les crons tournent 24/7. Laissez-les faire.

2. **Tu verifieras le Morning Briefing chaque matin.**
   C'est votre tableau de bord IA. Il resume tout.

3. **Tu suivras le Client Health Score chaque semaine.**
   Un client qui passe sous 50 = appel immediat.

4. **Tu documenteras dans la Knowledge Base.**
   Si vous l'expliquez 2 fois, ecrivez-le 1 fois.

5. **Tu trackeras chaque campagne avec des UTM.**
   Sans tracking, pas de ROI. Sans ROI, pas de decision.

6. **Tu utiliseras le Pricing Optimizer avant chaque devis.**
   Il connait votre historique mieux que vous.

7. **Tu genereras les documents via l'API.**
   PDF, contrats, proposals — tout est template et brande.

8. **Tu verifieras le Capacity Planner avant d'accepter un projet.**
   Mieux vaut refuser que livrer en retard.

9. **Tu collecteras un testimonial apres chaque livraison.**
   Le NPS J+3 et le formulaire sont automatiques. Suivez juste.

10. **Tu analyseras la VoC chaque mois.**
    Les tendances client guident votre strategie.

### Workflow optimal — Du lead au testimonial

```
Lead arrive (webhook)
    → Scoring auto
    → Cold email IA (J+0)
    → Nurture sequence (J+1 → J+14)
    → Proposition IA + Pricing Optimizer
    → Signature → Auto-chain (projet + facture + followup)
    → Contrat genere automatiquement
    → Weekly Digest client (chaque lundi)
    → Capacity Planner verifie la charge
    → SLA Monitor surveille les delais
    → Livraison → NPS J+3 auto
    → Testimonial collecte auto
    → Case Study genere par IA
    → Portfolio mis a jour
    → Churn Detection surveille la relation
```

### Metriques a suivre

| Metrique | Cible | Ou la trouver |
|----------|-------|---------------|
| Taux de conversion lead→signe | > 15% | `/api/analytics/revenue` |
| NPS moyen | > 50 | `/api/ai/voc-analysis` |
| Delai moyen de reponse | < 24h | `/api/cron/sla-monitor` |
| Utilisation capacite | 60-90% | `/api/analytics/capacity` |
| Bounce rate email | < 2% | `/api/marketing/email-health` |
| Taux d'ouverture email | > 25% | `/api/marketing/send-time` |
| Client health score moyen | > 70 | `/api/analytics/client-health` |
| Profit net mensuel | Croissant | `/api/finances/expenses` |

---

## PARTIE 5 — ACCES RAPIDES

### URLs du cockpit

| Page | URL |
|------|-----|
| Dashboard | `/dashboard` |
| Leads | `/leads` |
| Projets | `/projets` |
| Finances | `/finances` |
| Contenu | `/content` |
| Carousel Studio | `/content/carousel-studio` |
| Marketing | `/marketing` |
| Branding | `/branding` |
| Prospection | `/prospection` |
| Automations | `/automations` |
| Portfolio | `/portfolio` |
| Post-vente | `/postvente` |
| Planning | `/planning` |
| Historique | `/history` |
| R&D Lab | `/rd` |

### Variables d'environnement cles

| Variable | Usage |
|----------|-------|
| `CRON_SECRET` | Auth pour tous les crons |
| `KIMI_API_KEY` | IA Kimi k2.5 |
| `N8N_BASE_URL` + `N8N_API_KEY` | n8n automations |
| `MAILJET_API_KEY` + `MAILJET_SECRET` | Envoi emails |
| `SLACK_WEBHOOK_URL` | Notifications Slack |
| `NEXT_PUBLIC_BASE_URL` | URL publique du cockpit |
| `GEMINI_API_KEY` | Generation d'images Gemini |

---

*Document genere par AltCtrl.Lab Cockpit — Mars 2026*
