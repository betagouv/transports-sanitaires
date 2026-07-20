import type { Situation } from "publicodes";
import { engine } from "../simulateur/engine";

type Props = {
  situation: Situation<string>;
  onContinuer: () => void;
  onRecommencer: () => void;
};

// Page Résultat 1 — résultat médical du transport. Le transport prescrit est
// figé ici : le secrétariat ne peut plus le modifier (verrou structurel — il ne
// pose aucune question de Partie 1).
export function ResultatMedical({ situation, onContinuer, onRecommencer }: Props) {
  const e = engine.setSituation(situation);
  const favorable = e.evaluate("resultat_medical").nodeValue === "favorable";
  const transport = String(
    e.evaluate("transport_sanitaire_prescrit").nodeValue ?? ""
  );
  const partie2Requise = e.evaluate("partie_2_requise").nodeValue === "oui";

  const labelSuite = partie2Requise
    ? "Compléter la partie administrative"
    : "Voir le document à remettre au patient";

  return (
    <div>
      <div
        className={`fr-alert fr-alert--${favorable ? "success" : "error"}`}
        style={{ marginBottom: "2rem" }}
      >
        <h3 className="fr-alert__title">
          {favorable
            ? "Avis médical favorable"
            : "Transport non justifié médicalement"}
        </h3>
        {favorable ? (
          <p>
            L'état de santé du patient justifie le transport sanitaire suivant :{" "}
            {transport}.
          </p>
        ) : (
          <p>
            Les informations renseignées ne permettent pas de justifier une
            prescription médicale de transport.
          </p>
        )}
      </div>

      <div className="fr-btns-group fr-btns-group--inline">
        <button className="fr-btn fr-btn--secondary" onClick={onRecommencer}>
          Nouvelle simulation
        </button>
        <button className="fr-btn" onClick={onContinuer}>
          {labelSuite}
        </button>
      </div>
    </div>
  );
}
