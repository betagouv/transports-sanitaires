import type { Situation } from "publicodes";
import { engine } from "../simulateur/engine";
import { TraceDebug } from "../simulateur/TraceDebug";
import { CRITERES, MOTIFS, retenus } from "../simulateur/vulgarisation";
import {
  ExplicationTransportImpossible,
  PourquoiCeTransport,
} from "../simulateur/information-patient";

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

  const criteresRetenus = favorable ? retenus(e, CRITERES) : [];
  const motifsRetenus = favorable ? retenus(e, MOTIFS) : [];

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

      <div className="fr-callout" style={{ marginBottom: "2rem" }}>
        <h3 className="fr-callout__title">
          <span
            className="fr-icon-information-line fr-mr-1w"
            aria-hidden="true"
          />
          Information destinée au patient
        </h3>

        {favorable ? (
          <div className="fr-callout__text">
            <p>
              Votre médecin vient de confirmer que votre état de santé justifie
              un transport adapté.
            </p>
            <p>
              Le transport retenu est : <strong>{transport}</strong>.
            </p>

            <PourquoiCeTransport
              titreExplication="Quelques explications"
              criteres={criteresRetenus}
              titreCriteres="Le ou les critères médicaux retenus sont les suivants"
              motifs={motifsRetenus}
              titreMotifs="Le ou les motifs ouvrant droit identifiés ou déduits sont les suivants"
            />
          </div>
        ) : (
          <div className="fr-callout__text">
            <ExplicationTransportImpossible />
          </div>
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

      <TraceDebug
        titre="résultat médical"
        situation={situation}
        sorties={[
          "resultat_medical",
          "transport_sanitaire_prescrit",
          "partie_2_requise",
          "cas_final",
        ]}
      />
    </div>
  );
}
