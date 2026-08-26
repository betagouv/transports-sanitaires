// Bloc 2 de la Page Résultat 2 — information destinée au patient : ce qu'il reste
// à sa charge, ce qu'il doit faire maintenant, et le rappel de ce qui justifie son
// transport. Le contenu en langage clair vient de `resultat/` ; ce module choisit
// quoi dire selon le cas final et le transport retenu.

import { type moteur, vrai } from "../moteur";
import {
  ExplicationTransportImpossible,
  PourquoiCeTransport,
  SousTitre,
} from "../resultat/InformationPatient";
import { CAS_PARTICULIERS, CRITERES, retenus } from "../resultat/Vulgarisation";
import { type Article80, Article80Patient } from "./Article80";
import { EtapesPatient } from "./EtapesPatient";
import { InformationUrgencePmt } from "./urgence-attestee";

// Prise en charge / reste à charge, formulation propre à chaque cas final.
const RESTE_A_CHARGE: Record<string, string> = {
  "prescription médicale de transport":
    "Votre transport peut être pris en charge par l’Assurance Maladie selon les règles applicables à votre situation. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "demande d’accord préalable":
    "Votre transport peut être pris en charge par l’Assurance Maladie uniquement si l’accord préalable est obtenu. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "convocation ou avis d’audience":
    "La convocation ou l’avis d’audience sert de document patient pour votre transport. La prise en charge dépend des règles applicables à cette convocation ou à cet avis. Un reste à charge peut exister selon votre situation.",
  "transport à la charge de l’établissement":
    "Ce transport est à la charge de l’établissement de santé. Le service ou le secrétariat de l’établissement vous indiquera les modalités d’organisation applicables.",
  "prestation non prise en charge par l’Assurance Maladie":
    "La prestation à l’origine du déplacement n’étant pas prise en charge par l’Assurance Maladie, le transport ne peut pas être pris en charge, même si un mode de transport est médicalement adapté. N’adressez aucune demande de remboursement à votre caisse pour ce déplacement.",
  SMUR: "Ce transport est organisé dans le cadre de l’urgence médicale. Les éventuelles informations de facturation ou de prise en charge sont communiquées par l’établissement concerné.",
  "bariatrique seul":
    "Aucune prise en charge par l’Assurance Maladie n’est ouverte au titre du seul motif bariatrique. Les solutions éventuelles et leur coût doivent être vus avec le service médical ou le secrétariat.",
  "permission de sortie sans motif médical":
    "Le transport reste à votre charge.",
  "non éligible à une prise en charge par l’Assurance Maladie":
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
        <AldNonRetenue e={e} />
        <SousTitre icone="fr-icon-money-euro-circle-line">
          Prise en charge / reste à charge
        </SousTitre>
        <p>{RESTE_A_CHARGE[casFinal] ?? ""}</p>
        <UrgenceAttestee e={e} casFinal={casFinal} />
        <SousTitre icone="fr-icon-todo-line">
          Ce que vous devez faire maintenant
        </SousTitre>
        <EtapesPatient
          casFinal={casFinal}
          urgenceAttestee={vrai(e, "cible_urgence_attestee")}
          {...contexte}
        />
        <OrganisationEtDefraiement casFinal={casFinal} article80={article80} />
      </div>
    </div>
  );
}

// ---- implémentation ----

// Une ALD reconnue et liée aux soins, mais sans incapacité ni déficience : le
// patient a déclaré une ALD et pourrait croire qu'elle ouvre le droit à elle
// seule. Le modèle dit qu'elle ne le fait pas, et c'est cette conclusion-là qu'il
// faut lui expliquer — indépendamment du cas final, qu'un autre motif peut très
// bien avoir ouvert.
function AldNonRetenue({ e }: Pick<Props, "e">) {
  if (!vrai(e, "cible_ald_non_retenue_absence_incapacite_deficience"))
    return null;
  return (
    <>
      <SousTitre icone="fr-icon-info-line">
        Information relative à l’ALD (Affection de Longue Durée)
      </SousTitre>
      <p>
        L’ALD (Affection de Longue Durée) est reconnue et le déplacement est lié
        aux soins ou examens concernés.
      </p>
      <p>
        Toutefois, l’absence d’incapacité ou de déficience définie par le
        référentiel ne permet pas de retenir l’ALD (Affection de Longue Durée)
        comme motif de prise en charge du transport.
      </p>
    </>
  );
}

// L'urgence attestée sur une PMT : rien à attendre, mais le patient doit savoir
// que le motif a été retenu. Sur une DAP, l'urgence se dit dans la marche à
// suivre elle-même — la variante urgente d'`EtapesPatient` —, pas ici : ce sont
// les démarches qu'elle change.
function UrgenceAttestee({ e, casFinal }: Pick<Props, "e" | "casFinal">) {
  const pmt = casFinal === "prescription médicale de transport";
  if (!pmt || !vrai(e, "cible_urgence_attestee")) return null;
  return <InformationUrgencePmt />;
}

// L'article 80 encadre les transports à charge de l'établissement : qui les
// organise, et comment ils sont défrayés. Muet pour tous les autres cas finaux.
function OrganisationEtDefraiement({
  casFinal,
  article80,
}: Pick<Props, "casFinal" | "article80">) {
  if (casFinal !== "transport à la charge de l’établissement") return null;
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
        casParticuliers={retenus(e, CAS_PARTICULIERS)}
        titreCasParticuliers="Cas particuliers médicaux retenus"
      />
    </>
  );
}
