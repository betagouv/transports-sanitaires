// Rend un champ de page du questionnaire selon sa variante `element`.

import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { Select } from "@codegouvfr/react-dsfr/Select";
import type {
  EvaluatedFormElement,
  EvaluatedNumberInput,
  EvaluatedRadioGroup,
  EvaluatedSelect,
  EvaluatedStringInput,
  FormPageElementProp,
} from "@publicodes/forms";
import { libelleDeReponse } from "./libelle-de-reponse";

type Props = {
  champ: EvaluatedFormElement & FormPageElementProp;
  onChange: (valeur: unknown) => void;
};

// Le `champ` est passé déjà restreint à chaque sous-composant : c'est le
// `switch` ci-dessous qui porte le narrowing de l'union, pas les composants.
export function ChampDeFormulaire({ champ, onChange }: Props) {
  if (champ.hidden || !champ.applicable) return null;

  return (
    <div className="fr-form-group" style={{ marginBottom: "1.5rem" }}>
      {champ.element === "RadioGroup" && (
        <ChoixRadio champ={champ} onChange={onChange} />
      )}
      {champ.element === "select" && (
        <ChoixDeroulant champ={champ} onChange={onChange} />
      )}
      {champ.element === "input" && champ.type === "number" && (
        <SaisieNombre champ={champ} onChange={onChange} />
      )}
      {champ.element === "input" && champ.type === "text" && (
        <SaisieTexte champ={champ} onChange={onChange} />
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
        label: libelleDeReponse(opt.label),
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
          {libelleDeReponse(opt.label)}
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

// Les douze saisies d'adresse de la v9.1 (D1-D12). Le modèle ne les vérifie ni
// ne les normalise — aucun contrôle d'adresse, aucune interface externe —, elles
// ne servent qu'à préremplir le document.
function SaisieTexte({ champ, onChange }: ChampProps<EvaluatedStringInput>) {
  return (
    <Input
      label={champ.label}
      hintText={champ.description}
      disabled={champ.disabled}
      classes={{ label: "fr-text--lead" }}
      nativeInputProps={{
        id: champ.id,
        name: champ.id,
        type: "text",
        value: champ.value ?? "",
        onChange: (e) => onChange(e.target.value),
        autoFocus: champ.autofocus,
      }}
    />
  );
}
