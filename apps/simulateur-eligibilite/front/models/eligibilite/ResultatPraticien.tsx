// Le résultat des cinq issues sans fiche patient (D-112). Il charge les textes
// de l'éditeur à la demande (900 ko, hors du chunk d'entrée), calcule la
// trace des réponses, puis montre la page du praticien.

import { Suspense, use } from "react";
import type { Answers } from "../../socle";
import { catalogueDeLaSession } from "./catalogue-resultats";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";
import { PageDuPraticien } from "./PageDuPraticien";
import { type IssueSansFiche, texteDuPraticien } from "./texte-du-praticien";
import { traceDuResultat } from "./trace-du-resultat";

type Props = {
  answers: Answers<Questions>;
  cibles: Cibles;
  issue: IssueSansFiche;
};

export function ResultatPraticien(props: Props) {
  return (
    <Suspense fallback={<p aria-live="polite">Chargement du résultat…</p>}>
      <ResultatCharge {...props} />
    </Suspense>
  );
}

// ---- implémentation ----

function ResultatCharge({ answers, cibles, issue }: Props) {
  const chargement = use(catalogueDeLaSession());
  if ("echec" in chargement) return <ChargementEnEchec />;
  const trace = traceDuResultat(answers, cibles);
  return (
    <PageDuPraticien
      texte={texteDuPraticien(chargement.catalogue, issue, trace)}
    />
  );
}

function ChargementEnEchec() {
  return (
    <p role="alert">
      Les textes du résultat n’ont pas pu être chargés. Rechargez la page.
    </p>
  );
}
