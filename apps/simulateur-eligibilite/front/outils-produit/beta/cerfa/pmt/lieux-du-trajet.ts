// Les lieux de départ et d'arrivée du CERFA, composés depuis la Partie 2.
//
// Le formulaire demande, pour chaque extrémité du trajet, soit une case
// « domicile », soit une ligne libre nommant la structure de soins ou l'autre
// lieu. La v9.1 ayant ajouté douze saisies d'adresse (D1-D12), cette ligne est
// désormais entièrement déductible — c'est le seul endroit du module où une
// valeur écrite sur le formulaire vient d'un texte tapé par l'utilisateur.

import type { CleDeRegle } from "../../../../simulateur/contrat-regles-publicodes.ts";
import { TRAJET } from "./champs-cerfa.ts";
import type { Saisie } from "./remplir-cerfa.ts";

/** Un domicile se coche ; une structure de soins ou un autre lieu se nomment. */
export function saisiesLieux(valeur: LectureDeRegle): Saisie[] {
  const départ = valeur("p2_trajet_depart");
  const arrivée = valeur("p2_trajet_arrivee");
  return [
    ...(départ === "Domicile" ? [{ case: TRAJET.départDomicile }] : []),
    ...lieuDétaillé(départ, LIEUX_DÉPART, adresseDépart(valeur)),
    ...(arrivée === "Un domicile différent du lieu de départ."
      ? [{ case: TRAJET.arrivéeDomicile }]
      : []),
    ...lieuDétaillé(arrivée, LIEUX_ARRIVÉE, adresseArrivée(valeur)),
  ];
}

// ---- implémentation ----

type LectureDeRegle = (règle: CleDeRegle) => unknown;

function lieuDétaillé(
  type: unknown,
  champs: Record<string, string>,
  adresse: string,
): Saisie[] {
  const champ = typeof type === "string" ? champs[type] : undefined;
  if (!champ || adresse === "") return [];
  return [{ champ, texte: adresse }];
}

function adresseDépart(valeur: LectureDeRegle): string {
  return surUneLigne([
    valeur("p2_depart_nom_lieu"),
    valeur("p2_depart_adresse"),
    valeur("p2_depart_complement_adresse"),
    valeur("p2_depart_code_postal"),
    valeur("p2_depart_commune"),
    valeur("p2_depart_pays"),
  ]);
}

function adresseArrivée(valeur: LectureDeRegle): string {
  return surUneLigne([
    valeur("p2_arrivee_nom_lieu"),
    valeur("p2_arrivee_adresse"),
    valeur("p2_arrivee_complement_adresse"),
    valeur("p2_arrivee_code_postal"),
    valeur("p2_arrivee_commune"),
    valeur("p2_arrivee_pays"),
  ]);
}

// Le formulaire n'offre qu'une ligne par lieu : les six saisies y sont aplaties,
// séparées par des virgules. Les vides (complément, pays en France) disparaissent
// d'elles-mêmes.
function surUneLigne(morceaux: unknown[]): string {
  return morceaux
    .map((m) => (typeof m === "string" ? m.trim() : ""))
    .filter((m) => m !== "")
    .join(", ");
}

const LIEUX_DÉPART: Record<string, string> = {
  "Structure de soins": TRAJET.départStructureSoins,
  "Autre lieu": TRAJET.départAutreLieu,
};

const LIEUX_ARRIVÉE: Record<string, string> = {
  "Une structure de soins différente du lieu de départ.":
    TRAJET.arrivéeStructureSoins,
  "Un autre lieu différent du lieu de départ.": TRAJET.arrivéeAutreLieu,
};
