// Une case d'un Cerfa, et la règle du modèle qui la décide.
//
// La v9.7 livre un quatrième YAML, `transports-sanitaires.documents.v9-7-0.yaml`
// (`kind: semantic_document_mapping`). Pour chacune des zones des trois
// formulaires — PMT S3138g, DAP S3139h, S3141 — il nomme la règle qui la
// remplit, la condition qui la fait exister et la façon de la rendre. C'est la
// première fois que le livrable dit ce qui se coche : jusqu'ici l'application le
// dérivait elle-même des critères médicaux et du libellé du mode, et se
// trompait — une position allongée se listait sans ambulance, un TPMR ne cochait
// pas le transport assis professionnalisé.
//
// Le paquet ne fournit pas de moteur de rendu PDF
// (`graphic_pdf_renderer_included: false`) : le pré-remplissage est un geste à
// part. Ce que la correspondance permet déjà, c'est de lister au prescripteur
// exactement les cases que sa simulation a tranchées, et de rougir le jour où le
// modèle cesse d'en décider une.
//
// Ce fichier porte la forme d'une case et sa lecture ; `rubriques-communes.ts` et
// `rubriques-des-cerfa.ts` en portent la recopie.

import type { CleDeRegle } from "../contrat-regles-publicodes";
import { faux, type moteur, texte, vrai } from "../moteur";

/**
 * Le `when` du livrable, dans les trois formes qu'il emploie : une conjonction,
 * une disjonction, ou l'appartenance d'une valeur à un ensemble — les types de
 * lieu, dont le formulaire ne distingue que trois familles.
 */
type Condition =
  | { readonly toutes: readonly CleDeRegle[] }
  | { readonly une: readonly CleDeRegle[] }
  | { readonly regle: CleDeRegle; readonly parmi: readonly string[] };

/**
 * Le `render` du livrable, ramené à ce qu'une checklist sait dire. `case` coche,
 * `case Non` coche l'inverse, `date` et `nombre` portent une valeur, `ligne`
 * désigne une ligne du formulaire où écrire — le livrable la nomme
 * `address_line_selector`, et prévient : « ne jamais dessiner de coche ».
 */
type Rendu = "case" | "case Non" | "date" | "nombre" | "texte" | "ligne";

export type CaseDeFormulaire = {
  /** L'identifiant du livrable : c'est sous ce nom qu'un désaccord lui remonte. */
  readonly id: string;
  /** Ce que la case dit sur le papier. Sans point final si elle porte une valeur. */
  readonly libelle: string;
  /** La règle qui décide de la case. */
  readonly source: CleDeRegle;
  /** `case` par défaut, comme le livrable. */
  readonly rendu?: Rendu;
  /** Le `when` du livrable, en plus de la source. */
  readonly quand?: Condition;
};

export type Rubrique = {
  /** La rubrique du formulaire, telle que le prescripteur la voit numérotée. */
  readonly titre: string;
  readonly icone: string;
  readonly cases: readonly CaseDeFormulaire[];
};

/** Une rubrique dont les cases sont tranchées : plus rien à évaluer pour l'afficher. */
export type GroupeRetenu = {
  readonly titre: string;
  readonly icone: string;
  readonly cases: string[];
};

/**
 * Les rubriques réduites à ce que la simulation a établi. Une rubrique dont
 * aucune case ne se coche disparaît : le prescripteur ne lit que ce qui le
 * concerne.
 */
export function rubriquesRetenues(
  rubriques: readonly Rubrique[],
  e: typeof moteur,
): GroupeRetenu[] {
  return rubriques
    .map((rubrique) => ({
      titre: rubrique.titre,
      icone: rubrique.icone,
      cases: rubrique.cases
        .filter((laCase) => retenue(laCase, e))
        .map((laCase) => libelleDe(laCase, e)),
    }))
    .filter((groupe) => groupe.cases.length > 0);
}

// ---- implémentation ----

// `render: date_fr` du livrable : « YYYY-MM-DD vers DD/MM/YYYY ». Une valeur qui
// n'a pas cette forme se rend telle quelle plutôt que découpée de travers.
function dateFr(iso: string): string {
  const [annee, mois, jour] = iso.split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : iso;
}

// Le contrat de rendu du livrable, mot pour mot : « cocher uniquement si
// value === true ; null, false et vide ne cochent pas » pour une case, « case Non
// uniquement si la cible source est explicitement false » pour son inverse. Une
// sortie que le parcours n'a pas tranchée ne coche donc ni l'une ni l'autre.
function retenue(laCase: CaseDeFormulaire, e: typeof moteur): boolean {
  if (laCase.quand && !remplie(laCase.quand, e)) return false;
  switch (laCase.rendu) {
    case "case Non":
      return faux(e, laCase.source);
    case "ligne":
      return true;
    case "date":
    case "nombre":
    case "texte":
      return texte(e, laCase.source) !== "";
    default:
      return vrai(e, laCase.source);
  }
}

function remplie(condition: Condition, e: typeof moteur): boolean {
  if ("toutes" in condition)
    return condition.toutes.every((regle) => vrai(e, regle));
  if ("une" in condition) return condition.une.some((regle) => vrai(e, regle));
  return condition.parmi.includes(texte(e, condition.regle));
}

// Une case qui porte une valeur la donne : le prescripteur la recopie au lieu de
// la retrouver. Les autres se lisent telles quelles.
function libelleDe(laCase: CaseDeFormulaire, e: typeof moteur): string {
  const brute = texte(e, laCase.source);
  switch (laCase.rendu) {
    case "date":
      return `${laCase.libelle} : ${dateFr(brute)}.`;
    case "nombre":
    case "texte":
      return `${laCase.libelle} : ${brute}.`;
    default:
      return laCase.libelle;
  }
}
