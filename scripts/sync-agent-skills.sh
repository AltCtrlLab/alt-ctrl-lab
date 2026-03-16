#!/bin/bash
# sync-agent-skills.sh
# Synchronise les fichiers .skill.md du projet vers les COMPETENCES.md
# des agents OpenClaw dans WSL (~/.openclaw/agents/).
#
# Usage : bash scripts/sync-agent-skills.sh
#
# Doit être exécuté depuis la racine du projet, sur Windows avec WSL.

set -e

SKILLS_DIR="lib/agents/skills"
OPENCLAW_AGENTS_DIR="$HOME/.openclaw/agents"

echo "=== Sync Agent Skills → WSL COMPETENCES.md ==="

sync_skill() {
  local skill_file="$1"     # ex: lib/agents/skills/ig-director.skill.md
  local agent_id="$2"       # ex: fatah

  if [ ! -f "$skill_file" ]; then
    echo "  ⚠️  $skill_file non trouvé — skip"
    return
  fi

  local agent_dir="$OPENCLAW_AGENTS_DIR/$agent_id"
  mkdir -p "$agent_dir"

  cp "$skill_file" "$agent_dir/COMPETENCES.md"
  echo "  ✅ $agent_id ← $skill_file"
}

# ── Mapping skill → agent OpenClaw ──────────────────────────────────────────
# Format : sync_skill [fichier .skill.md] [agent_id]
sync_skill "$SKILLS_DIR/ig-director.skill.md"  "fatah"

echo ""
echo "=== Sync terminé ==="
echo ""
echo "Pour vérifier :"
echo "  cat ~/.openclaw/agents/fatah/COMPETENCES.md"
