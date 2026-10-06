// Un choix unique : le `RadioButtons` du DSFR, en variante « riche ».

import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";

type Props = {
  id: string;
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string | undefined;
  onChange: (value: string) => void;
  /** La première option prend le focus à l'affichage. */
  autoFocus?: boolean;
  /** Met le libellé en avant, quand le champ est la question de la page. */
  lead?: boolean;
};

export function RadioField(props: Props) {
  return (
    <RadioButtons
      id={`fieldset-${props.id}`}
      name={props.id}
      legend={props.label}
      hintText={props.hint}
      // Variante « riche » DSFR : chaque option est une carte bordée, avec
      // fond gris + curseur pointeur au survol. Le picto (`fr-radio-rich__img`)
      // est facultatif, on l'omet donc. `classes.inputGroup` ajoute la classe à
      // chaque groupe (le composant ne pose `fr-radio-rich` de lui-même que si
      // une option fournit une `illustration`). Incompatible avec `small`.
      classes={{
        inputGroup: "fr-radio-rich",
        legend: props.lead ? "fr-text--lead" : undefined,
      }}
      options={props.options.map((option, index) => ({
        label: option.label,
        nativeInputProps: {
          value: option.value,
          checked: props.value === option.value,
          onChange: () => props.onChange(option.value),
          autoFocus: props.autoFocus && index === 0,
        },
      }))}
    />
  );
}
