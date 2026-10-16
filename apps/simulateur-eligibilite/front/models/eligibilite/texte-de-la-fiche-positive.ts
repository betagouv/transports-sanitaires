// Le texte de la fiche patient positive (#135), pour `ISSUE_PMT` et
// `ISSUE_S3141`. Une fonction pure, sans React.
//
// Tous les mots viennent du catalogue de l'éditeur, recopiés tels quels. Ce
// fichier choisit le titre, la phrase du contexte, la carte, les badges et le
// modus, puis les range : il n'en écrit aucun. Les blocs propres à l'accord
// préalable (introduction, phrases, rappel d'attente) viennent avec #136.

import {
  badgesDuResultat,
  type CarteAffichee,
  cartesDeLaFiche,
} from "./cartes-et-badges";
import {
  type Consignes,
  consignesDuModus,
  modusDuMode,
} from "./consignes-du-modus";
import { motifAdministratif, phraseDuContexte } from "./contexte-du-resultat";
import type {
  Bloc,
  CatalogueResultats,
} from "./declarations/catalogue-resultats";
import {
  motifDeLaPermission,
  phraseDeLaPermission,
} from "./texte-de-la-permission";
import type { Trace } from "./trace-du-resultat";
import {
  libelleDuMode,
  rangDuTitreDuPrescripteur,
} from "./variante-du-resultat";

/** Les issues dont cette fiche écrit le texte. */
export type IssueAvecFichePositive = "ISSUE_PMT" | "ISSUE_S3141";

/** La fiche patient positive, et le titre que le prescripteur lit au-dessus. */
export type TexteDeLaFichePositive = {
  readonly titreDuPrescripteur: string;
  readonly titreDuPatient: string;
  /** Absente quand la trace n'établit aucun contexte, ni phrase de permission. */
  readonly raison?: string;
  readonly cartes: readonly CarteAffichee[];
  readonly consignes: Consignes;
  readonly finance: Bloc;
};

/**
 * Le texte de la fiche de cette issue pour cette trace ; absent si les règles
 * n'ont pas donné de mode, ou si le catalogue n'a rien pour lui.
 */
export function texteDeLaFichePositive(
  catalogue: CatalogueResultats,
  trace: Trace,
  issueId: IssueAvecFichePositive,
): TexteDeLaFichePositive | undefined {
  const issue = catalogue.issues[issueId];
  const libelle = libelleDuMode(trace.cibles);
  const titre = libelle && issue.titles[libelle];
  const modus = libelle && modusDuMode(issue, libelle);
  const titreDuPrescripteur =
    issue.prescriberTitles[rangDuTitreDuPrescripteur(trace.cibles)];
  if (!titre || !modus || !titreDuPrescripteur) return undefined;
  const fondement = fondementDe(catalogue, trace, issueId);
  const badges = badgesDuResultat(catalogue.badges, trace);
  return {
    titreDuPrescripteur,
    titreDuPatient: titre,
    ...(fondement.raison !== undefined && { raison: fondement.raison }),
    cartes: cartesDeLaFiche(issue, trace),
    consignes: consignesDuModus(modus, fondement.motif, badges),
    finance: issue.finance,
  };
}

// ---- implémentation ----

type Fondement = {
  readonly raison: string | undefined;
  readonly motif: string | undefined;
};

// Pourquoi le transport est pris en charge : le contexte du soin pour la
// prescription médicale de transport, la permission pour le S3141.
function fondementDe(
  catalogue: CatalogueResultats,
  trace: Trace,
  issueId: IssueAvecFichePositive,
): Fondement {
  if (issueId === "ISSUE_S3141") {
    const issue = catalogue.issues.ISSUE_S3141;
    return {
      raison: phraseDeLaPermission(issue, trace),
      motif: motifDeLaPermission(issue, trace),
    };
  }
  const issue = catalogue.issues[issueId];
  return {
    raison: phraseDuContexte(issue, trace),
    motif: motifAdministratif(issue, trace),
  };
}
