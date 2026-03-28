import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';

type Sector = 'beaute' | 'resto' | 'ecom' | 'immobilier' | 'sante' | 'coach' | 'artisan' | 'web' | 'default';

function detectSector(company: string, notes: string): Sector {
  const text = `${company} ${notes}`.toLowerCase();
  if (/beauté|beaute|spa|institut|esthét|coiff|nail|soin|bien.être/i.test(text)) return 'beaute';
  if (/restaur|brasserie|café|cafe|bar|traiteur|cuisine|food/i.test(text)) return 'resto';
  if (/immobilier|agence immo|promoteur|logement|appart|maison/i.test(text)) return 'immobilier';
  if (/médecin|médical|clinique|cabinet|pharma|kiné|santé/i.test(text)) return 'sante';
  if (/coach|consultant|formateur|conseil|consulting/i.test(text)) return 'coach';
  if (/boutique|shop|ecommerce|e-commerce|vente en ligne|produits/i.test(text)) return 'ecom';
  if (/artisan|menuisier|plombier|électricien|bâtiment|travaux/i.test(text)) return 'artisan';
  if (/saas|app|logiciel|développement|startup/i.test(text)) return 'web';
  return 'default';
}

interface SectorTemplate {
  problemStatement: string;
  approach: string[];
  deliverables: string[];
  roi: string;
  timeline: string;
}

const SECTOR_TEMPLATES: Record<Sector, SectorTemplate> = {
  beaute: {
    problemStatement: 'Votre établissement mérite une présence digitale qui reflète l\'excellence de vos soins et convert les visiteurs en clients fidèles. Entre la gestion des réservations, la mise en valeur de vos prestations et l\'acquisition de nouveaux clients en ligne, le digital devient votre meilleur assistant.',
    approach: [
      '**Audit & stratégie** (1 sem.) — Analyse de votre positionnement, de la concurrence locale et de votre présence en ligne actuelle',
      '**Design premium** (2 sem.) — Création d\'un univers visuel élégant qui met en valeur votre identité et vos prestations',
      '**Développement** (3-4 sem.) — Site vitrine ou e-commerce avec système de réservation en ligne intégré',
      '**Lancement & formation** (1 sem.) — Mise en ligne, référencement local et formation à la gestion autonome',
    ],
    deliverables: [
      'Site web responsive (mobile-first, 95+ score Google PageSpeed)',
      'Système de réservation en ligne (Calendly, BookSync ou sur-mesure)',
      'Galerie photos et portfolio prestations optimisé',
      'Fiche Google My Business optimisée + stratégie avis clients',
      'Charte graphique digitale (couleurs, typographies, assets)',
      'Formation de 2h pour gérer le contenu en autonomie',
    ],
    roi: 'Les établissements de beauté avec réservation en ligne constatent en moyenne +35% de prises de RDV et -2h/jour de gestion administrative.',
    timeline: '6-8 semaines',
  },
  resto: {
    problemStatement: 'Dans un secteur où 80% des clients consultent un restaurant en ligne avant de s\'y rendre, votre présence digitale est votre première salle à manger. Nous créons une expérience en ligne qui donne faim dès la première visite.',
    approach: [
      '**Discovery** (1 sem.) — Audit de votre présence actuelle, analyse des restaurants concurrents, définition du positionnement',
      '**Design & contenu** (2 sem.) — Direction artistique, shooting photo conseillé, rédaction des textes',
      '**Développement** (2-3 sem.) — Site avec menu dynamique, réservation en ligne et module commande à emporter',
      '**Référencement local** (1 sem.) — Google My Business, Tripadvisor, gestion des avis',
    ],
    deliverables: [
      'Site web avec menu interactif mis à jour facilement',
      'Module de réservation en ligne (The Fork ou sur-mesure)',
      'Intégration click & collect / livraison si pertinent',
      'Google My Business optimisé + stratégie avis',
      'Pack réseaux sociaux (templates Instagram, stories)',
    ],
    roi: 'Un restaurant bien référencé en ligne peut attirer 40% de nouveaux couverts supplémentaires sans coût publicitaire.',
    timeline: '5-7 semaines',
  },
  ecom: {
    problemStatement: 'Vous avez des produits de qualité — il faut maintenant une boutique en ligne qui convertit. Nous construisons une expérience d\'achat fluide, rapide et rassurante qui transforme vos visiteurs en acheteurs fidèles.',
    approach: [
      '**Stratégie e-commerce** (1 sem.) — Analyse du marché, choix de la plateforme (Shopify, WooCommerce, sur-mesure), tunnel de conversion',
      '**UX & Design** (2 sem.) — Maquettes optimisées conversion, fiches produits, pages catégories',
      '**Développement & intégrations** (4 sem.) — Boutique complète, paiement, logistique, emails automatisés',
      '**Lancement & SEO** (1 sem.) — Mise en ligne, référencement produits, configuration analytics',
    ],
    deliverables: [
      'Boutique en ligne complète avec catalogue produits',
      'Paiement sécurisé (Stripe, PayPal) + Apple/Google Pay',
      'Emails transactionnels et relances panier abandonné',
      'Dashboard analytics et suivi des performances',
      'Formation gestion des commandes et du stock',
    ],
    roi: 'Une boutique bien optimisée atteint en moyenne 2-4% de taux de conversion — soit 2 à 4 ventes pour 100 visiteurs.',
    timeline: '7-9 semaines',
  },
  immobilier: {
    problemStatement: 'L\'immobilier se joue désormais en ligne : 90% des acheteurs débutent leur recherche sur internet. Votre présence digitale doit inspirer confiance, mettre en valeur vos biens et générer des leads qualifiés 24h/24.',
    approach: [
      '**Audit & positionnement** (1 sem.) — Analyse concurrentielle, définition de votre proposition de valeur unique',
      '**Design & expérience** (2 sem.) — Site premium avec visuels immersifs, visites virtuelles, formulaires de contact optimisés',
      '**Développement** (3 sem.) — CMS biens, filtres de recherche avancés, alertes email pour prospects',
      '**Référencement & lancement** (1 sem.) — SEO local, annuaires professionnels, analytics',
    ],
    deliverables: [
      'Site agence avec catalogue de biens gérable en autonomie',
      'Module estimation en ligne (génération de leads)',
      'Intégration CRM ou module de gestion des contacts',
      'Fiches biens optimisées (photos, plans, diagnostics)',
      'Newsletter automatisée pour prospects',
    ],
    roi: 'Une agence immobilière avec site optimisé génère en moyenne 3x plus de contacts qualifiés qu\'une présence basique.',
    timeline: '6-8 semaines',
  },
  sante: {
    problemStatement: 'Vos patients vous cherchent en ligne avant même de décrocher leur téléphone. Une présence digitale professionnelle et rassurante permet d\'attirer de nouveaux patients tout en facilitant la gestion des rendez-vous.',
    approach: [
      '**Audit & conformité** (1 sem.) — Analyse de la présence actuelle, contraintes RGPD et secteur médical',
      '**Design professionnel** (2 sem.) — Site sobre et rassurant, optimisé mobile, accessibilité',
      '**Développement** (3 sem.) — Prise de rendez-vous en ligne, téléconsultation si besoin, formulaire contact sécurisé',
      '**Référencement local** (1 sem.) — Google My Business médical, annuaires santé (Doctolib, Medoucine)',
    ],
    deliverables: [
      'Site vitrine professionnel et rassurant (mobile-first)',
      'Module de prise de rendez-vous en ligne',
      'Pages prestations optimisées SEO local',
      'Fiche Google My Business et annuaires santé',
      'Formulaire contact RGPD-compliant',
    ],
    roi: 'Les praticiens avec réservation en ligne réduisent de 60% les appels pour rendez-vous et augmentent leur file active de nouveaux patients.',
    timeline: '5-7 semaines',
  },
  coach: {
    problemStatement: 'Votre expertise mérite une plateforme qui la met en valeur et génère des clients en continu. Nous créons un écosystème digital qui automatise votre acquisition tout en vous positionnant comme référence dans votre domaine.',
    approach: [
      '**Positionnement & funnel** (1 sem.) — Définition de votre persona, tunnel de conversion, offre digitale',
      '**Design & personal branding** (2 sem.) — Site qui vous ressemble, pages de vente, lead magnets',
      '**Développement** (3 sem.) — Site + espace membres si formation, intégration paiement, CRM simple',
      '**Lancement & visibilité** (1 sem.) — SEO, LinkedIn optimization, stratégie de contenu',
    ],
    deliverables: [
      'Site vitrine / personal branding premium',
      'Page de vente optimisée pour votre offre principale',
      'Lead magnet + séquence email automatisée',
      'Espace membres ou plateforme de formation (si pertinent)',
      'Kit réseaux sociaux LinkedIn + Instagram',
    ],
    roi: 'Un coach avec un funnel digital optimisé multiplie par 3 à 5 ses prises de contact sans démarchage actif.',
    timeline: '5-7 semaines',
  },
  artisan: {
    problemStatement: 'Votre travail parle pour vous — il faut juste que les bons clients puissent vous trouver et vous contacter facilement. Nous construisons une vitrine digitale qui génère des devis qualifiés depuis votre secteur géographique.',
    approach: [
      '**Audit local & référencement** (1 sem.) — Analyse de votre zone de chalandise, positionnement SEO local',
      '**Design & portfolio** (1-2 sem.) — Site mettant en valeur vos réalisations, vos témoignages et votre expertise',
      '**Développement** (2 sem.) — Site vitrine rapide, formulaire de devis en ligne, Google My Business',
      '**Lancement** (1 sem.) — Mise en ligne et référencement local immédiat',
    ],
    deliverables: [
      'Site vitrine mobile-first avec galerie de réalisations',
      'Formulaire de demande de devis en ligne',
      'Google My Business optimisé + avis clients',
      'Référencement SEO local (ville + métier)',
      'Intégration réseaux sociaux',
    ],
    roi: 'Les artisans avec un site optimisé localement reçoivent en moyenne 5 à 10 demandes de devis supplémentaires par mois.',
    timeline: '3-5 semaines',
  },
  web: {
    problemStatement: 'Vous avez une vision produit forte. Notre rôle est de la concrétiser avec la bonne architecture technique, une UX pensée pour vos utilisateurs et un déploiement solide pour tenir la charge.',
    approach: [
      '**Discovery technique** (1 sem.) — Spécifications fonctionnelles, choix de stack, architecture système',
      '**Design UX/UI** (2 sem.) — Wireframes, prototypes interactifs, design system',
      '**Développement itératif** (4-8 sem.) — Sprints de 2 semaines avec démos, tests continus',
      '**Déploiement & monitoring** (1 sem.) — CI/CD, monitoring, documentation technique',
    ],
    deliverables: [
      'Application web / SaaS complète et testée',
      'Design system documenté (Figma + Storybook)',
      'API documentée (Swagger/OpenAPI)',
      'Pipeline CI/CD et infrastructure cloud',
      'Documentation technique et guide d\'administration',
    ],
    roi: 'ROI calculé selon votre modèle économique — nous définissons ensemble les KPIs cibles dès la phase Discovery.',
    timeline: 'Selon périmètre — définie en Discovery',
  },
  default: {
    problemStatement: 'Vous cherchez à renforcer votre présence digitale et à activer de nouveaux leviers de croissance. AltCtrl.Lab vous accompagne de la stratégie à l\'exécution, avec une approche sur-mesure adaptée à votre secteur et vos objectifs.',
    approach: [
      '**Discovery** (1 sem.) — Audit complet, définition des objectifs et KPIs, roadmap priorisée',
      '**Design** (2 sem.) — UX research, maquettes validées, charte graphique digitale',
      '**Développement** (3-5 sem.) — Développement itératif avec points hebdomadaires',
      '**Lancement** (1 sem.) — Tests, déploiement, formation équipe',
    ],
    deliverables: [
      'Livrable principal défini en phase Discovery',
      'Documentation fonctionnelle et technique',
      'Formation à la gestion autonome',
      'Support post-lancement (30 jours)',
    ],
    roi: 'ROI et indicateurs de succès définis ensemble lors de la phase Discovery.',
    timeline: '6-9 semaines',
  },
};

function generateFallbackProposal(name: string, company: string, budget: string, timeline: string, _projectType: string, notes: string = ''): string {
  const sector = detectSector(company || name, notes);
  const tpl = SECTOR_TEMPLATES[sector];
  const clientName = company || name;
  const deliveryTimeline = timeline || tpl.timeline;

  return `## Proposition commerciale — ${clientName}

### 1. Compréhension de votre besoin
${tpl.problemStatement}

### 2. Notre approche
${tpl.approach.map((step, i) => `${i + 1}. ${step}`).join('\n')}

### 3. Livrables
${tpl.deliverables.map(d => `- ${d}`).join('\n')}

### 4. Timeline
Démarrage sous 2 semaines après signature. Livraison estimée : **${deliveryTimeline}**.

### 5. Investissement
${budget ? `Budget proposé : **${budget}**` : 'Investissement sur-mesure présenté après phase Discovery.'}
${tpl.roi}

### 6. Prochaines étapes
1. Call de découverte (30 min) — on affine ensemble le périmètre et les priorités
2. Proposition chiffrée détaillée sous 48h
3. Démarrage possible dans les 2 semaines suivant la signature

*— L'équipe AltCtrl.Lab*`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, name, company, budget, timeline, notes, projectType } = body;

    if (!name) return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 });

    // Fallback if API key missing
    if (!KIMI_API_KEY) {
      logger.warn('generate-proposal', 'KIMI_API_KEY missing, using fallback template', { leadId });
      const proposal = generateFallbackProposal(name, company, budget, timeline, projectType, notes);
      return NextResponse.json({ success: true, data: { proposal, leadId, fromTemplate: true } });
    }

    const prompt = `Tu es un expert en proposition commerciale pour une agence digitale.
Génère une proposition commerciale professionnelle et convaincante en français pour le prospect suivant.

**Prospect :**
- Nom : ${name}
- Entreprise : ${company || 'Non précisé'}
- Budget estimé : ${budget || 'Non précisé'}
- Timeline : ${timeline || 'Non précisé'}
- Type de projet : ${projectType || 'Développement web / Marketing Digital'}
- Notes / Contexte : ${notes || 'Aucun contexte supplémentaire'}

**Format de la proposition :**

## Proposition commerciale — ${company || name}

### 1. Compréhension de votre besoin
[2-3 phrases montrant que tu as compris leur problématique]

### 2. Notre approche
[Description de la méthodologie et des étapes clés]

### 3. Livrables
[Liste bullet des livrables concrets]

### 4. Timeline
[Calendrier réaliste basé sur les informations fournies]

### 5. Investissement
[Fourchette de prix justifiée, ROI estimé]

### 6. Prochaines étapes
[Call to action clair]

Sois concis, direct et orienté résultats. Évite le jargon inutile.`;

    try {
      const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIMI_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'kimi-k2.5',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        throw new Error(`Kimi API ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const proposal = data.choices?.[0]?.message?.content ?? '';

      if (!proposal) throw new Error('Empty response from Kimi');

      return NextResponse.json({ success: true, data: { proposal, leadId, fromTemplate: false } });
    } catch (apiErr) {
      // Fallback on API failure
      logger.error('generate-proposal', 'Kimi API failed, using fallback template', { leadId }, apiErr as Error);
      const proposal = generateFallbackProposal(name, company, budget, timeline, projectType, notes);
      return NextResponse.json({ success: true, data: { proposal, leadId, fromTemplate: true } });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
