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
        <fieldset
          className="fr-fieldset"
          id={`fieldset-${id}`}
          aria-labelledby={`legend-${id}`}
          disabled={field.disabled}
        >
          <legend
            className="fr-fieldset__legend fr-text--regular"
            id={`legend-${id}`}
          >
            {label}
            {description && (
              <span className="fr-hint-text">{description}</span>
            )}
          </legend>
          <div className="fr-fieldset__content">
            {field.options.map((opt) => (
              <div className="fr-radio-group fr-radio-group--sm" key={String(opt.value)}>
                <input
                  type="radio"
                  id={`${id}-${opt.value}`}
                  name={id}
                  value={String(opt.value)}
                  checked={(field.value as unknown) === opt.value}
                  onChange={() => onChange(opt.value)}
                  autoFocus={field.autofocus && field.value === undefined}
                />
                <label className="fr-label" htmlFor={`${id}-${opt.value}`}>
                  {opt.label}
                </label>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      {element === "input" && field.type === "number" && (
        <div className="fr-input-group">
          <label className="fr-label" htmlFor={id}>
            {label}
            {description && <span className="fr-hint-text">{description}</span>}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              className="fr-input"
              type="number"
              id={id}
              name={id}
              min={0}
              value={field.value ?? field.defaultValue ?? ""}
              onChange={(e) => onChange(Number(e.target.value))}
              disabled={field.disabled}
              autoFocus={field.autofocus}
              style={{ maxWidth: "12rem" }}
            />
            {field.unit && <span>{field.unit}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
