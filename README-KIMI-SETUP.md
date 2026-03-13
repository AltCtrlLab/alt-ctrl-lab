# 🚀 Configuration Kimi - Alt Ctrl Lab

Ce guide explique comment démarrer le cockpit Alt Ctrl Lab avec **Kimi/Moonshot AI** (sans clé Anthropic pour l'instant).

## ✅ État Actuel

- **Supervisor (Abdul Hakim)** : Utilise Kimi ✅
- **Workers** : Utilisent Kimi ✅
- **Clé configurée** : Ta clé Moonshot est déjà dans `.env.local`

## 🏃 Démarrage Rapide

### 1. Installer les dépendances

```bash
cd /home/user/alt-ctrl-lab
npm install
```

### 2. Lancer le serveur

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### 3. Tester l'orchestrateur

Dans un **autre terminal** :

```bash
# Test complet avec le brief "Midnight Commit"
npm run test:orchestrator
```

Ou test manuel avec curl :

```bash
curl -X POST http://localhost:3000/api/orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initiate_task",
    "payload": {
      "title": "Direction Artistique - Midnight Commit",
      "description": "Marque de café nootropique pour développeurs...",
      "priority": "High"
    }
  }'
```

## 🔧 Architecture Kimi

```
┌─────────────────┐
│   Ton Brief     │
└────────┬────────┘
         ▼
┌──────────────────────────┐
│  API /api/orchestrator   │
├──────────────────────────┤
│  Abdul Hakim (Supervisor)│
│  → Kimi API (Routing)    │
├──────────────────────────┤
│  Prompt Manager          │
│  → Assemble Core+Playbook│
├──────────────────────────┤
│  Worker (Musawwir/Matin/)│
│  → Kimi API (Exécution)  │
└──────────────────────────┘
         ▼
┌─────────────────┐
│   Livrable JSON │
│   (Validation)  │
└─────────────────┘
```

## 📊 Temps d'exécution estimés

Avec Kimi, les requêtes sont plus lentes qu'avec Claude :

- **Supervisor (analyse brief)** : 10-20 secondes
- **Worker (génération livrable)** : 30-60 secondes
- **Total** : 1-2 minutes par requête

## 🔄 Passage à Anthropic (quand tu veux)

Quand tu auras ta clé Anthropic :

1. Modifie `.env.local` :
```bash
# Décommente cette ligne
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Optionnel : garde Kimi pour les workers
WORKER_PROVIDER=anthropic  # ou kimi
```

2. Pour utiliser Claude pour tout (Supervisor + Workers) :
   - Le Supervisor utilisera automatiquement Claude si disponible
   - Règle `WORKER_PROVIDER=anthropic`

## 🐛 Dépannage

### Erreur "KIMI_API_KEY not configured"
```bash
# Vérifie que le fichier existe
cat .env.local | grep KIMI

# Si vide, recrée-le avec ta clé
echo "KIMI_API_KEY=sk-kimi-ISSysRo8AiytGXkuItkOUaAq0smRejEsqtgRxqCOr7QD5KK8PFWp12lt62zzBK86" > .env.local
```

### Timeout après 120 secondes
- C'est normal avec Kimi pour les gros livrables
- Le script est configuré à 180s, mais l'API Next.js a aussi un timeout
- Pour les tests, commence avec des briefs courts

### Rate limiting (429)
- Kimi a des limites de rate
- Attends quelques secondes entre les requêtes
- Vérifie ton quota sur platform.moonshot.cn

## 🎯 Prochaines étapes

1. **Lance le serveur** : `npm run dev`
2. **Test avec** : `npm run test:orchestrator`
3. **Observe le résultat** dans le terminal
4. **Quand tu as Anthropic**, update `.env.local`

## 📞 Vérification rapide

```bash
# Test de l'API status
curl http://localhost:3000/api/orchestrator

# Réponse attendue :
# {
#   "success": true,
#   "data": {
#     "status": "operational",
#     "supervisor": "online (Kimi)",
#     ...
#   }
# }
```

---

**Le système est prêt !** 🚀
Lance `npm run dev` puis `npm run test:orchestrator` pour voir tes agents en action.
