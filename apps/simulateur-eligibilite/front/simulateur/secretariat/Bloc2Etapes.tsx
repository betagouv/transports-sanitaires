// Bloc 2 de la Page Résultat 2 — information destinée au patient : ce qu'il reste
// à sa charge, ce qu'il doit faire maintenant, et le rappel de ce qui justifie son
// transport. Le contenu en langage clair vient de `resultat/` ; ce module choisit
// quoi dire selon le cas final et le transport retenu.

import type { moteur } from "../moteur";
import {
  ExplicationTransportImpossible,
  PourquoiCeTransport,
  SousTitre,
} from "../resultat/InformationPatient";
import { CRITERES, MOTIFS, retenus } from "../resultat/Vulgarisation";
import { type Article80, Article80Patient } from "./Article80";
import { EtapesPatient } from "./EtapesPatient";

// Prise en charge / reste à charge, formulation propre à chaque cas final.
const RESTE_A_CHARGE: Record<string, string> = {
  "prescription médicale de transport":
    "Votre transport peut être pris en charge par l’Assurance Maladie selon les règles applicables à votre situation. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "demande accord préalable":
    "Votre transport peut être pris en charge par l’Assurance Maladie uniquement si l’accord préalable est obtenu. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "convocation ou avis audience":
    "La convocation ou l’avis d’audience sert de document patient pour votre transport. La prise en charge dépend des règles applicables à cette convocation ou à cet avis. Un reste à charge peut exister selon votre situation.",
  "transport charge établissement":
    "Ce transport est à la charge de l’établissement de santé. Le service ou le secrétariat de l’établissement vous indiquera les modalités d’organisation applicables.",
  "prestation non prise en charge par assurance maladie":
    "La prestation à l’origine du déplacement n’étant pas prise en charge par l’Assurance Maladie, le transport ne peut pas être pris en charge, même si un mode de transport est médicalement adapté. N’adressez aucune demande de remboursement à votre caisse pour ce déplacement.",
  SMUR: "Ce transport est organisé dans le cadre de l’urgence médicale. Les éventuelles informations de facturation ou de prise en charge sont communiquées par l’établissement concerné.",
  "bariatrique seul":
    "Aucune prise en charge par l’Assurance Maladie n’est ouverte au titre du seul motif bariatrique. Les solutions éventuelles et leur coût doivent être vus avec le service médical ou le secrétariat.",
  "permission sortie sans motif médical": "Le transport reste à votre charge.",
  "non éligible assurance maladie dans ce parcours":
    "Le transport reste à votre charge.",
};

type Props = {
  e: typeof moteur;
  casFinal: string;
  transport: string;
  transportPrescrit: boolean;
  article80: Article80;
};

export function Bloc2Etapes({ e, casFinal, article80, ...contexte }: Props) {
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
        <PourquoiCeResultat e={e} {...contexte} />
        <SousTitre icone="fr-icon-money-euro-circle-line">
          Prise en charge / reste à charge
        </SousTitre>
        <p>{RESTE_A_CHARGE[casFinal] ?? ""}</p>
        <SousTitre icone="fr-icon-todo-line">
          Ce que vous devez faire maintenant
        </SousTitre>
        <EtapesPatient casFinal={casFinal} {...contexte} />
        <OrganisationEtDefraiement casFinal={casFinal} article80={article80} />
      </div>
    </div>
  );
}

// ---- implémentation ----

// L'article 80 encadre les transports à charge de l'établissement : qui les
// organise, et comment ils sont défrayés. Muet pour tous les autres cas finaux.
function OrganisationEtDefraiement({
  casFinal,
  article80,
}: Pick<Props, "casFinal" | "article80">) {
  if (casFinal !== "transport charge établissement") return null;
  return (
    <>
      <SousTitre icone="fr-icon-bank-line">
        Organisation et défraiement
      </SousTitre>
      <Article80Patient article80={article80} />
    </>
  );
}

// Pourquoi ce transport — ou, faute de transport prescrit, pourquoi aucun.
function PourquoiCeResultat({
  e,
  transport,
  transportPrescrit,
}: Omit<Props, "casFinal" | "article80">) {
  return transportPrescrit ? (
    <TransportJustifie e={e} transport={transport} />
  ) : (
    <ExplicationTransportImpossible />
  );
}

function TransportJustifie({ e, transport }: Pick<Props, "e" | "transport">) {
  return (
    <>
      <p>
        Votre médecin a retenu le transport suivant :{" "}
        <strong>{transport}</strong>.
      </p>
      <PourquoiCeTransport
        titreExplication="Pourquoi ce transport ?"
        criteres={retenus(e, CRITERES)}
        titreCriteres="Critères médicaux retenus"
        motifs={retenus(e, MOTIFS)}
        titreMotifs="Motifs ouvrant droit identifiés ou déduits"
      />
    </>
  );
}
