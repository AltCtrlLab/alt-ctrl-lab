# 🎨 Frontend Alt Ctrl Lab - Documentation

## Architecture Frontend

### Structure des Composants

```
components/
├── ui/                    # Composants de base réutilisables
│   ├── Button.tsx        # Boutons avec variants (primary, secondary, ghost, danger, premium)
│   ├── Card.tsx          # Cards avec header, content, footer
│   ├── Badge.tsx         # Badges statut (success, warning, danger, info, premium)
│   ├── Input.tsx         # Input text avec icônes
│   ├── Textarea.tsx      # Textarea multi-lignes
│   └── ProgressBar.tsx   # Barres de progression (linéaire et circulaire)
│
├── gamification/         # Système de gamification
│   ├── XPBar.tsx         # Barre d'XP avec niveaux
│   ├── BadgeShowcase.tsx # Grille de badges débloqués
│   ├── DailyStreak.tsx   # Streak quotidien avec calendrier visuel
│   └── StatsOverview.tsx # Stats globales (4 cards)
│
├── dashboard/            # Composants du cockpit
│   ├── Header.tsx        # Header avec XP bar et notifications
│   ├── Sidebar.tsx       # Navigation latérale rétractable
│   ├── BriefCreator.tsx  # Formulaire de création de brief
│   ├── ValidationFeed.tsx # Feed de validation avec actions
│   ├── AgentStatus.tsx   # Dashboard des 5 agents
│   └── ProjectTimeline.tsx # Timeline des projets passés
│
lib/design-system/
└── tokens.ts            # Design tokens (colors, spacing, shadows, XP system)
```

## 🎮 Système de Gamification

### Niveaux d'Agence

| Niveau | Titre | XP Requis | Couleur |
|--------|-------|-----------|---------|
| 1 | Freelance Junior | 0 | Gris |
| 2 | Freelance Confirmé | 500 | Cyan |
| 3 | Studio Local | 1 500 | Bleu |
| 4 | Studio Régional | 3 500 | Violet |
| 5 | Agence National | 7 000 | Rose |
| 6 | Agence International | 12 000 | Ambre |
| 7 | Alt Ctrl Lab Elite | 20 000 | Émeraude |

### Badges Débloquables

- **Speed Demon** : 5 tâches en une journée
- **Quality Guru** : 10 validations d'affilée
- **Night Owl** : Travailler après 22h
- **Early Bird** : Première tâche avant 8h
- **Streak Master** : 7 jours de suite
- **Brief King** : 20 briefs créés

## 🎨 Design System

### Couleurs

- **Background** : zinc-950 (#09090b)
- **Cards** : zinc-900 (#18181b)
- **Text Primary** : zinc-50 (#fafafa)
- **Text Secondary** : zinc-400 (#a1a1aa)
- **Accent Cyan** : cyan-500 (#06b6d4) - Actions principales
- **Accent Amber** : amber-500 (#f59e0b) - XP/Gamification
- **Accent Emerald** : emerald-500 (#10b981) - Success
- **Accent Rose** : rose-500 (#f43f5e) - Error

### Agents Colors

- **Hakim** (Supervisor) : Blue (#3b82f6)
- **Musawwir** (Design) : Pink (#ec4899)
- **Matin** (Dev) : Emerald (#10b981)
- **Fatah** (Marketing) : Amber (#f59e0b)
- **Hasib** (Data) : Violet (#8b5cf6)

## 📱 Pages Disponibles

| Route | Description |
|-------|-------------|
| `/` | Dashboard principal avec Validation Feed |
| `/brief` | Création d'un nouveau brief |
| `/branding` | Interface Abdul Musawwir (Design) |
| `/web-dev` | Interface Abdul Matin (Dev) |
| `/marketing` | Interface Abdul Fatah (Marketing) |
| `/automations` | Interface Abdul Hasib (Data) |
| `/history` | Historique des projets |

## ✨ Features UX

### Animations
- Fade-in sur les cards
- Hover effects sur boutons et cards
- Glow effects pour les éléments actifs
- Transitions fluides sidebar

### Interactions
- Sidebar rétractable (16px ↔ 256px)
- Cards expandables dans ValidationFeed
- Formulaire avec focus states
- Toast notifications prêtes

### Responsive
- Mobile: Sidebar cachée, layout stacké
- Tablet: Sidebar rétractable
- Desktop: Full layout avec sidebar fixe

## 🚀 Lancer le Frontend

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Ouvrir http://localhost:3000
```

## 📝 Utilisation des Composants

### Button
```tsx
<Button variant="primary" size="lg" glow>
  Envoyer aux Agents
</Button>
```

### Card
```tsx
<Card variant="elevated" hover>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
  </CardHeader>
  <CardContent>Contenu</CardContent>
</Card>
```

### XP Bar
```tsx
<XPBar currentXP={2450} streak={5} />
```

### Brief Creator
```tsx
<BriefCreator 
  onSubmit={(brief) => console.log(brief)}
  isLoading={false}
/>
```

---

**Cockpit prêt à l'emploi !** 🚀
