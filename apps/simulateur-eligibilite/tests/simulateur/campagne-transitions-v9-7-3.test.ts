// La campagne v9.7.3 de l'éditeur sur les modifications après coup
// (`transitions.mjs`), rejouée au moteur sous ses identifiants `TR-*`.
//
// L'oracle est celui de l'éditeur : modifier une réponse d'une simulation
// finie doit donner la même décision, et les mêmes données imprimables,
// qu'une simulation neuve. Il se rejoue ici sur ce que fait notre
// application, et non sur la session de l'éditeur :
// - la réponse modifiée remplace l'ancienne ;
// - toute réponse réellement modifiée efface les réponses en aval
//   (`aval-invalide.ts`, TS973-16) ;
// - un lieu déduit qui change efface le type et l'adresse répondus
//   (`invalidation-lieu.ts`) ;
// - les réponses devenues manquantes sont reprises de la simulation visée,
//   comme un prescripteur qui répond aux pages reposées.
//
// Non transposé :
// - la liste `cleared` de l'éditeur, qui vérifie l'effacement effectif de
//   réponses devenues inutiles. L'oracle vérifie la décision, pas la liste ;
// - la barrière (`resultBlocked`) : notre résultat se recalcule à chaque
//   saisie, il n'y a pas d'ancien résultat à bloquer ;
// - `TR-MEDICAL-*` : la reprise médicale (`restartMedical()`) n'est pas
//   construite, cf. ticket 08.

import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import type { Cible } from "../../front/simulateur/contrat-regles-publicodes";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur, texte } from "../../front/simulateur/moteur";
import {
  champsEnAval,
  ETAPES,
} from "../../front/simulateur/questionnaire/etapes";
import { avecLieuInvalide } from "../../front/simulateur/questionnaire/invalidation-lieu";
import { type OptionsDuLivrable, situationDuLivrable } from "./livrable-v9-7-3";
import { TRANSITIONS } from "./transitions-du-livrable-v9-7-3";

describe("TR, une modification après coup vaut une simulation neuve", () => {
  it.each(
    TRANSITIONS.map((transition) => [transition.id, transition] as const),
  )("%s", (_id, { from = {}, to = {}, step }) => {
    const initiale = situationDuLivrable({ ...BASE, ...from });
    const visee = situationDuLivrable({ ...BASE, ...from, ...to });
    expect(decision(apresModification(initiale, visee, step))).toEqual(
      decision(visee),
    );
  });
});

// ---- implémentation ----

const BASE: OptionsDuLivrable = {
  reason: "Examen médical",
  criterion: "p1_critere_brancardage_portage",
};

const INSTANT = new Date("2026-09-08T10:00:00Z");

// Ce que la campagne compare (`sem()`) : la décision et les données imprimables.
const CIBLES: readonly Cible[] = [
  "cible_cas_final",
  "cible_resultat_2_affichable",
  "cible_document_a_remettre_au_patient",
  "cible_transport_sanitaire_prescrit",
  "cible_regime_financement",
  "cible_attente_accord_prealable_requise",
  "cible_urgence_attestee",
  "cible_nombre_transports_document",
  "cible_lieu_depart_type",
  "cible_lieu_arrivee_type",
];

// Ce que devient la situation initiale quand le prescripteur modifie `step`,
// avec les nettoyages de l'application, puis répond aux pages reposées avec
// les réponses visées.
function apresModification(
  initiale: Situation<string>,
  visee: Situation<string>,
  step: string,
): Situation<string> {
  const champs = ETAPES.find((etape) => etape.id === step)?.champs ?? [];
  let modifiee: Situation<string> = { ...initiale };
  const change = champs.some(
    (champ) =>
      initiale[champ] !== undefined && initiale[champ] !== visee[champ],
  );
  for (const champ of champs) {
    const valeur = visee[champ];
    if (valeur === undefined) delete modifiee[champ];
    else modifiee[champ] = valeur;
  }
  if (change)
    for (const champ of champsEnAval(champs[0] ?? step)) delete modifiee[champ];
  const calculee = avecEntreesCalculees(modifiee, INSTANT);
  modifiee = avecLieuInvalide(
    moteur.setSituation(calculee),
    calculee,
    avecEntreesCalculees(initiale, INSTANT),
  );
  for (const [cle, valeur] of Object.entries(visee))
    if (modifiee[cle] === undefined) modifiee[cle] = valeur;
  return avecEntreesCalculees(modifiee, INSTANT);
}

function decision(situation: Situation<string>) {
  const positionne = moteur.setSituation(situation);
  return Object.fromEntries(
    CIBLES.map((cible) => [cible, texte(positionne, cible)]),
  );
}
