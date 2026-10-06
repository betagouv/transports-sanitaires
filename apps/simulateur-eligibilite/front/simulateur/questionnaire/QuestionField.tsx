// Rend une question du questionnaire par le champ de `front/ui/` qui convient à sa
// forme : choix unique, choix multiple, nombre, texte ou date.

import { CheckboxField } from "../../ui/CheckboxField";
import { DateField } from "../../ui/DateField";
import { NumberField } from "../../ui/NumberField";
import { RadioField } from "../../ui/RadioField";
import { TextField } from "../../ui/TextField";
import type { Answer, MultipleChoice, Question } from "./question";

type Props = {
  question: Question;
  answer: Answer | undefined;
  /** `undefined` retire la réponse : un champ vidé n'est plus répondu. */
  onChange: (answer: Answer | undefined) => void;
  /** Ce qui ne va pas dans la saisie, affiché sous le champ. */
  error?: string;
  /** Le champ prend le focus à l'ouverture de la page. */
  autoFocus?: boolean;
};

export function QuestionField(props: Props) {
  return (
    <div className="fr-form-group" style={{ marginBottom: "1.5rem" }}>
      {render(props)}
    </div>
  );
}

// ---- implémentation ----

// Ce que tous les champs reçoivent. Le libellé est mis en avant : sur une page
// du questionnaire, c'est lui qui porte la question.
function common({ question, error, autoFocus }: Props) {
  return {
    id: question.id,
    label: question.label,
    hint: question.hint,
    error,
    autoFocus,
    lead: true,
  };
}

function render(props: Props) {
  const { question, answer, onChange } = props;
  switch (question.kind) {
    case "single choice":
      return (
        <RadioField
          {...common(props)}
          options={question.options}
          value={typeof answer === "string" ? answer : undefined}
          onChange={onChange}
        />
      );
    case "multiple choice":
      return <MultipleChoiceField {...props} question={question} />;
    case "number":
      return (
        <NumberField
          {...common(props)}
          min={question.min}
          max={question.max}
          unit={question.unit}
          value={typeof answer === "number" ? answer : undefined}
          onChange={onChange}
        />
      );
    default:
      return <TextOrDateField {...props} kind={question.kind} />;
  }
}

// Plus rien de coché n'est pas une réponse vide : c'est une absence de réponse.
function MultipleChoiceField(props: Props & { question: MultipleChoice }) {
  const { question, answer, onChange } = props;
  return (
    <CheckboxField
      {...common(props)}
      options={question.options}
      exclusiveOption={question.exclusiveOption}
      values={Array.isArray(answer) ? answer : []}
      onChange={(values) => onChange(values.length > 0 ? values : undefined)}
    />
  );
}

function TextOrDateField({
  kind,
  ...props
}: Props & { kind: "text" | "date" | "datetime" }) {
  const shared = {
    ...common(props),
    value: typeof props.answer === "string" ? props.answer : "",
    onChange: (value: string) => props.onChange(value || undefined),
  };
  if (kind === "text") return <TextField {...shared} />;
  return <DateField {...shared} withTime={kind === "datetime"} />;
}
