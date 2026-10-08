// Un choix multiple : le `Checkbox` du DSFR. Une option peut être exclusive.

import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import type { ChangeEvent, ComponentProps } from "react";

type Option = { value: string; label: string; description?: string };

type Props = {
  id: string;
  label: string;
  hint?: string;
  options: readonly Option[];
  /** La cocher décoche les autres, et inversement. Rendue en dernier. */
  exclusiveOption?: Option;
  values: readonly string[];
  onChange: (values: readonly string[]) => void;
  error?: string;
  /** Met le libellé en avant, quand le champ est la question de la page. */
  lead?: boolean;
};

export function CheckboxField(props: Props) {
  return (
    <Checkbox
      legend={props.label}
      hintText={props.hint}
      state={props.error ? "error" : "default"}
      stateRelatedMessage={props.error}
      options={checkboxes(props)}
      classes={{ legend: props.lead ? "fr-text--lead" : undefined }}
      style={{ marginBottom: "1.5rem" }}
    />
  );
}

// ---- implémentation ----

// La forme des cases est empruntée au composant DSFR, pas recopiée.
type DsfrCheckbox = ComponentProps<typeof Checkbox>["options"][number];

function checkboxes(props: Props): DsfrCheckbox[] {
  const options = props.exclusiveOption
    ? [...props.options, props.exclusiveOption]
    : props.options;
  return options.map((option) => ({
    label: option.label,
    hintText: option.description,
    nativeInputProps: {
      name: `${props.id}-${option.value}`,
      checked: props.values.includes(option.value),
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        props.onChange(afterToggle(props, option.value, e.target.checked)),
    },
  }));
}

// Cocher l'option exclusive décoche tout le reste, cocher une autre option la
// décoche.
function afterToggle(
  props: Props,
  value: string,
  checked: boolean,
): readonly string[] {
  const exclusive = props.exclusiveOption?.value;
  if (!checked) return props.values.filter((v) => v !== value);
  if (value === exclusive) return [value];
  return [...props.values.filter((v) => v !== exclusive), value];
}
