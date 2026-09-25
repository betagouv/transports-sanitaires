// Un cas de la campagne `routes.mjs` de l'éditeur, rejoué au moteur, et ce
// que ses deux fichiers de test en vérifient. Partagé par
// `campagne-routes-lieux.test.ts` et
// `campagne-routes-exceptions.test.ts`.

import type { Situation } from "publicodes";
import { expect } from "vitest";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { lieuEffectif } from "../../front/simulateur/lieu-effectif";
import { texte } from "../../front/simulateur/moteur";
import { type OptionsDuLivrable, situationDuLivrable } from "./livrable";
import { moteurDeTest } from "./moteur";

export const [
  CONSULT,
  EXAM,
  CARE,
  ENTRY,
  EXIT,
  TRANSFER,
  ER,
  PERMISSION,
  OTHER,
] = [
  "Consultation médicale",
  "Examen médical",
  "Soin ou traitement autre qu’une séance de chimiothérapie, de radiothérapie ou de dialyse",
  "Entrée en hospitalisation",
  "Sortie d’hospitalisation",
  "Transfert d’un patient hospitalisé vers un autre établissement de santé",
  "Transport vers un service d’urgences",
  "Permission temporaire de sortie",
  "Autre examen ou soin",
] as const;
export const RAISONS = [
  CONSULT,
  EXAM,
  CARE,
  ENTRY,
  EXIT,
  TRANSFER,
  ER,
  PERMISSION,
  OTHER,
];
export const PMT = "prescription médicale de transport";
export const ETABLISSEMENT = "transport à la charge de l’établissement";
export const S3141 = "prescription S3141";
export const STRUCTURE = "Structure de soins";

const INSTANT = new Date("2026-09-08T10:00:00Z");

export type Moteur = ReturnType<typeof moteurDeTest>;

// `optionsFor` de la campagne : l'ambulance médicalement justifiée, et un
// trajet par défaut cohérent avec la raison.
//
// Un lieu déduit n'a pas de question dans le parcours, donc pas de réponse :
// celle que les options du livrable lui donnent est retirée. Laissée, elle
// passerait pour une réponse restée en arrière-plan, que la garde du ticket 4
// refuse à dessein (`entrees-calculees.ts`). La campagne de l'éditeur, qui ne
// la soumet jamais, conclut (`refusedOrDeduced`, `urgencyDestinationCoherent`).
export function pour(raison: string, plus: OptionsDuLivrable = {}): Moteur {
  const depuisUneStructure = (
    [EXIT, TRANSFER, PERMISSION] as string[]
  ).includes(raison);
  const versLeDomicile = ([EXIT, PERMISSION] as string[]).includes(raison);
  const situation = situationDuLivrable({
    reason: raison,
    criterion: "p1_critere_brancardage_portage",
    depart: depuisUneStructure ? STRUCTURE : "Domicile",
    arrival: versLeDomicile ? "Domicile" : STRUCTURE,
    ...plus,
  });
  const parcourue: Situation<string> = { ...situation };
  if (lieuEffectif(situation, "depart").deduit)
    delete parcourue.p2_trajet_depart;
  if (lieuEffectif(situation, "arrivee").deduit)
    delete parcourue.p2_trajet_arrivee;
  return moteurDeTest(avecEntreesCalculees(parcourue, INSTANT));
}

export function casFinal(moteur: Moteur): string {
  return texte(moteur, "cible_cas_final");
}

// Bloqué par une garde, et non faute d'une réponse : rien ne manque.
export function estRefuse(moteur: Moteur) {
  const resultat = moteur.evaluate("cible_resultat_2_affichable");
  expect(resultat.nodeValue).toBe(false);
  expect(Object.keys(resultat.missingVariables)).toEqual([]);
}

export function aboutitEntre(moteur: Moteur, depart: string, arrivee: string) {
  expect(casFinal(moteur)).toBe(PMT);
  expect(texte(moteur, "cible_lieu_depart_type")).toBe(depart);
  expect(texte(moteur, "cible_lieu_arrivee_type")).toBe(arrivee);
}
