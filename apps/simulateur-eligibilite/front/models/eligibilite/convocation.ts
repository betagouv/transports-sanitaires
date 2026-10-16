// La convocation : quand Q2.10 se pose, et le fait que sa page établit (D-108).
//
// Le fait suit `CONTRAT_REPONSES_FAITS.json` et `CONTRAT_NEGATIONS_PROUVEES.json`
// du paquet de l'éditeur. Une catégorie vérifiée donne « oui ». Une catégorie
// négative vérifiée donne « non ». Une condition impossible à vérifier laisse le
// fait absent : la règle `cible_convocation_inconnue_decisive` envoie alors à la
// caisse. Ces fonctions ne lisent que les questions validées.

import type { Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";

type Valides = Validated<Questions>;

/**
 * Une convocation est-elle annoncée, par Q2.1 ou par Q2.2.1.b ? Q2.10 se pose
 * alors. Sans l'une ni l'autre, elle ne se pose pas : la convocation proposée
 * et écartée en Q2.2.1 vaut déjà « non » (contextes).
 */
export function convocationAnnoncee(validated: Valides): boolean {
  return (
    validated["Q2.1"]?.answer === "12_CONVOCATION" ||
    (validated["Q2.2.1.b"]?.answer?.includes("13_CONVOCATION") ?? false)
  );
}

/**
 * Le fait que la page de la convocation établit. Sans Q2.10 validée, le fait
 * reste comme il était : le « À qualifier dans sa branche » des contextes.
 */
export function faitsDeLaConvocation(validated: Valides): Partial<Faits> {
  const categorie = validated["Q2.10"]?.answer;
  if (categorie === undefined) return {};
  return { fait_convocation: faitDeLaCategorie(validated, categorie) };
}

// ---- implémentation ----

// Les trois appareillages que vise R.322-10 2°.
const APPAREILLAGES_VISES: readonly string[] = [
  "1_PROTHESE_OCULAIRE_FACIALE",
  "2_PODO_ORTHESE",
  "3_ORTHOPROTHESE",
];

function oui(provenance: string): Fait {
  return { value: true, provenance };
}

function non(provenance: string): Fait {
  return { value: false, provenance };
}

function absent(provenance: string): Fait {
  return { provenance };
}

function faitDeLaCategorie(
  validated: Valides,
  categorie: Questions["Q2.10"],
): Fait {
  switch (categorie) {
    case "6_APPAREILLAGE":
      return faitDeLAppareillage(validated);
    case "7_AUCUNE":
      return faitSansCategorie(validated);
    default:
      return oui(`Q2.10 : « ${categorie} ».`);
  }
}

// « Aucune de ces situations » ne donne jamais de positif. Après Q2.1 = 12,
// elle contredit le motif : le fait reste absent, la caisse tranche. Après
// Q2.2.1.b seule, la convocation signalée ne se confirme pas.
function faitSansCategorie(validated: Valides): Fait {
  if (validated["Q2.1"]?.answer === "12_CONVOCATION") {
    return absent(
      "Q2.10 : « 7_AUCUNE », alors que Q2.1 annonçait une convocation (« 12_CONVOCATION »).",
    );
  }
  return non(
    "Q2.10 : « 7_AUCUNE », alors que Q2.2.1.b annonçait une convocation.",
  );
}

// Un « oui » exige l'agrément et un appareillage visé. Un « non » à l'agrément
// ou un autre appareillage écarte ce seul motif. Sinon, une réponse « je ne
// peux pas » sans rien de négatif laisse le fait absent.
function faitDeLAppareillage(validated: Valides): Fait {
  const agrement = validated["Q2.10.a"]?.answer;
  const appareillage = validated["Q2.10.b"]?.answer;
  if (agrement === "2_NON") {
    return non(
      "Q2.10.a : « 2_NON » ; le fournisseur n'est pas agréé, ce motif ne s'applique pas.",
    );
  }
  if (appareillage === "4_AUTRE") {
    return non(
      "Q2.10.b : « 4_AUTRE » ; hors des trois appareillages visés par R.322-10 2°, ce motif ne s'applique pas.",
    );
  }
  if (
    agrement === "1_OUI" &&
    appareillage !== undefined &&
    APPAREILLAGES_VISES.includes(appareillage)
  ) {
    return oui(`Q2.10.a : « 1_OUI » ; Q2.10.b : « ${appareillage} ».`);
  }
  return absent(
    "Q2.10 : « 6_APPAREILLAGE » ; l'agrément ou l'appareillage ne peut pas se vérifier ou se préciser. À vérifier.",
  );
}
