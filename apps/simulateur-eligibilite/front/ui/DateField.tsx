// La saisie d'une date, avec ou sans heure : l'`Input` du DSFR. Le navigateur
// garantit le format ISO.

import { Input } from "@codegouvfr/react-dsfr/Input";

type Props = {
  id: string;
  label: string;
  hint?: string;
  /** Saisit aussi l'heure, locale. */
  withTime?: boolean;
  /** Au format ISO, ou vide. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  /** Met le libellé en avant, quand le champ est la question de la page. */
  lead?: boolean;
};

export function DateField(props: Props) {
  return (
    <Input
      label={props.label}
      hintText={props.hint}
      state={props.error ? "error" : "default"}
      stateRelatedMessage={props.error}
      classes={{ label: props.lead ? "fr-text--lead" : undefined }}
      style={{ maxWidth: "16rem" }}
      nativeInputProps={{
        id: props.id,
        name: props.id,
        // `datetime-local` et non `datetime` : c'est le seul des deux que les
        // navigateurs rendent, et il donne une heure locale.
        type: props.withTime ? "datetime-local" : "date",
        value: props.value,
        onChange: (e) => props.onChange(e.target.value),
        autoFocus: props.autoFocus,
      }}
    />
  );
}
