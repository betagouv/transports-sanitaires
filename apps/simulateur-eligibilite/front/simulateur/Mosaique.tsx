import type { EvaluatedFormElement, FormPageElementProp } from "@publicodes/forms";
import { valeurBool } from "./mosaique";

type OptionField = EvaluatedFormElement & FormPageElementProp;

type Props = {
  question: string;
  // Éléments booléens des options présents sur la page courante.
  options: OptionField[];
  // Option d'exclusivité « aucun » (état dérivé : toutes les options décochées).
  aucun?: { label: string; coche: boolean };
  onToggleOption: (id: string, coche: boolean) => void;
  onToggleAucun?: (coche: boolean) => void;
};

// Rend une question à choix multiple : un `fieldset` de cases à cocher, à partir
// de N règles booléennes regroupées par une mosaïque (cf. `mosaique.ts`).
export function Mosaique({
  question,
  options,
  aucun,
  onToggleOption,
  onToggleAucun,
}: Props) {
  return (
    <fieldset
      className="fr-fieldset"
      style={{ marginBottom: "1.5rem" }}
      aria-labelledby="mosaique-legend"
    >
      <legend
        className="fr-fieldset__legend fr-text--regular"
        id="mosaique-legend"
      >
        {question}
      </legend>
      <div className="fr-fieldset__content">
        {options.map((opt) => {
          const coche = valeurBool(opt) === true;
          return (
            <div
              className="fr-checkbox-group fr-checkbox-group--sm"
              key={opt.id}
            >
              <input
                type="checkbox"
                id={`mosaique-${opt.id}`}
                name={opt.id}
                checked={coche}
                disabled={opt.disabled}
                onChange={(e) => onToggleOption(opt.id, e.target.checked)}
              />
              <label className="fr-label" htmlFor={`mosaique-${opt.id}`}>
                {opt.label}
              </label>
            </div>
          );
        })}

        {aucun && onToggleAucun && (
          <div className="fr-checkbox-group fr-checkbox-group--sm">
            <input
              type="checkbox"
              id="mosaique-aucun"
              name="mosaique-aucun"
              checked={aucun.coche}
              onChange={(e) => onToggleAucun(e.target.checked)}
            />
            <label className="fr-label" htmlFor="mosaique-aucun">
              {aucun.label}
            </label>
          </div>
        )}
      </div>
    </fieldset>
  );
}
