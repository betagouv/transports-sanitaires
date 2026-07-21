import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { Select } from "@codegouvfr/react-dsfr/Select";
import type { EvaluatedFormElement, FormPageElementProp } from "@publicodes/forms";

type Props = {
  field: EvaluatedFormElement & FormPageElementProp;
  onChange: (value: unknown) => void;
};

export function FormField({ field, onChange }: Props) {
  if (field.hidden || !field.applicable) return null;

  const { element, label, description, id } = field;

  return (
    <div className="fr-form-group" style={{ marginBottom: "1.5rem" }}>
      {element === "RadioGroup" && (
        <RadioButtons
          id={`fieldset-${id}`}
          name={id}
          legend={label}
          hintText={description}
          // Variante « riche » DSFR : chaque option est une carte bordée, avec
          // fond gris + curseur pointeur au survol. Le picto (`fr-radio-rich__img`)
          // est facultatif — la bordure et le survol sont portés par le label —,
          // on l'omet donc. `classes.inputGroup` ajoute la classe à chaque groupe
          // (le composant ne pose `fr-radio-rich` de lui-même que si une option
          // fournit une `illustration`). Incompatible avec `small`.
          // `legend` porte la question elle-même, mise en avant en `fr-text--lead`.
          classes={{ inputGroup: "fr-radio-rich", legend: "fr-text--lead" }}
          disabled={field.disabled}
          options={field.options.map((opt) => ({
            label: opt.label,
            nativeInputProps: {
              value: String(opt.value),
              checked: (field.value as unknown) === opt.value,
              onChange: () => onChange(opt.value),
              autoFocus: field.autofocus && field.value === undefined,
            },
          }))}
        />
      )}

      {element === "select" && (
        <Select
          // `Select` n'expose pas de prop `classes` : on met la question en avant
          // en enveloppant le libellé dans un span `fr-text--lead`.
          label={<span className="fr-text--lead">{label}</span>}
          hint={description}
          disabled={field.disabled}
          nativeSelectProps={{
            id,
            name: id,
            value: (field.value as string | undefined) ?? "",
            onChange: (e) => onChange(e.target.value),
            autoFocus: field.autofocus && field.value === undefined,
          }}
        >
          <option value="" disabled hidden>
            Sélectionnez une option
          </option>
          {field.options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </Select>
      )}

      {element === "input" && field.type === "number" && (
        <Input
          label={label}
          hintText={description}
          disabled={field.disabled}
          classes={{ label: "fr-text--lead" }}
          style={{ maxWidth: "16rem" }}
          addon={
            field.unit ? (
              <span className="fr-label" style={{ whiteSpace: "nowrap" }}>
                {field.unit}
              </span>
            ) : undefined
          }
          nativeInputProps={{
            id,
            name: id,
            type: "number",
            min: 0,
            value: field.value ?? field.defaultValue ?? "",
            onChange: (e) => onChange(Number(e.target.value)),
            autoFocus: field.autofocus,
          }}
        />
      )}
    </div>
  );
}
