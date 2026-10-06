// La saisie d'un nombre : l'`Input` du DSFR, avec ses bornes et son unité.

import { Input } from "@codegouvfr/react-dsfr/Input";

type Props = {
  id: string;
  label: string;
  hint?: string;
  min?: number;
  max?: number;
  unit?: string;
  value: number | undefined;
  /** `undefined` quand le champ est vidé : ce n'est pas zéro, c'est une absence. */
  onChange: (value: number | undefined) => void;
  /** Affichée sous la saisie, sans y toucher : la valeur reste celle tapée. */
  error?: string;
  autoFocus?: boolean;
  /** Met le libellé en avant, quand le champ est la question de la page. */
  lead?: boolean;
};

export function NumberField(props: Props) {
  return (
    <Input
      label={props.label}
      state={props.error ? "error" : "default"}
      stateRelatedMessage={props.error}
      hintText={props.hint}
      classes={{ label: props.lead ? "fr-text--lead" : undefined }}
      style={{ maxWidth: "16rem" }}
      addon={
        props.unit ? (
          <span className="fr-label" style={{ whiteSpace: "nowrap" }}>
            {props.unit}
          </span>
        ) : undefined
      }
      nativeInputProps={{
        id: props.id,
        name: props.id,
        type: "number",
        min: props.min,
        max: props.max,
        value: props.value ?? "",
        onChange: (e) => props.onChange(typedNumber(e.target.value)),
        autoFocus: props.autoFocus,
      }}
    />
  );
}

// ---- implémentation ----

function typedNumber(input: string): number | undefined {
  return input.trim() === "" ? undefined : Number(input);
}
