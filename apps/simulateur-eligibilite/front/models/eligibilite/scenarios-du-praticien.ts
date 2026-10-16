// Le scénario du résultat praticien qui convient à une trace, pour les quatre
// issues qui en ont un (D-112). Une fonction pure, sans React.
//
// L'établissement, la permission et la convocation se choisissent par leur
// contexte. La caisse se choisit par les points que les règles laissent
// ouverts (`scenarios-de-la-caisse.ts`).

import type {
  IssuePraticien,
  ScenarioPraticien,
} from "./declarations/catalogue-resultats";
import { scenariosDeLaCaisse } from "./scenarios-de-la-caisse";
import type { Trace } from "./trace-du-resultat";

/** Les issues dont le texte est un scénario de l'éditeur. */
export type IssueDuPraticien =
  | "ISSUE_CAISSE"
  | "ISSUE_ETABLISSEMENT"
  | "ISSUE_PERMISSION_PATIENT"
  | "ISSUE_CONVOCATION";

/**
 * Les scénarios que la trace montre, dans l'ordre. Un seul pour
 * l'établissement, la permission et la convocation. Aucun pour la caisse
 * quand les règles ne laissent aucun point que le catalogue sait nommer :
 * rien n'est alors deviné.
 */
export function scenariosDuPraticien(
  issue: IssueDuPraticien,
  catalogue: IssuePraticien,
  trace: Trace,
): readonly ScenarioPraticien[] {
  if (issue === "ISSUE_CAISSE") return scenariosDeLaCaisse(catalogue, trace);
  const scenario = scenarioDuContexte(catalogue, contexteDe(issue, trace));
  return scenario ? [scenario] : [];
}

// ---- implémentation ----

type Contexte = Readonly<Record<string, string | undefined>>;

function contexteDe(
  issue: Exclude<IssueDuPraticien, "ISSUE_CAISSE">,
  { precisions }: Trace,
): Contexte | undefined {
  if (issue === "ISSUE_ETABLISSEMENT") return precisions.article80Context;
  if (issue === "ISSUE_PERMISSION_PATIENT") return precisions.permissionContext;
  return precisions.convocationContext;
}

// Le scénario le plus précis dont tous les paramètres sont prouvés par le
// contexte ; à défaut, le repli. Un scénario inactif n'est jamais choisi.
function scenarioDuContexte(
  { scenarios }: IssuePraticien,
  contexte: Contexte | undefined,
): ScenarioPraticien | undefined {
  const actifs = scenarios.filter(({ inactive }) => !inactive);
  const prouves = actifs.filter((scenario) =>
    estProuve(scenario, contexte ?? {}),
  );
  const precis = prouves.reduce<ScenarioPraticien | undefined>(
    (meilleur, scenario) =>
      !meilleur || parametres(scenario).length > parametres(meilleur).length
        ? scenario
        : meilleur,
    undefined,
  );
  return precis ?? actifs.find(({ params }) => params.kind === "fallback");
}

// Le repli n'est pas un contexte : il se prend quand aucun autre ne tient.
function estProuve(scenario: ScenarioPraticien, contexte: Contexte): boolean {
  if (scenario.params.kind === "fallback") return false;
  return parametres(scenario).every(
    ([nom, valeur]) => contexte[nom] === valeur,
  );
}

// Les paramètres dont le scénario demande la preuve.
function parametres({ params }: ScenarioPraticien): [string, string][] {
  return Object.entries(params).flatMap(([nom, valeur]) =>
    nom !== "scenario_id" && valeur !== null ? [[nom, valeur]] : [],
  );
}
