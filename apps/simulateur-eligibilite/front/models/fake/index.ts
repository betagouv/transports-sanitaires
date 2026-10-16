// Le modèle de démonstration : un questionnaire sans rapport avec le transport
// sanitaire, où chaque capacité du socle se voit à l'écran. `main.tsx` le passe au
// socle.

import { defineModel } from "../../socle";
import { bonDeCommande } from "./bon-de-commande";
import type { Cibles } from "./declarations/cibles";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { cibles, faits, SANS_COMMANDE } from "./preconisation";
import { COMPLEMENT, PARTS } from "./questionnaire";
import { Commande, CommandeCompletee } from "./Resultats";

export const model = defineModel<Questions, Faits, Cibles>({
  preconisation: { faits, cibles },
  transportAndEligibility: {
    parts: PARTS,
    title: "Résultat",
    Resultat: Commande,
    printLabel: () => "Imprimer la commande",
  },
  cerfa: {
    part: COMPLEMENT,
    // Sans boisson, il n'y a rien à compléter : le premier résultat est le
    // dernier écran.
    form: ({ commande }) => (commande === SANS_COMMANDE ? null : bonDeCommande),
    title: "Commande complétée",
    Resultat: CommandeCompletee,
    startLabel: ({ commande }) =>
      commande === SANS_COMMANDE ? null : "Compléter la commande",
    downloadLabel: "Télécharger et imprimer le bon de commande",
  },
  seeds: () => import("./seeds-catalogue").then((m) => m.SEEDS),
});
