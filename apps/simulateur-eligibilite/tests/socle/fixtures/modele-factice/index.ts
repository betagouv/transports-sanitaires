// Le modèle factice : un questionnaire sans rapport avec le transport
// sanitaire, écrit dans le contrat `Model`. Les tests du socle tournent sur lui.

import { defineModel } from "../../../../front/socle";
import { textFrom } from "../../../../front/socle/cerfa/field-mapping";
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
    printLabel: "Imprimer la commande",
  },
  cerfa: {
    part: COMPLEMENT,
    // Sans boisson, il n'y a rien à compléter : le premier résultat est le
    // dernier écran.
    form: ({ commande }) =>
      commande === SANS_COMMANDE
        ? null
        : {
            template: "bon-de-commande.pdf",
            mapping: {
              commande: textFrom(({ cibles }) => cibles.commande),
              quantite: textFrom(({ answers }) => String(answers.quantite)),
            },
          },
    title: "Commande complétée",
    Resultat: CommandeCompletee,
    startLabel: "Compléter la commande",
    downloadLabel: "Télécharger le bon de commande",
  },
  seeds: () => import("./seeds-catalogue").then((m) => m.SEEDS),
});
