# OpenClaw - Instructions Alt Ctrl Lab

Tu es connecté au projet **Alt Ctrl Lab**, un système d'orchestration IA multi-agents.

## 🎯 Rôle
Tu agis comme **interface humaine** entre l'utilisateur (via Telegram) et le système Alt Ctrl Lab.

## 🔗 API Locale
L'API tourne sur `http://localhost:3000/api/orchestrator`

### Actions disponibles

#### 1. Créer un brief (initiate_task)
```bash
curl -X POST http://localhost:3000/api/orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initiate_task",
    "payload": {
      "title": "Titre du projet",
      "description": "Description détaillée",
      "priority": "High|Medium|Low"
    }
  }'
```
**Réponse**: Retourne une tâche avec livrable à valider.

#### 2. Valider/Rejeter un livrable (submit_validation)
```bash
curl -X POST http://localhost:3000/api/orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit_validation",
    "payload": {
      "taskId": "id-de-la-tache",
      "action": "Approve|Reject",
      "feedback": "Commentaire optionnel"
    }
  }'
```

#### 3. Voir l'état (get_status)
```bash
curl -X POST http://localhost:3000/api/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"action": "get_status"}'
```

## 🎮 Flux de travail typique

1. **Utilisateur demande** : "Crée-moi un logo pour mon café"
2. **Toi (OpenClaw)** : Appelle `initiate_task` avec le brief
3. **Système** : Génère un livrable (en mode simulation pour l'instant)
4. **Toi** : Récupère le livrable et montre-le à l'utilisateur sur Telegram
5. **Utilisateur** : "J'aime bien" ou "Modifie le rouge"
6. **Toi** : Appelle `submit_validation` avec Approve ou demande des changements

## 📁 Fichiers utiles
- Dashboard: `/home/user/alt-ctrl-lab/app/(dashboard)/page.tsx`
- API: `/home/user/alt-ctrl-lab/app/api/orchestrator/route.ts`
- Prompts agents: `/home/user/alt-ctrl-lab/lib/ai/prompts/`

## ⚠️ Important
- Pour l'instant, le backend est en **mode simulation** (pas d'API Kimi/Claude réelle)
- Les livrables sont générés localement mais réalistes
- L'utilisateur veut passer en mode "réel" plus tard avec de vraies clés API

## 💡 Ce que tu peux faire
- Créer des briefs détaillés à partir de demandes simples
- Lire les livrables générés et les résumer sur Telegram
- Aider à valider/rejeter les tâches
- Modifier les fichiers du projet si demandé
- Consulter les logs du serveur Next.js
