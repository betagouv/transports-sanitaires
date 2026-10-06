// Rend une question du parcours selon sa forme : choix unique, choix multiple,
// nombre, texte ou date.

import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { ChoixMultiple } from "./ChoixMultiple";
import type {
  ChoixUnique,
  Question,
  Reponse,
  SaisieNombre,
  SaisieTexte,
} from "./question";

type Props = {
  question: Question;
  reponse: Reponse | undefined;
  /** `undefined` retire la réponse : un champ vidé n'est plus répondu. */
  onChange: (reponse: Reponse | undefined) => void;
  /** Ce qui ne va pas dans la saisie, affiché sous le champ. */
  erreur?: string;
  /** Le champ prend le focus à l'ouverture de la page. */
  focus?: boolean;
};

// La `question` est passée déjà restreinte à chaque sous-composant : c'est le
// `switch` ci-dessous qui porte le narrowing de l'union, pas les composants.
export function ChampDeFormulaire({ question, ...props }: Props) {
  return (
    <div className="fr-form-group" style={{ marginBottom: "1.5rem" }}>
      {rendre(question, props)}
    </div>
  );
}

// ---- implémentation ----

type ChampProps<Q> = Omit<Props, "question"> & { question: Q };

function rendre(question: Question, props: Omit<Props, "question">) {
  switch (question.forme) {
    case "choix unique":
      return <ChoixRadio question={question} {...props} />;
    case "choix multiple":
      return <ChoixMultiple question={question} {...props} />;
    case "nombre":
      return <SaisieDeNombre question={question} {...props} />;
    default:
      return <SaisieDeTexte question={question} {...props} />;
  }
}

function ChoixRadio({
  question,
  reponse,
  onChange,
  focus,
}: ChampProps<ChoixUnique>) {
  return (
    <RadioButtons
      id={`fieldset-${question.id}`}
      name={question.id}
      legend={question.libelle}
      hintText={question.aide}
      // Variante « riche » DSFR : chaque option est une carte bordée, avec
      // fond gris + curseur pointeur au survol. Le picto (`fr-radio-rich__img`)
      // est facultatif, on l'omet donc. `classes.inputGroup` ajoute la classe à
      // chaque groupe (le composant ne pose `fr-radio-rich` de lui-même que si
      // une option fournit une `illustration`). Incompatible avec `small`.
      // `legend` porte la question elle-même, mise en avant en `fr-text--lead`.
      classes={{ inputGroup: "fr-radio-rich", legend: "fr-text--lead" }}
      options={question.options.map((option, rang) => ({
        label: option.libelle,
        nativeInputProps: {
          value: option.valeur,
          checked: reponse === option.valeur,
          onChange: () => onChange(option.valeur),
          autoFocus: focus && rang === 0,
        },
      }))}
    />
  );
}

// Une erreur s'affiche sous la saisie sans la toucher : la valeur reste celle
// tapée, à corriger par le prescripteur.
function SaisieDeNombre({
  question,
  reponse,
  onChange,
  erreur,
  focus,
}: ChampProps<SaisieNombre>) {
  return (
    <Input
      label={question.libelle}
      state={erreur ? "error" : "default"}
      stateRelatedMessage={erreur}
      hintText={question.aide}
      classes={{ label: "fr-text--lead" }}
      style={{ maxWidth: "16rem" }}
      addon={
        question.unite ? (
          <span className="fr-label" style={{ whiteSpace: "nowrap" }}>
            {question.unite}
          </span>
        ) : undefined
      }
      nativeInputProps={{
        id: question.id,
        name: question.id,
        type: "number",
        min: question.min,
        max: question.max,
        value: typeof reponse === "number" ? reponse : "",
        onChange: (e) => onChange(nombreSaisi(e.target.value)),
        autoFocus: focus,
      }}
    />
  );
}

// Un champ vidé rend une chaîne vide : ce n'est pas zéro, c'est une absence.
function nombreSaisi(saisie: string): number | undefined {
  return saisie.trim() === "" ? undefined : Number(saisie);
}

// Un `<input type="date">` garantit le format ISO, que l'application n'a alors
// pas à deviner pour en tirer une durée ou un rang de jour.
function SaisieDeTexte({
  question,
  reponse,
  onChange,
  erreur,
  focus,
}: ChampProps<SaisieTexte>) {
  const type = TYPE_HTML[question.forme];
  return (
    <Input
      label={question.libelle}
      hintText={question.aide}
      state={erreur ? "error" : "default"}
      stateRelatedMessage={erreur}
      classes={{ label: "fr-text--lead" }}
      style={type === "text" ? undefined : { maxWidth: "16rem" }}
      nativeInputProps={{
        id: question.id,
        name: question.id,
        type,
        value: typeof reponse === "string" ? reponse : "",
        onChange: (e) => onChange(e.target.value || undefined),
        autoFocus: focus,
      }}
    />
  );
}

// `datetime-local` et non `datetime` : c'est le seul des deux que les
// navigateurs rendent, et il donne une heure locale.
const TYPE_HTML = {
  texte: "text",
  date: "date",
  "date et heure": "datetime-local",
} as const;
