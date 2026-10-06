// Rend une question à choix multiple : un `fieldset` de cases à cocher, avec
// son option exclusive « aucun » quand la question en porte une.

import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import type { ChangeEvent, ComponentProps } from "react";
import type { ChoixMultiple as Question, Reponse } from "./question";

type Props = {
  question: Question;
  reponse: Reponse | undefined;
  onChange: (reponse: Reponse | undefined) => void;
  erreur?: string;
};

export function ChoixMultiple({ question, reponse, onChange, erreur }: Props) {
  const cochees = Array.isArray(reponse) ? (reponse as readonly string[]) : [];
  const basculer = (valeur: string, coche: boolean) => {
    const suite = apresBascule(question, cochees, valeur, coche);
    onChange(suite.length > 0 ? suite : undefined);
  };
  return (
    <Checkbox
      legend={question.libelle}
      hintText={question.aide}
      state={erreur ? "error" : "default"}
      stateRelatedMessage={erreur}
      options={casesACocher(question, cochees, basculer)}
      classes={{ legend: "fr-text--lead" }}
      style={{ marginBottom: "1.5rem" }}
    />
  );
}

// ---- implémentation ----

// La forme des cases est celle du composant DSFR appelé, pas la nôtre : on la
// lui emprunte plutôt que de la recopier.
type CaseACocher = ComponentProps<typeof Checkbox>["options"][number];

function casesACocher(
  question: Question,
  cochees: readonly string[],
  basculer: (valeur: string, coche: boolean) => void,
): CaseACocher[] {
  const options = question.aucun
    ? [...question.options, question.aucun]
    : question.options;
  return options.map((option) => ({
    label: option.libelle,
    nativeInputProps: {
      name: `${question.id}-${option.valeur}`,
      checked: cochees.includes(option.valeur),
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        basculer(option.valeur, e.target.checked),
    },
  }));
}

// Cocher « aucun » décoche tout le reste, cocher une option décoche « aucun ».
function apresBascule(
  question: Question,
  cochees: readonly string[],
  valeur: string,
  coche: boolean,
): readonly string[] {
  const aucun = question.aucun?.valeur;
  if (!coche) return cochees.filter((cochee) => cochee !== valeur);
  if (valeur === aucun) return [valeur];
  return [...cochees.filter((cochee) => cochee !== aucun), valeur];
}
