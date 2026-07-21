import type { Situation } from "publicodes";
import { engine } from "../simulateur/engine";
import { TraceDebug } from "../simulateur/TraceDebug";

type Props = {
  situation: Situation<string>;
  onContinuer: () => void;
  onRecommencer: () => void;
};

type Item = { id: string; label: string; description: string };

// Critères médicaux retenus — descriptions vulgarisées destinées au patient.
// L'ordre suit la mosaïque `p1_critere` du modèle publicodes.
const CRITERES: Item[] = [
  {
    id: "p1_critere_regles_hygiene",
    label: "Respect rigoureux de règles d’hygiène",
    description:
      "Votre état nécessite des conditions de transport limitant les risques liés à l’hygiène pendant le trajet.",
  },
  {
    id: "p1_critere_risques_effets_secondaires",
    label: "Risques d’effets secondaires pendant le transport",
    description:
      "Votre état peut entraîner un malaise, une fatigue importante ou une réaction nécessitant un transport plus encadré.",
  },
  {
    id: "p1_critere_fauteuil_sans_transfert",
    label: "Transport sans quitter le fauteuil roulant manuel ou électrique",
    description:
      "Le transport doit être adapté à votre fauteuil roulant et permettre le trajet sans transfert vers un siège classique.",
  },
  {
    id: "p1_critere_position_allongee_demi_assise",
    label: "Position allongée ou demi-assise",
    description:
      "Votre état ne permet pas un transport assis classique pendant le trajet.",
  },
  {
    id: "p1_critere_brancardage_portage",
    label: "Brancardage ou portage",
    description:
      "Votre état nécessite une aide physique importante pour être installé, déplacé ou transféré.",
  },
  {
    id: "p1_critere_surveillance_personne_qualifiee",
    label: "Surveillance par une personne qualifiée",
    description:
      "Votre état nécessite une surveillance particulière pendant le transport.",
  },
  {
    id: "p1_critere_oxygene",
    label: "Oxygène pendant le transport",
    description:
      "Votre état nécessite la présence ou l’administration d’oxygène pendant le trajet.",
  },
  {
    id: "p1_critere_asepsie",
    label: "Conditions d’asepsie",
    description:
      "Votre état impose des conditions renforcées pour éviter un risque infectieux ou protéger votre santé.",
  },
  {
    id: "p1_critere_aucune_situation_encadree",
    label: "Aucune situation nécessitant une prise en charge plus encadrée",
    description:
      "Les informations renseignées ne montrent pas de besoin médical imposant une ambulance, un VSL, un taxi conventionné ou un véhicule adapté au fauteuil roulant.",
  },
];

// Motifs ouvrant droit identifiés ou déduits — mêmes règles que
// `p1_motif_ouvrant_droit_identifie_ou_deduit` du modèle publicodes.
const MOTIFS: Item[] = [
  {
    id: "p1_motif_hospitalisation",
    label: "Entrée ou sortie d’hospitalisation",
    description:
      "Le transport est lié à une hospitalisation, par exemple pour entrer à l’hôpital, en sortir, ou dans le cadre d’une prise en charge hospitalière.",
  },
  {
    id: "p1_motif_seance_chimio_radio_hemodialyse",
    label: "Séance de chimiothérapie, radiothérapie ou hémodialyse",
    description:
      "Le transport est lié à une séance de soins répétée ou spécialisée.",
  },
  {
    id: "p1_ald_validee",
    label: "Soins ou examens en lien avec une ALD — Affection de Longue Durée",
    description:
      "Le transport est lié à une maladie reconnue comme affection de longue durée, lorsque les conditions médicales nécessaires sont remplies.",
  },
  {
    id: "p1_motif_accident_travail_maladie_professionnelle",
    label: "Accident du travail ou maladie professionnelle",
    description:
      "Le transport est lié à des soins en rapport avec un accident du travail ou une maladie professionnelle.",
  },
  {
    id: "p1_motif_retour_etablissement_penitentiaire",
    label: "Retour vers établissement pénitentiaire avec prescription médicale",
    description:
      "Le transport concerne le retour vers un établissement pénitentiaire et repose sur une prescription médicale.",
  },
  {
    id: "p1_critere_ambulance",
    label: "Transport par ambulance justifié par l’état de santé du patient",
    description:
      "Votre état nécessite un transport en ambulance, par exemple en raison d’une position allongée, d’une surveillance, d’oxygène, d’un brancardage ou de conditions d’asepsie.",
  },
  {
    id: "p1_situation_smur",
    label: "Transport par équipe SMUR — Structure Mobile d’Urgence et de Réanimation",
    description:
      "Votre état nécessite l’intervention d’une équipe médicale d’urgence pendant le transport.",
  },
];

function retenus(e: typeof engine, items: Item[]): Item[] {
  return items.filter((item) => e.evaluate(item.id).nodeValue === true);
}

function ListeVulgarisee({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} style={{ marginBottom: "0.5rem" }}>
          <strong>{item.label}</strong>
          <br />
          {item.description}
        </li>
      ))}
    </ul>
  );
}

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

            <h4 className="fr-h6 fr-mt-3w">
              <span
                className="fr-icon-lightbulb-line fr-mr-1w"
                aria-hidden="true"
              />
              Quelques explications
            </h4>
            <p>
              Ce choix correspond à votre situation au moment du transport et à
              l’aide dont vous avez besoin pendant le trajet.
            </p>

            {criteresRetenus.length > 0 && (
              <>
                <h4 className="fr-h6 fr-mt-3w">
                  <span
                    className="fr-icon-stethoscope-line fr-mr-1w"
                    aria-hidden="true"
                  />
                  Le ou les critères médicaux retenus sont les suivants
                </h4>
                <ListeVulgarisee items={criteresRetenus} />
              </>
            )}

            {motifsRetenus.length > 0 && (
              <>
                <h4 className="fr-h6 fr-mt-3w">
                  <span
                    className="fr-icon-checkbox-circle-line fr-mr-1w"
                    aria-hidden="true"
                  />
                  Le ou les motifs ouvrant droit identifiés ou déduits sont les
                  suivants
                </h4>
                <ListeVulgarisee items={motifsRetenus} />
              </>
            )}
          </div>
        ) : (
          <div className="fr-callout__text">
            <p>
              Dans votre situation, les informations renseignées ne permettent
              pas à votre médecin de prescrire un transport sanitaire.
            </p>

            <h4 className="fr-h6 fr-mt-3w">
              <span
                className="fr-icon-lightbulb-line fr-mr-1w"
                aria-hidden="true"
              />
              Quelques explications
            </h4>
            <p>
              Pour qu’un transport sanitaire puisse être prescrit, deux éléments
              doivent être réunis :
            </p>

            <p>
              <strong>1. Une situation ouvrant droit à la prise en charge</strong>
              <br />
              Par exemple : une hospitalisation, certains soins liés à une
              affection de longue durée, un accident du travail, une maladie
              professionnelle ou une autre situation prévue par l’Assurance
              Maladie.
            </p>

            <p>
              <strong>2. Un besoin médical de transport adapté</strong>
              <br />
              Par exemple : un besoin d’être transporté en ambulance, en VSL, en
              taxi conventionné, dans un véhicule adapté au fauteuil roulant, ou
              avec un niveau d’aide compatible avec votre état de santé.
            </p>

            <p>
              Dans les informations indiquées, au moins l’un de ces deux éléments
              n’est pas suffisamment établi.
            </p>
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
