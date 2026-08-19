import type { Situation } from "publicodes";
import { moteur, texte } from "../moteur";
import {
  ExplicationTransportImpossible,
  PourquoiCeTransport,
} from "../resultat/InformationPatient";
import { TraceDebug } from "../resultat/TraceDebug";
import { CRITERES, MOTIFS, retenus } from "../resultat/Vulgarisation";

type Props = {
  situation: Situation<string>;
  onContinuer: () => void;
  onRecommencer: () => void;
};

// Page Résultat 1 — résultat médical du transport. Le transport prescrit est
// figé ici : le secrétariat ne peut plus le modifier (verrou structurel — il ne
// pose aucune question de Partie 1).
export function ResultatMedical({
  situation,
  onContinuer,
  onRecommencer,
}: Props) {
  const e = moteur.setSituation(situation);
  const favorable = texte(e, "cible_resultat_medical") === "favorable";
  const transport = texte(e, "cible_transport_sanitaire_prescrit");
  const partie2Requise = texte(e, "cible_partie_2_requise") === "oui";

  return (
    <div>
      <Verdict favorable={favorable} transport={transport} />
      <InformationPatient e={e} favorable={favorable} transport={transport} />
      <Actions
        labelSuite={
          partie2Requise
            ? "Compléter la partie administrative"
            : "Voir le document à remettre au patient"
        }
        onContinuer={onContinuer}
        onRecommencer={onRecommencer}
      />
      <TraceDebug
        titre="résultat médical"
        situation={situation}
        sorties={[
          "cible_resultat_medical",
          "cible_transport_sanitaire_prescrit",
          "cible_partie_2_requise",
          "cible_cas_final",
        ]}
      />
    </div>
  );
}

// ---- implémentation ----

function Verdict({
  favorable,
  transport,
}: {
  favorable: boolean;
  transport: string;
}) {
  return (
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
  );
}

function InformationPatient({
  e,
  favorable,
  transport,
}: {
  e: typeof moteur;
  favorable: boolean;
  transport: string;
}) {
  return (
    <div className="fr-callout" style={{ marginBottom: "2rem" }}>
      <h3 className="fr-callout__title">
        <span
          className="fr-icon-information-line fr-mr-1w"
          aria-hidden="true"
        />
        Information destinée au patient
      </h3>
      <div className="fr-callout__text">
        {favorable ? (
          <TransportRetenu e={e} transport={transport} />
        ) : (
          <ExplicationTransportImpossible />
        )}
      </div>
    </div>
  );
}

function TransportRetenu({
  e,
  transport,
}: {
  e: typeof moteur;
  transport: string;
}) {
  return (
    <>
      <p>
        Votre médecin vient de confirmer que votre état de santé justifie un
        transport adapté.
      </p>
      <p>
        Le transport retenu est : <strong>{transport}</strong>.
      </p>
      <PourquoiCeTransport
        titreExplication="Quelques explications"
        criteres={retenus(e, CRITERES)}
        titreCriteres="Le ou les critères médicaux retenus sont les suivants"
        motifs={retenus(e, MOTIFS)}
        titreMotifs="Le ou les motifs ouvrant droit identifiés ou déduits sont les suivants"
      />
    </>
  );
}

function Actions({
  labelSuite,
  onContinuer,
  onRecommencer,
}: {
  labelSuite: string;
  onContinuer: () => void;
  onRecommencer: () => void;
}) {
  return (
    <div className="fr-btns-group fr-btns-group--inline">
      <button
        type="button"
        className="fr-btn fr-btn--secondary"
        onClick={onRecommencer}
      >
        Nouvelle simulation
      </button>
      <button type="button" className="fr-btn" onClick={onContinuer}>
        {labelSuite}
      </button>
    </div>
  );
}
