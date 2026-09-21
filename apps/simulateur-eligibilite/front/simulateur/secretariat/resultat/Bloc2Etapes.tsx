// Bloc 2 de la Page Résultat 2 — information destinée au patient : ce qu'il reste
// à sa charge, ce qu'il doit faire maintenant, et le rappel de ce qui justifie son
// transport. Le contenu en langage clair vient de `resultat/` ; ce module choisit
// quoi dire selon le cas final et le transport retenu.

import { type moteur, vrai } from "../../moteur";
import {
  ExplicationTransportImpossible,
  PourquoiCeTransport,
  SousTitre,
} from "../../resultat/InformationPatient";
import {
  CAS_PARTICULIERS,
  CRITERES,
  retenus,
} from "../../resultat/Vulgarisation";
import { type Article80, Article80Patient } from "./Article80";
import { EtapesPatient } from "./EtapesPatient";
import { InformationUrgencePmt } from "./urgence-attestee";

// Prise en charge / reste à charge, formulation propre à chaque cas final.
const RESTE_A_CHARGE: Record<string, string> = {
  "prescription médicale de transport":
    "Votre transport peut être pris en charge par l’Assurance Maladie selon les règles applicables à votre situation. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "prescription S3141":
    "Votre transport peut être pris en charge par l’Assurance Maladie selon les règles applicables aux permissions temporaires de sortie. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "demande d’accord préalable":
    "Votre transport peut être pris en charge par l’Assurance Maladie uniquement si l’accord préalable est obtenu. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "convocation ou avis d’audience":
    "La convocation ou l’avis d’audience sert de document patient pour votre transport. La prise en charge dépend des règles applicables à cette convocation ou à cet avis. Un reste à charge peut exister selon votre situation.",
  // Texte livré mot pour mot (contrat v9.7.2, `remaining_cost`).
  "orientation vers la caisse pour accord préalable":
    "À ce stade, le simulateur ne peut pas déterminer le montant qui restera à votre charge. Contactez votre caisse d’Assurance Maladie pour connaître les conditions de prise en charge applicables à ce trajet.",
  "transport à la charge de l’établissement":
    "Ce transport est à la charge de l’établissement de santé. Le service ou le secrétariat de l’établissement vous indiquera les modalités d’organisation applicables.",
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

// Une ALD déclarée qui n'ouvre pas le droit : le patient pourrait croire qu'elle
// suffit. Le modèle dit qu'elle ne le fait pas, et c'est cette conclusion-là
// qu'il faut lui expliquer — indépendamment du cas final, qu'un autre motif peut
// très bien avoir ouvert.
//
// La v9.5.1 portait une cible pour ce constat
// (`cible_ald_non_retenue_absence_incapacite_deficience`) ; la v9.7 l'a retirée
// et ne dit plus que le résultat — l'ALD ouvre le droit, ou non. Le constat se
// reconstitue donc de la déclaration et de son effet.
function AldNonRetenue({ e }: Pick<Props, "e">) {
  if (!vrai(e, "p1_m0_ald") || vrai(e, "cible_situation_ald")) return null;
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
