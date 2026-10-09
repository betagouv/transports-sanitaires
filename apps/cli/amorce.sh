#!/bin/sh
# L'amorce de `tsp setup` : ce qu'il faut pour que Node existe. mise d'abord,
# puis le toolchain que mise.toml épingle. La suite de `setup` est en
# TypeScript, dans src/setup.ts.
#
# Usage : amorce.sh <racine du clone> [arguments de tsp]
set -eu

racine=$1
shift

oui=non
for argument in "$@"; do
  case "$argument" in --yes | -y) oui=oui ;; esac
done

installateur="curl -fsSL https://mise.run | sh"
mise=$(command -v mise || echo "$HOME/.local/bin/mise")

if [ ! -x "$mise" ]; then
  echo "mise est absent. Il installe Node, pnpm et gh aux versions du dépôt."
  if [ "$oui" != oui ]; then
    printf "L'installer par son script officiel (%s) ? [o/N] " "$installateur"
    read -r reponse || reponse=""
    case "$reponse" in
      o | O | oui | y | Y | yes) ;;
      *)
        echo
        echo "Rien n'est installé. Pour le faire toi-même : $installateur"
        exit 1
        ;;
    esac
  fi
  curl -fsSL https://mise.run | sh
  mise="$HOME/.local/bin/mise"
fi

echo "Toolchain : mise install"
"$mise" trust --quiet "$racine/mise.toml"
"$mise" install -C "$racine"
