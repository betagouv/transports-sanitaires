// « Ce que vous devez faire maintenant » : la marche à suivre remise au patient,
// propre au cas final et — pour la PMT, la DAP et la convocation — au transport
// retenu. Ne consulte pas le moteur.

import { ModalitesDAP, ModalitesPMT } from "./modalites-transport";

type Props = {
  casFinal: string;
  transport: string;
  transportPrescrit: boolean;
};

export function EtapesPatient({ casFinal, ...contexte }: Props) {
  const Etapes = ETAPES[casFinal];
  return Etapes ? <Etapes {...contexte} /> : null;
}

// ---- implémentation ----

type Contexte = Omit<Props, "casFinal">;

function EtapesPMT({ transport }: Contexte) {
  return (
    <ol>
      <li>
        Votre médecin vous remet une{" "}
        <strong>Prescription Médicale de Transport</strong>.
      </li>
      <li>
        Vérifiez que le transport indiqué correspond bien au transport retenu :{" "}
        <strong>{transport}</strong>.
      </li>
      <li>
        Utilisez uniquement le mode de transport indiqué sur la prescription.
      </li>
      <ModalitesPMT transport={transport} />
    </ol>
  );
}

function EtapesDAP({ transport }: Contexte) {
  return (
    <ol>
      <li>
        Votre médecin vous remet une <strong>Demande d’Accord Préalable</strong>
        .
      </li>
      <li>Cette demande vaut aussi prescription médicale de transport.</li>
      <li>
        Vérifiez que le transport demandé correspond bien au transport retenu :{" "}
        <strong>{transport}</strong>.
      </li>
      <li>
        Envoyez la demande à l’Assurance Maladie, à l’attention du
        médecin-conseil.
      </li>
      <li>
        Attendez la réponse de l’Assurance Maladie avant d’organiser le
        transport, sauf urgence.
      </li>
      <li>
        En cas de refus, le transport ne sera pas pris en charge dans les
        conditions demandées.
      </li>
      <ModalitesDAP transport={transport} />
    </ol>
  );
}

function EtapesConvocation({ transport }: Contexte) {
  // En véhicule personnel, le patient organise lui-même son trajet et garde ses
  // justificatifs ; sinon, c'est la convocation qu'il présente au transporteur.
  return transport === "véhicule personnel ou transport en commun" ? (
    <ConvocationVehiculePerso />
  ) : (
    <ConvocationTransporteur transport={transport} />
  );
}

function ConvocationVehiculePerso() {
  return (
    <ol>
      <li>Conservez votre convocation ou votre avis d’audience.</li>
      <li>
        Le transport retenu est :{" "}
        <strong>véhicule personnel ou transport en commun</strong>.
      </li>
      <li>
        Organisez votre trajet selon les indications figurant sur la
        convocation, l’avis ou les consignes données par le service concerné.
      </li>
      <li>Conservez les justificatifs de trajet nécessaires.</li>
      <li>
        Présentez la convocation ou l’avis si un justificatif vous est demandé.
      </li>
    </ol>
  );
}

function ConvocationTransporteur({ transport }: { transport: string }) {
  return (
    <ol>
      <li>Conservez votre convocation ou votre avis d’audience.</li>
      <li>
        Le transport retenu est : <strong>{transport}</strong>.
      </li>
      <li>
        Organisez le transport selon les indications figurant sur la
        convocation, l’avis ou les consignes données par le service concerné.
      </li>
      <li>Présentez la convocation ou l’avis au transporteur.</li>
    </ol>
  );
}

function EtapesChargeEtablissement({ transport }: Contexte) {
  return (
    <ol>
      <li>
        Le transport retenu est : <strong>{transport}</strong>.
      </li>
      <li>
        Le transport doit être organisé ou encadré par l’établissement de santé.
      </li>
      <li>Rapprochez-vous du service ou du secrétariat de l’établissement.</li>
      <li>
        L’établissement vous indiquera le document interne ou la procédure à
        suivre.
      </li>
    </ol>
  );
}

function EtapesSMUR() {
  return (
    <ol>
      <li>
        Ce transport relève d’une prise en charge médicale urgente par une
        équipe SMUR — Structure Mobile d’Urgence et de Réanimation.
      </li>
      <li>
        L’organisation du transport relève de l’équipe médicale ou de
        l’établissement concerné.
      </li>
      <li>
        Suivez les consignes données par l’équipe médicale ou l’établissement.
      </li>
    </ol>
  );
}

function EtapesBariatriqueSeul() {
  return (
    <ol>
      <li>
        Aucun transport sanitaire ne peut être prescrit par votre médecin sur la
        base du seul motif bariatrique.
      </li>
      <li>
        Rapprochez-vous du service médical ou du secrétariat pour connaître les
        solutions possibles selon votre situation.
      </li>
    </ol>
  );
}

function EtapesPermissionSortie() {
  return (
    <ol>
      <li>Le transport reste à votre charge.</li>
      <li>
        Vous pouvez organiser vous-même le transport adapté à votre sortie.
      </li>
      <li>
        En cas de changement de situation ou de motif médical, une nouvelle
        évaluation médicale peut être nécessaire.
      </li>
    </ol>
  );
}

function EtapesPrestationNonPriseEnCharge() {
  return (
    <ol>
      <li>
        La consultation, le soin, l’examen ou la prestation à l’origine de votre
        déplacement n’est pas pris en charge par l’Assurance Maladie.
      </li>
      <li>
        Dans cette situation, le transport ne peut pas être pris en charge par
        l’Assurance Maladie, même si un mode de transport particulier est
        médicalement adapté.
      </li>
      <li>
        N’adressez aucune Prescription Médicale de Transport, Demande d’Accord
        Préalable ou demande de remboursement à votre caisse pour ce
        déplacement.
      </li>
    </ol>
  );
}

function EtapesNonEligible({ transport, transportPrescrit }: Contexte) {
  return transportPrescrit ? (
    <TransportPrescritNonPrisEnCharge transport={transport} />
  ) : (
    <AucunTransportPrescrit />
  );
}

function TransportPrescritNonPrisEnCharge({
  transport,
}: {
  transport: string;
}) {
  return (
    <ol>
      <li>
        Le transport retenu par le médecin est : <strong>{transport}</strong>.
      </li>
      <li>
        Ce résultat signifie que le transport ne relève pas d’une prise en
        charge par l’Assurance Maladie dans ce cadre.
      </li>
      <li>Le transport reste à votre charge.</li>
      <li>
        Rapprochez-vous du secrétariat médical ou de l’établissement pour
        connaître la suite à donner.
      </li>
    </ol>
  );
}

function AucunTransportPrescrit() {
  return (
    <ol>
      <li>
        Aucun transport sanitaire ne peut être prescrit par votre médecin sur la
        base des informations indiquées.
      </li>
      <li>Le transport reste à votre charge si vous décidez de l’organiser.</li>
      <li>
        Rapprochez-vous du secrétariat médical ou de l’établissement pour
        connaître la suite à donner.
      </li>
    </ol>
  );
}

const ETAPES: Record<string, (contexte: Contexte) => React.ReactNode> = {
  "prescription médicale de transport": EtapesPMT,
  "demande d’accord préalable": EtapesDAP,
  "convocation ou avis d’audience": EtapesConvocation,
  "transport à la charge de l’établissement": EtapesChargeEtablissement,
  SMUR: EtapesSMUR,
  "bariatrique seul": EtapesBariatriqueSeul,
  "permission de sortie sans motif médical": EtapesPermissionSortie,
  "prestation non prise en charge par l’Assurance Maladie":
    EtapesPrestationNonPriseEnCharge,
  "non éligible à une prise en charge par l’Assurance Maladie":
    EtapesNonEligible,
};
