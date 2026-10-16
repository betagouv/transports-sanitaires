// Le modèle factice : un questionnaire sans rapport avec le transport
// sanitaire, écrit dans le contrat `Model`. Les tests du socle tournent sur lui.

import {
  bindCerfa,
  type CerfaInput,
  defineModel,
  text,
} from "../../../../front/socle";
import type { Cibles } from "./declarations/cibles";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { cibles, faits, SANS_COMMANDE } from "./preconisation";
import { COMPLEMENT, PARTS } from "./questionnaire";
import { Commande, CommandeCompletee } from "./Resultats";

// Un gabarit fabriqué : le test relit ce qu'il dessine sans servir d'asset.
const BON_DE_COMMANDE = bindCerfa<
  {
    fields: { commande: string; quantite: string; date: string };
    drawings: Record<never, never>;
  },
  CerfaInput<Questions, Faits, Cibles>
>(
  {
    template: () =>
      import("../../cerfa/test-form").then((m) => m.bonDeCommande()),
    fileName: "bon-de-commande",
    fields: {
      commande: text("commande"),
      quantite: text("quantite"),
      date: text("date"),
    },
    drawings: {},
  },
  {
    fields: {
      commande: ({ cibles }) => cibles.commande,
      quantite: ({ answers }) => String(answers.quantite),
      date: ({ completedAt }) => completedAt.toISOString().slice(0, 10),
    },
    drawings: {},
  },
);

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
    form: ({ commande }) =>
      commande === SANS_COMMANDE ? null : BON_DE_COMMANDE,
    title: "Commande complétée",
    Resultat: CommandeCompletee,
    startLabel: ({ commande }) =>
      commande === SANS_COMMANDE ? null : "Compléter la commande",
    downloadLabel: "Télécharger le bon de commande",
  },
  seeds: () => import("./seeds-catalogue").then((m) => m.SEEDS),
});
