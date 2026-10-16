// Les deux résultats du modèle : l'éligibilité (R2), puis la prescription
// préremplie (R3).
//
// Cinq issues n'ont pas de fiche patient : leur texte est celui du praticien
// (#133). La non-éligibilité a sa fiche patient négative (#134), la
// prescription médicale de transport et le S3141 leur fiche positive (#135),
// les deux demandes d'accord préalable la leur (#136). Les dix issues ont donc
// leur texte.

import type { Answers } from "../../socle";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";
import { ResultatNegatif } from "./ResultatNegatif";
import { ResultatPositif } from "./ResultatPositif";
import { ResultatPraticien } from "./ResultatPraticien";
import { estSansFiche } from "./texte-du-praticien";

type Props = { answers: Answers<Questions>; cibles: Cibles };

export function Eligibilite({ answers, cibles }: Props) {
  const issue = cibles.cible_issue_id;
  if (!issue) return <SansIssue />;
  if (issue === "ISSUE_NON_ELIGIBLE") {
    return <ResultatNegatif answers={answers} cibles={cibles} />;
  }
  if (estSansFiche(issue)) {
    return (
      <ResultatPraticien answers={answers} cibles={cibles} issue={issue} />
    );
  }
  return <ResultatPositif answers={answers} cibles={cibles} issue={issue} />;
}

/** Jamais affichée tant qu'aucun cerfa n'est produit. */
export function PrescriptionPreremplie() {
  return null;
}

// ---- implémentation ----

// Sans issue, les règles n'ont pas pu conclure : un fait dont elles dépendent
// est absent. Tant que P1 et P2 ne sont pas posées, c'est toujours le cas.
function SansIssue() {
  return (
    <p>
      Les réponses données ne suffisent pas à calculer l’éligibilité : le
      questionnaire n’est pas complet.
    </p>
  );
}
