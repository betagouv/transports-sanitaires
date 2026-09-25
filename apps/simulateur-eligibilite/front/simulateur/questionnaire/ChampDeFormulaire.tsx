// Rend un champ de page du questionnaire selon sa variante `element`.

import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import type {
  EvaluatedFormElement,
  EvaluatedNumberInput,
  EvaluatedRadioGroup,
  EvaluatedStringInput,
  FormPageElementProp,
} from "@publicodes/forms";
import { bornesDeSaisie } from "./bornes-de-saisie";
import { formeDeSaisie } from "./formes-de-saisie";
import { libelleDeReponse } from "./libelle-de-reponse";

type Props = {
  champ: EvaluatedFormElement & FormPageElementProp;
  onChange: (valeur: unknown) => void;
  /** Ce qui ne va pas dans la saisie, affiché sous le champ (`saisie-a-corriger.ts`). */
  erreur?: string;
};

// Le `champ` est passé déjà restreint à chaque sous-composant : c'est le
// `switch` ci-dessous qui porte le narrowing de l'union, pas les composants.
export function ChampDeFormulaire({ champ, onChange, erreur }: Props) {
  if (champ.hidden || !champ.applicable) return null;

  return (
    <div className="fr-form-group" style={{ marginBottom: "1.5rem" }}>
      {champ.element === "RadioGroup" && (
        <ChoixRadio champ={champ} onChange={onChange} />
      )}
      {champ.element === "input" && champ.type === "number" && (
        <SaisieNombre champ={champ} onChange={onChange} erreur={erreur} />
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

// Les bornes viennent du contrat d'interface, jamais d'ici : le nombre de
// transports exige un entier d'au moins 1, la fréquence mensuelle d'une
// permission en accepte cinq au plus. Les écrire en dur ferait accepter à l'écran
// ce que le modèle rejette ensuite.
//
// Une erreur s'affiche sous la saisie sans la toucher : la valeur reste celle
// tapée, à corriger par le prescripteur. Le champ reste alors modifiable. Sans
// ça, `@publicodes/forms` le désactiverait : la garde du modèle à « non »
// rend la saisie inutile aux cibles, donc désactivée, donc impossible à
// corriger.
function SaisieNombre({
  champ,
  onChange,
  erreur,
}: ChampProps<EvaluatedNumberInput> & Pick<Props, "erreur">) {
  const { min, max, pas } = bornesDeSaisie(champ.id);
  return (
    <Input
      label={champ.label}
      state={erreur ? "error" : "default"}
      stateRelatedMessage={erreur}
      hintText={champ.description}
      disabled={champ.disabled && !erreur}
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
        min,
        max,
        step: pas,
        value: champ.value ?? champ.defaultValue ?? "",
        onChange: (e) => onChange(Number(e.target.value)),
        autoFocus: champ.autofocus,
      }}
    />
  );
}

// Les saisies libres : les douze champs d'adresse, les précisions en texte, et
// les six dates de la v9.7. Le modèle les déclare toutes en `type: texte` — il ne
// connaît pas la date —, et c'est le contrat d'interface qui distingue les
// calendaires (`formes-de-saisie.ts`). Sans cette distinction, le prescripteur
// taperait une date à la main, dans un format que l'application aurait à deviner
// pour en tirer une durée ou un rang de jour.
//
// Le modèle ne vérifie ni ne normalise rien : ni les adresses, ni les dates. Un
// `<input type="date">` garantit au moins le format ISO que le calcul attend.
function SaisieTexte({ champ, onChange }: ChampProps<EvaluatedStringInput>) {
  return (
    <Input
      label={champ.label}
      hintText={champ.description}
      disabled={champ.disabled}
      classes={{ label: "fr-text--lead" }}
      style={typeHtml(champ.id) === "text" ? undefined : { maxWidth: "16rem" }}
      nativeInputProps={{
        id: champ.id,
        name: champ.id,
        type: typeHtml(champ.id),
        value: champ.value ?? "",
        onChange: (e) => onChange(e.target.value),
        autoFocus: champ.autofocus,
      }}
    />
  );
}

// Le type HTML d'une saisie libre. `datetime-local` et non `datetime` : c'est le
// seul des deux que les navigateurs rendent, et il donne une heure locale — celle
// de l'établissement, qui est bien ce qu'on demande.
function typeHtml(id: string): "text" | "date" | "datetime-local" {
  const forme = formeDeSaisie(id);
  if (forme === "date") return "date";
  if (forme === "datetime") return "datetime-local";
  return "text";
}
