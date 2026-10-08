// Le modèle que l'app déroule : la version livrée par l'éditeur, dont
// `rules/VERSION` porte le numéro. `Main` le charge à la demande et le passe au
// socle.

import { defineModel } from "../socle";
import type { Cibles } from "./declarations/cibles";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { cibles } from "./evaluation-des-regles";
import { faits } from "./preconisation";
import { COMPLEMENT, PARTS } from "./questionnaire";
import { Eligibilite, PrescriptionPreremplie } from "./Resultats";

export const model = defineModel<Questions, Faits, Cibles>({
  preconisation: { faits, cibles },
  transportAndEligibility: {
    parts: PARTS,
    title: "Résultat de l’éligibilité",
    Resultat: Eligibilite,
    printLabel: "Imprimer la fiche patient",
  },
  cerfa: {
    part: COMPLEMENT,
    // Aucun cerfa n'est encore rempli : le premier résultat est le dernier
    // écran, quelle que soit l'issue.
    form: () => null,
    title: "Prescription préremplie prête à imprimer",
    Resultat: PrescriptionPreremplie,
    startLabel: "Compléter la prescription",
    downloadLabel: "Télécharger et imprimer la prescription pré-remplie",
  },
  seeds: () => import("./seeds-catalogue").then((m) => m.SEEDS),
});
