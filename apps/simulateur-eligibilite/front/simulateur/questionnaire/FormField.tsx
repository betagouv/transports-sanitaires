import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { Select } from "@codegouvfr/react-dsfr/Select";
import type {
  EvaluatedFormElement,
  EvaluatedNumberInput,
  EvaluatedRadioGroup,
  EvaluatedSelect,
  FormPageElementProp,
} from "@publicodes/forms";

type Props = {
  field: EvaluatedFormElement & FormPageElementProp;
  onChange: (value: unknown) => void;
};

// Rend un champ de page selon sa variante `element`. Le `field` est passé déjà
// restreint à chaque sous-composant : c'est le `switch` ci-dessous qui porte le
// narrowing de l'union, pas les composants.
export function FormField({ field, onChange }: Props) {
  if (field.hidden || !field.applicable) return null;

  return (
    <div className="fr-form-group" style={{ marginBottom: "1.5rem" }}>
      {field.element === "RadioGroup" && (
        <ChoixRadio champ={field} onChange={onChange} />
      )}
      {field.element === "select" && (
        <ChoixDeroulant champ={field} onChange={onChange} />
      )}
      {field.element === "input" && field.type === "number" && (
        <SaisieNombre champ={field} onChange={onChange} />
      )}
    </div>
  );
}

// ---- implémentation ----

type ChampProps<T> = {
  champ: T & FormPageElementProp;
  onChange: Props["onChange"];
};

function ChoixRadio({ champ, onChange }: ChampProps<EvaluatedRadioGroup>) {
  return (
    <RadioButtons
      id={`fieldset-${champ.id}`}
      name={champ.id}
      legend={champ.label}
      hintText={champ.description}
      // Variante « riche » DSFR : chaque option est une carte bordée, avec
      // fond gris + curseur pointeur au survol. Le picto (`fr-radio-rich__img`)
      // est facultatif — la bordure et le survol sont portés par le label —,
      // on l'omet donc. `classes.inputGroup` ajoute la classe à chaque groupe
      // (le composant ne pose `fr-radio-rich` de lui-même que si une option
      // fournit une `illustration`). Incompatible avec `small`.
      // `legend` porte la question elle-même, mise en avant en `fr-text--lead`.
      classes={{ inputGroup: "fr-radio-rich", legend: "fr-text--lead" }}
      disabled={champ.disabled}
      options={champ.options.map((opt) => ({
        label: opt.label,
        nativeInputProps: {
          value: String(opt.value),
          checked: (champ.value as unknown) === opt.value,
          onChange: () => onChange(opt.value),
          autoFocus: champ.autofocus && champ.value === undefined,
        },
      }))}
    />
  );
}

function ChoixDeroulant({ champ, onChange }: ChampProps<EvaluatedSelect>) {
  return (
    <Select
      // `Select` n'expose pas de prop `classes` : on met la question en avant
      // en enveloppant le libellé dans un span `fr-text--lead`.
      label={<span className="fr-text--lead">{champ.label}</span>}
      hint={champ.description}
      disabled={champ.disabled}
      nativeSelectProps={{
        id: champ.id,
        name: champ.id,
        value: champ.value ?? "",
        onChange: (e) => onChange(e.target.value),
        autoFocus: champ.autofocus && champ.value === undefined,
      }}
    >
      <option value="" disabled hidden>
        Sélectionnez une option
      </option>
      {champ.options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}

function SaisieNombre({ champ, onChange }: ChampProps<EvaluatedNumberInput>) {
  return (
    <Input
      label={champ.label}
      hintText={champ.description}
      disabled={champ.disabled}
      classes={{ label: "fr-text--lead" }}
      style={{ maxWidth: "16rem" }}
      addon={
        champ.unit ? (
          <span className="fr-label" style={{ whiteSpace: "nowrap" }}>
            {champ.unit}
          </span>
        ) : undefined
      }
      nativeInputProps={{
        id: champ.id,
        name: champ.id,
        type: "number",
        min: 0,
        value: champ.value ?? champ.defaultValue ?? "",
        onChange: (e) => onChange(Number(e.target.value)),
        autoFocus: champ.autofocus,
      }}
    />
  );
}
