// Les textes propres à `ISSUE_S3141` (#135) : la phrase de la permission et le
// motif administratif du modus. Des fonctions pures de la trace, sans React.
//
// L'éditeur les choisit sur Q2.8.5 (`permissionRepeated`) et sur l'ambulance.
// Les quatre phrases ne reprennent pas les motifs administratifs de la
// prescription médicale de transport (README de l'éditeur). Sans réponse à
// Q2.8.5, le catalogue ne dit pas quoi montrer : aucune phrase n'est choisie
// à sa place.

import type { CatalogueResultats } from "./declarations/catalogue-resultats";
import type { Trace } from "./trace-du-resultat";

type IssueS3141 = CatalogueResultats["issues"]["ISSUE_S3141"];

/** La phrase qui dit pourquoi la permission ouvre le transport. */
export function phraseDeLaPermission(
  issue: IssueS3141,
  trace: Trace,
): string | undefined {
  if (trace.permissionRepeated === undefined) return undefined;
  const repetee = trace.permissionRepeated ? "R" : "U";
  const ambulance = trace.cibles.cible_mode_ambulance === true ? "-B" : "";
  return texte(issue.permissionPhrases, `E-S3141-${repetee}${ambulance}`);
}

/** Le motif administratif du modus : une permission, ou plusieurs. */
export function motifDeLaPermission(
  issue: IssueS3141,
  trace: Trace,
): string | undefined {
  if (trace.permissionRepeated === undefined) return undefined;
  const suffixe = trace.permissionRepeated ? "N" : "1";
  return texte(issue.permissionAdministrative, `MA-S3141-${suffixe}`);
}

// ---- implémentation ----

function texte(
  textes: readonly { id: string; text: string }[],
  id: string,
): string | undefined {
  return textes.find((candidat) => candidat.id === id)?.text;
}
