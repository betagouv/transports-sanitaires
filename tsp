#!/bin/sh
# tsp : le lanceur de la CLI du dépôt. Ne demande qu'un shell et git.
# Le mode d'emploi est dans apps/cli/README.md.
set -eu

# Le clone du répertoire courant, pour qu'un worktree exécute sa propre CLI.
# Hors de tout clone, celui d'où le lanceur a été installé.
racine=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ ! -f "$racine/apps/cli/src/main.ts" ]; then
  racine=$(dirname "$(readlink -f "$0")")
fi

# Node n'existe pas encore sur une machine neuve : `setup` commence en shell,
# par mise et le toolchain qu'il épingle.
if [ "${1:-}" = "setup" ]; then
  sh "$racine/apps/cli/amorce.sh" "$racine" "$@"
fi

mise=$(command -v mise || echo "$HOME/.local/bin/mise")
if [ ! -x "$mise" ]; then
  echo "mise est absent. Lance : ./tsp setup" >&2
  exit 1
fi

exec "$mise" exec -C "$racine" -- node "$racine/apps/cli/src/main.ts" "$@"
