// Une case d'un Cerfa, et ce que le mapping documentaire en dit.
//
// La v9.7 livre un quatrième YAML, `transports-sanitaires.documents.v9-7-1.yaml`
// (`kind: semantic_document_mapping`). Pour chacune des zones des trois
// formulaires — PMT S3138g, DAP S3139h, S3141 — il nomme la règle qui la
// remplit, la condition qui la fait exister, la façon de la rendre et **d'où
// vient sa valeur**. C'est le contrat de correspondance entre le simulateur et le
// document remis au patient : le produit n'a pas à reconstruire une règle
// réglementaire à partir de l'interface.
//
// Ce fichier porte la forme d'une case et sa lecture. Les fichiers
// `rubriques-*.ts` en portent la recopie, une par ligne du mapping, et le
// pré-remplissage la relit par `outils-produit/beta/cerfa/mapping.ts`.
//
// Deux publics, une seule transcription :
//
//  - la **checklist** du Bloc 3 ne garde que ce que le moteur tranche et qui a
//    quelque chose à dire au prescripteur ;
//  - le **pré-remplissage** lit tout, et tire de l'origine ce qu'il laisse
//    vierge et à qui.

import type { CleDeRegle } from "../contrat-regles-publicodes.ts";

/**
 * Le `when` du livrable, dans les quatre formes qu'il emploie : une conjonction,
 * une disjonction, l'appartenance d'une valeur à un ensemble — les types de lieu,
 * dont le formulaire ne distingue que trois familles —, ou son complémentaire —
 * les six composants d'adresse, qui s'appliquent à tout type de lieu sauf le
 * domicile.
 */
type Condition =
  | { readonly toutes: readonly CleDeRegle[] }
  | { readonly une: readonly CleDeRegle[] }
  | { readonly regle: CleDeRegle; readonly parmi: readonly string[] }
  | { readonly regle: CleDeRegle; readonly sauf: readonly string[] };

/**
 * La colonne d'origine du mapping, dans les quatre valeurs de sa légende. C'est
 * elle qui dit ce que l'application a le droit de faire de la ligne :
 *
 *  - `publicodes` — le modèle tranche, une `source` le nomme ;
 *  - `application` — l'application tranche hors du moteur (la date de
 *    prescription), ou devrait le faire sans le pouvoir (les éléments d'ordre
 *    médical, cf. spec 0005) ;
 *  - `externe` — une donnée d'identité, que le simulateur ne connaît pas ;
 *  - `manuel` — un cadre rempli à la main sur le papier, signature comprise.
 *
 * Les deux dernières ne portent jamais de `source` : rien à évaluer.
 */
type Origine = "publicodes" | "application" | "externe" | "manuel";

/**
 * Qui remplit une case que le simulateur ne déduit pas — le « destinataire » de
 * la légende. Le prescripteur par défaut, seul le cadre transporteur et l'avis
 * de la caisse s'en écartent.
 */
export type Destinataire = "le prescripteur" | "le transporteur" | "la caisse";

/**
 * Le `render` du livrable, ramené à ce qu'une checklist sait dire. `case` coche,
 * `case Non` coche l'inverse, `date`, `nombre` et `texte` portent une valeur,
 * `ligne` désigne une ligne du formulaire où écrire — qu'elle porte elle-même une
 * case (le domicile, `checkbox_expression` du livrable) ou une ligne de texte à
 * choisir (`address_line_selector`), le livrable prévenant : « ne jamais dessiner
 * de coche » sur cette seconde forme. `adresse` est un des six composants qu'une
 * telle ligne assemble (`joined_address`) : jamais montré pour lui-même.
 */
type Rendu =
  | "case"
  | "case Non"
  | "date"
  | "nombre"
  | "texte"
  | "ligne"
  | "adresse";

export type CaseDeFormulaire = {
  /** L'identifiant du livrable : c'est sous ce nom qu'un désaccord lui remonte. */
  readonly id: string;
  /**
   * Ce que la case dit sur le papier, pour la checklist. Sans point final si elle
   * porte une valeur. Absent quand il n'y a rien à annoncer au prescripteur : un
   * composant d'adresse, une donnée d'identité, un cadre qu'il remplira de toute
   * façon en le lisant.
   */
  readonly libelle?: string;
  /** La règle qui décide de la case. Les origines hors `publicodes` n'en ont pas. */
  readonly source?: CleDeRegle;
  /** `publicodes` par défaut, l'origine de l'écrasante majorité des lignes. */
  readonly origine?: Origine;
  /** `le prescripteur` par défaut. */
  readonly destinataire?: Destinataire;
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
 * De quoi évaluer une case : une lecture de règle, et rien de plus.
 *
 * Le moteur n'est pas pris en argument, et c'est délibéré. Le secrétariat évalue
 * contre le singleton de `front/simulateur/moteur.ts` ; le Cerfa, lui, a son
 * propre `Engine` et sa propre `Situation`, et ne peut pas importer ce singleton
 * — `scripts/verifier-bundle.ts` interdit au moteur d'entrer dans le chunk
 * chargé au clic. Chacun passe donc le lecteur qu'il sait fabriquer.
 */
export type Lecteur = {
  readonly texte: (regle: CleDeRegle) => string;
  readonly vrai: (regle: CleDeRegle) => boolean;
  readonly faux: (regle: CleDeRegle) => boolean;
};

/**
 * Les rubriques réduites à ce que la simulation a établi. Une rubrique dont
 * aucune case ne se coche disparaît : le prescripteur ne lit que ce qui le
 * concerne.
 *
 * Deux filtres, et ils ne disent pas la même chose. L'**origine** écarte ce que
 * le moteur ne tranche pas : une identité, un cadre manuel. Le **libellé**
 * écarte ce qui n'a rien à annoncer même quand le modèle le décide : les six
 * composants d'une adresse sont pour le PDF, la ligne où les écrire est déjà
 * annoncée à part.
 */
export function rubriquesRetenues(
  rubriques: readonly Rubrique[],
  lecteur: Lecteur,
): GroupeRetenu[] {
  return rubriques
    .map((rubrique) => ({
      titre: rubrique.titre,
      icone: rubrique.icone,
      cases: rubrique.cases
        .filter((laCase) => retenue(laCase, lecteur))
        .map((laCase) => libelleDe(laCase, lecteur)),
    }))
    .filter((groupe) => groupe.cases.length > 0);
}

/**
 * Les cases d'un formulaire indexées par leur id du mapping, l'accès dont le
 * pré-remplissage a besoin. Un id est unique à l'intérieur d'un formulaire, et
 * `tests/cerfa/mapping.test.ts` le vérifie.
 */
export function casesParId(
  rubriques: readonly Rubrique[],
): Map<string, CaseDeFormulaire> {
  return new Map(
    rubriques.flatMap((rubrique) =>
      rubrique.cases.map((laCase) => [laCase.id, laCase] as const),
    ),
  );
}

/** L'origine de la case, `publicodes` restant le défaut. */
export function origineDe(laCase: CaseDeFormulaire): Origine {
  return laCase.origine ?? "publicodes";
}

/** Qui remplit la case, `le prescripteur` restant le défaut. */
export function destinataireDe(laCase: CaseDeFormulaire): Destinataire {
  return laCase.destinataire ?? "le prescripteur";
}

/**
 * Le `quand` de la case est-il rempli ? Vrai d'office si elle n'en porte pas.
 * Partagée par la checklist et par le pré-remplissage
 * (`outils-produit/beta/cerfa/mapping.ts`) : les deux appliquent le même `when`
 * du livrable, sur leur propre lecteur.
 */
export function quandSatisfaite(
  laCase: CaseDeFormulaire,
  lecteur: Lecteur,
): boolean {
  return !laCase.quand || remplie(laCase.quand, lecteur);
}

// ---- implémentation ----

// Les origines que le moteur tranche, donc les seules que la checklist affiche.
const AFFICHEES: readonly Origine[] = ["publicodes", "application"];

// Le contrat de rendu du livrable, mot pour mot : « cocher uniquement si
// value === true ; null, false et vide ne cochent pas » pour une case, « case Non
// uniquement si la cible source est explicitement false » pour son inverse. Une
// sortie que le parcours n'a pas tranchée ne coche donc ni l'une ni l'autre.
function retenue(laCase: CaseDeFormulaire, lecteur: Lecteur): boolean {
  if (!AFFICHEES.includes(origineDe(laCase))) return false;
  if (!laCase.libelle || !laCase.source) return false;
  if (!quandSatisfaite(laCase, lecteur)) return false;
  return trancheeParLeModele(laCase, laCase.source, lecteur);
}

function trancheeParLeModele(
  laCase: CaseDeFormulaire,
  source: CleDeRegle,
  lecteur: Lecteur,
): boolean {
  switch (laCase.rendu) {
    case "case Non":
      return lecteur.faux(source);
    case "ligne":
      return true;
    case "adresse":
      return false;
    case "date":
    case "nombre":
    case "texte":
      return lecteur.texte(source) !== "";
    default:
      return lecteur.vrai(source);
  }
}

function remplie(condition: Condition, lecteur: Lecteur): boolean {
  if ("toutes" in condition)
    return condition.toutes.every((regle) => lecteur.vrai(regle));
  if ("une" in condition)
    return condition.une.some((regle) => lecteur.vrai(regle));
  if ("sauf" in condition)
    return !condition.sauf.includes(lecteur.texte(condition.regle));
  return condition.parmi.includes(lecteur.texte(condition.regle));
}

// `render: date_fr` du livrable : « YYYY-MM-DD vers DD/MM/YYYY ». Une valeur qui
// n'a pas cette forme se rend telle quelle plutôt que découpée de travers. Le
// Cerfa, lui, écrit ses dates au format que le champ impose (`cerfa/dates.ts`) :
// une checklist se lit, un champ peigné se remplit.
function dateFr(iso: string): string {
  const [annee, mois, jour] = iso.split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : iso;
}

// Une case qui porte une valeur la donne : le prescripteur la recopie au lieu de
// la retrouver. Les autres se lisent telles quelles. `retenue` a déjà garanti le
// libellé et la source.
function libelleDe(laCase: CaseDeFormulaire, lecteur: Lecteur): string {
  const libelle = laCase.libelle ?? "";
  const brute = laCase.source ? lecteur.texte(laCase.source) : "";
  switch (laCase.rendu) {
    case "date":
      return `${libelle} : ${dateFr(brute)}.`;
    case "nombre":
    case "texte":
      return `${libelle} : ${brute}.`;
    default:
      return libelle;
  }
}
