// La saisie d'un texte libre : l'`Input` du DSFR.

import { Input } from "@codegouvfr/react-dsfr/Input";

type Props = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  /** Met le libellé en avant, quand le champ est la question de la page. */
  lead?: boolean;
};

export function TextField(props: Props) {
  return (
    <Input
      label={props.label}
      hintText={props.hint}
      state={props.error ? "error" : "default"}
      stateRelatedMessage={props.error}
      classes={{ label: props.lead ? "fr-text--lead" : undefined }}
      nativeInputProps={{
        id: props.id,
        name: props.id,
        type: "text",
        value: props.value,
        onChange: (e) => props.onChange(e.target.value),
        autoFocus: props.autoFocus,
      }}
    />
  );
}
