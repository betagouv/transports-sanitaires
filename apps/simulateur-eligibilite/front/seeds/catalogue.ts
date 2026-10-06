// Catalogue des situations de référence du simulateur.
//
// C'est la **source unique** : les tests métier rejouent ce catalogue et
// l'écran des seeds l'affiche (`Seeds.tsx`). Une situation ajoutée ici devient donc
// du même geste un cas de non-régression et un écran consultable.
//
// Il est vide : les situations de référence reviendront avec le modèle
// d'éligibilité qu'elles décrivent.

import type { Seed } from "./seed";

export const SEEDS: readonly Seed[] = [];
