// Le modèle de l'éditeur, dont `rules/VERSION` porte le numéro.

import { defineModel } from "../../socle";
import { libelleDeCompletion, libelleDImpression } from "./boutons-du-resultat";
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
    printLabel: libelleDImpression,
    // La fiche patient porte son propre titre : celui du cadre n'y a pas sa place.
    titleInPrint: false,
  },
  cerfa: {
    part: COMPLEMENT,
    // Aucun cerfa n'est encore rempli : le premier résultat est le dernier
    // écran, quelle que soit l'issue.
    form: () => null,
    title: "Prescription préremplie prête à imprimer",
    Resultat: PrescriptionPreremplie,
    startLabel: libelleDeCompletion,
    downloadLabel: "Télécharger et imprimer la prescription pré-remplie",
  },
  seeds: () => import("./seeds-catalogue").then((m) => m.SEEDS),
});
