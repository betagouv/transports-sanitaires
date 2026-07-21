import type { ChangeEvent } from "react";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import type { EvaluatedFormElement, FormPageElementProp } from "@publicodes/forms";
import { valeurBool } from "./mosaique";

type OptionField = EvaluatedFormElement & FormPageElementProp;

type Props = {
  question: string;
  // Éléments booléens des options présents sur la page courante.
  options: OptionField[];
  // Option d'exclusivité « aucun » (état dérivé : toutes les options décochées).
  aucun?: { label: string; coche: boolean };
  onToggleOption: (id: string, coche: boolean) => void;
  onToggleAucun?: (coche: boolean) => void;
};

// Rend une question à choix multiple : un `fieldset` de cases à cocher, à partir
// de N règles booléennes regroupées par une mosaïque (cf. `mosaique.ts`).
export function Mosaique({
  question,
  options,
  aucun,
  onToggleOption,
  onToggleAucun,
}: Props) {
  // On ignore `disabled`/`hidden` (divulgation progressive de @publicodes/forms,
  // qui « ferme » les options dès que l'agrégat OU est satisfait) : dans une
  // mosaïque — vrai choix multiple — toute combinaison doit rester cochable. On
  // respecte en revanche une non-applicabilité réelle (`applicable si`).
  const optionsCheckbox = options
    .filter((opt) => opt.applicable !== false)
    .map((opt) => ({
      label: opt.label,
      nativeInputProps: {
        name: opt.id,
        checked: valeurBool(opt) === true,
        onChange: (e: ChangeEvent<HTMLInputElement>) =>
          onToggleOption(opt.id, e.target.checked),
      },
    }));

  if (aucun && onToggleAucun) {
    optionsCheckbox.push({
      label: aucun.label,
      nativeInputProps: {
        name: "mosaique-aucun",
        checked: aucun.coche,
        onChange: (e: ChangeEvent<HTMLInputElement>) =>
          onToggleAucun(e.target.checked),
      },
    });
  }

  return (
    <Checkbox
      legend={question}
      options={optionsCheckbox}
      classes={{ legend: "fr-text--lead" }}
      style={{ marginBottom: "1.5rem" }}
    />
  );
}
