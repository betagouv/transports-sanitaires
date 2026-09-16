// Rend une question à choix multiple : un `fieldset` de cases à cocher bâti sur
// N règles booléennes regroupées par une mosaïque (cf. `mosaique.ts`).

import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import type {
  EvaluatedFormElement,
  FormPageElementProp,
} from "@publicodes/forms";
import type { ChangeEvent, ComponentProps } from "react";
import { libelleDeReponse } from "./libelle-de-reponse";
import { valeurBool } from "./mosaique";

type ChampOption = EvaluatedFormElement & FormPageElementProp;

type Props = {
  question: string;
  // Phrase indicative rendue sous la question, quand la règle parente en porte une.
  information?: string;
  // Faits déjà établis ailleurs dans le parcours, rendus avant les choix
  // (`known_facts` du contrat d'interface — `faits-connus.ts`).
  faitsConnus?: string[];
  // Éléments booléens des options présents sur la page courante.
  options: ChampOption[];
  // Option d'exclusivité « aucun » (état dérivé : toutes les options décochées).
  aucun?: { libelle: string; coche: boolean };
  onToggleOption: (id: string, coche: boolean) => void;
  onToggleAucun?: (coche: boolean) => void;
};

export function Mosaique({
  question,
  information,
  faitsConnus,
  options,
  aucun,
  onToggleOption,
  onToggleAucun,
}: Props) {
  return (
    <>
      {faitsConnus?.map((fait) => (
        <p key={fait} className="fr-text--bold">
          {fait}
        </p>
      ))}
      <Checkbox
        legend={question}
        hintText={information}
        options={casesACocher(options, aucun, onToggleOption, onToggleAucun)}
        classes={{ legend: "fr-text--lead" }}
        style={{ marginBottom: "1.5rem" }}
      />
    </>
  );
}

// ---- implémentation ----

// La forme des cases est celle du composant DSFR appelé, pas la nôtre : on la
// lui emprunte plutôt que de la recopier — `label`, `nativeInputProps` sont ses
// noms à lui, et une recopie dériverait d'une version à l'autre.
type CaseACocher = ComponentProps<typeof Checkbox>["options"][number];

function casesACocher(
  options: ChampOption[],
  aucun: Props["aucun"],
  onToggleOption: Props["onToggleOption"],
  onToggleAucun: Props["onToggleAucun"],
): CaseACocher[] {
  // On ignore `disabled`/`hidden` (divulgation progressive de @publicodes/forms,
  // qui « ferme » les options dès que l'agrégat OU est satisfait) : dans une
  // mosaïque — vrai choix multiple — toute combinaison doit rester cochable. On
  // respecte en revanche une non-applicabilité réelle (`applicable si`).
  const cases: CaseACocher[] = options
    .filter((opt) => opt.applicable !== false)
    .map((opt) => ({
      label: libelleDeReponse(opt.label),
      nativeInputProps: {
        name: opt.id,
        checked: valeurBool(opt) === true,
        onChange: (e: ChangeEvent<HTMLInputElement>) =>
          onToggleOption(opt.id, e.target.checked),
      },
    }));

  if (aucun && onToggleAucun) {
    cases.push({
      label: libelleDeReponse(aucun.libelle),
      nativeInputProps: {
        name: "mosaique-aucun",
        checked: aucun.coche,
        onChange: (e: ChangeEvent<HTMLInputElement>) =>
          onToggleAucun(e.target.checked),
      },
    });
  }

  return cases;
}
