// Un document tiré d'un cas du livrable, lu champ par champ par son id du
// mapping, comme `field()` de la campagne v9.7.3 de l'éditeur. Partagé par
// les deux fichiers `campagne-documents-*-v9-7-3.test.ts`.
//
// La lecture passe par notre transcription (`depuisLeMapping`) : c'est elle
// que le Cerfa remplit. Une case cochée se lit `true`, une ligne d'adresse
// choisie se lit par son texte, un champ vierge se lit `""`.

import { expect } from "vitest";
import { depuisLeMapping } from "../../front/outils-produit/beta/cerfa/mapping";
import { reponsesDe } from "../../front/outils-produit/beta/cerfa/reponses";
import { moteur, texte } from "../../front/simulateur/moteur";
import {
  casesParId,
  type Rubrique,
} from "../../front/simulateur/secretariat/case-de-formulaire";
import { RUBRIQUES_DAP } from "../../front/simulateur/secretariat/rubriques/rubriques-de-la-dap";
import { RUBRIQUES_PMT } from "../../front/simulateur/secretariat/rubriques/rubriques-du-pmt";
import { RUBRIQUES_S3141 } from "../../front/simulateur/secretariat/rubriques/rubriques-du-s3141";
import { type OptionsDuLivrable, situationDuLivrable } from "./livrable-v9-7-3";

export const SORTIE: OptionsDuLivrable = {
  reason: "Sortie d’hospitalisation",
  depart: "Structure de soins",
  arrival: "Domicile",
  criterion: "p1_critere_brancardage_portage",
};
export const ENTREE: OptionsDuLivrable = {
  reason: "Entrée en hospitalisation",
};
export const DAP: OptionsDuLivrable = { ...ENTREE, distance: 2 };
export const PERMISSION: OptionsDuLivrable = {
  reason: "Permission temporaire de sortie",
};
export const BRANCARDAGE =
  "Nécessite un brancardage ou un portage, c’est-à-dire que le patient doit être soulevé et transporté par des professionnels, y compris sur une courte distance.";

/** L'instant de référence de la campagne. */
export const INSTANT = { instant: "2026-09-21T10:00:00Z" };

/** Le document du cas, après avoir vérifié que le cas final l'ouvre bien. */
export function documentDe(options: OptionsDuLivrable, type: keyof typeof CAS) {
  const [casFinal, rubriques] = CAS[type];
  const situation = situationDuLivrable({ ...INSTANT, ...options });
  const positionne = moteur.setSituation(situation);
  expect(texte(positionne, "cible_cas_final")).toBe(casFinal);
  const reponses = reponsesDe(positionne, situation);
  const ids = casesParId(rubriques);
  return {
    moteur: positionne,
    existe: (id: string) => ids.has(id),
    lire: (id: string): string | boolean => {
      const valeur = depuisLeMapping(rubriques, id)(reponses);
      if (!valeur) return "";
      if ("coché" in valeur) return true;
      if ("texte" in valeur) return valeur.texte;
      if ("texteMédical" in valeur) return valeur.texteMédical;
      return "";
    },
  };
}

type Document = ReturnType<typeof documentDe>;

/** Des cases cochées, ou des lignes d'adresse choisies. */
export function coches(document: Document, ...ids: string[]) {
  for (const id of ids)
    expect(Boolean(document.lire(id)), `${id} coché`).toBe(true);
}

export function decoches(document: Document, ...ids: string[]) {
  for (const id of ids)
    expect(Boolean(document.lire(id)), `${id} décoché`).toBe(false);
}

// ---- implémentation ----

const CAS: Record<"PMT" | "DAP" | "S3141", [string, readonly Rubrique[]]> = {
  PMT: ["prescription médicale de transport", RUBRIQUES_PMT],
  DAP: ["demande d’accord préalable", RUBRIQUES_DAP],
  S3141: ["prescription S3141", RUBRIQUES_S3141],
};
