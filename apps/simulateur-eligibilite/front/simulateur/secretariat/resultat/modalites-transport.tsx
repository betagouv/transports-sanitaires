// Les `<li>` de modalité propres au transport retenu, dans la marche à suivre du
// patient. Même découpage des quatre transports pour la PMT et la DAP, mais des
// formulations distinctes : la DAP subordonne toute organisation à l'obtention
// préalable de l'accord.
//
// Les quatre clés sont les valeurs de `cible_transport_sanitaire_prescrit`,
// recopiées mot pour mot, sigles développés compris. Elles l'ont longtemps été en
// abrégé, et un mode introuvable ne rendant rien, les deux transports assis
// n'affichaient aucune modalité — la moitié des parcours. C'est
// `tests/simulateur/modalites-transport.test.tsx` qui confronte désormais ces
// clés aux possibilités du modèle.

export function ModalitesPMT({ transport }: { transport: string }) {
  const Modalites = PMT[transport];
  return Modalites ? <Modalites /> : null;
}

export function ModalitesDAP({ transport }: { transport: string }) {
  const Modalites = DAP[transport];
  return Modalites ? <Modalites /> : null;
}

// ---- implémentation ----

function PmtVehiculePerso() {
  return (
    <>
      <li>
        Organisez votre trajet avec votre véhicule personnel ou les transports
        en commun.
      </li>
      <li>
        Conservez les justificatifs nécessaires : billets, reçus, justificatifs
        de trajet ou de distance selon le cas.
      </li>
      <li>
        Transmettez les justificatifs à votre organisme d’Assurance Maladie
        selon les modalités indiquées.
      </li>
    </>
  );
}

function PmtVslTaxi() {
  return (
    <>
      <li>
        Organisez le transport avec un <strong>VSL</strong> ou un{" "}
        <strong>taxi conventionné</strong>, ou avec l’aide du secrétariat
        médical selon l’organisation prévue.
      </li>
      <li>Présentez la prescription au transporteur avant le transport.</li>
    </>
  );
}

function PmtVslTaxiTpmr() {
  return (
    <>
      <li>
        Organisez le transport avec un transporteur adapté au fauteuil roulant,
        ou avec l’aide du secrétariat médical selon l’organisation prévue.
      </li>
      <li>
        Précisez que le transport doit se faire{" "}
        <strong>
          sans quitter votre fauteuil roulant manuel ou électrique
        </strong>
        .
      </li>
      <li>Présentez la prescription au transporteur avant le transport.</li>
    </>
  );
}

function PmtAmbulance() {
  return (
    <>
      <li>
        Organisez le transport avec le secrétariat médical, l’établissement de
        santé ou une société d’ambulance, selon l’organisation prévue pour votre
        situation.
      </li>
      <li>
        Présentez la prescription au transporteur avant le transport, sauf
        situation d’urgence.
      </li>
    </>
  );
}

function DapVehiculePerso() {
  return (
    <>
      <li>
        Une fois l’accord obtenu, organisez votre trajet avec votre véhicule
        personnel ou les transports en commun.
      </li>
      <li>
        Conservez les justificatifs nécessaires : billets, reçus, justificatifs
        de trajet ou de distance selon le cas.
      </li>
      <li>
        Transmettez les justificatifs à votre organisme d’Assurance Maladie
        selon les modalités indiquées.
      </li>
    </>
  );
}

function DapVslTaxi() {
  return (
    <>
      <li>
        Une fois l’accord obtenu, organisez le transport avec un{" "}
        <strong>VSL</strong> ou un <strong>taxi conventionné</strong>, ou avec
        l’aide du secrétariat médical selon l’organisation prévue.
      </li>
      <li>Présentez la demande au transporteur.</li>
    </>
  );
}

function DapVslTaxiTpmr() {
  return (
    <>
      <li>
        Une fois l’accord obtenu, organisez le transport avec un transporteur
        adapté au fauteuil roulant, ou avec l’aide du secrétariat médical selon
        l’organisation prévue.
      </li>
      <li>
        Précisez que le transport doit se faire{" "}
        <strong>
          sans quitter votre fauteuil roulant manuel ou électrique
        </strong>
        .
      </li>
      <li>Présentez la demande au transporteur.</li>
    </>
  );
}

function DapAmbulance() {
  return (
    <>
      <li>
        Une fois l’accord obtenu, organisez le transport avec le secrétariat
        médical, l’établissement de santé ou une société d’ambulance, selon
        l’organisation prévue pour votre situation.
      </li>
      <li>Présentez la demande au transporteur, sauf situation d’urgence.</li>
    </>
  );
}

// La v9.7 a scindé le mode non professionnalisé en deux : le prescripteur
// choisit entre le véhicule personnel et les transports en commun. Les modalités
// sont les mêmes des trois côtés — c'est l'absence de transporteur qui les dicte.
//
// Trois, parce que la catégorie d'origine reste une valeur du modèle : tant que
// le choix n'est pas fait, c'est elle que la cible rend.
const NON_PROFESSIONNALISE = "véhicule personnel ou transport en commun";
const VEHICULE_PERSO = "véhicule personnel";
const TRANSPORT_EN_COMMUN = "transport en commun terrestre";
const VSL_TAXI = "VSL (Véhicule Sanitaire Léger) ou taxi conventionné";
const VSL_TAXI_TPMR =
  "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)";
const AMBULANCE = "ambulance";

/**
 * Les modes qui n'ont aucune modalité à donner, et pourquoi. Exportée pour que le
 * test puisse dire « toutes les possibilités du modèle sont traitées, sauf
 * celles-ci » plutôt que d'énumérer les quatre autres une seconde fois.
 */
// La v9.5.1 en comptait deux — « aucun » et le SMUR — que la v9.7 a retirés du
// modèle : la Partie 1 conclut toujours sur un mode, et l'urgence vitale n'est
// plus une réponse de Q1. Tous les modes portent donc désormais des modalités.
export const MODES_SANS_MODALITE = [] as const;

/** Les six modes qui portent des modalités, pour le test comme pour le rendu. */
export const MODES_AVEC_MODALITE = [
  NON_PROFESSIONNALISE,
  VEHICULE_PERSO,
  TRANSPORT_EN_COMMUN,
  VSL_TAXI,
  VSL_TAXI_TPMR,
  AMBULANCE,
] as const;

const PMT: Record<string, () => React.ReactElement> = {
  [NON_PROFESSIONNALISE]: PmtVehiculePerso,
  [VEHICULE_PERSO]: PmtVehiculePerso,
  [TRANSPORT_EN_COMMUN]: PmtVehiculePerso,
  [VSL_TAXI]: PmtVslTaxi,
  [VSL_TAXI_TPMR]: PmtVslTaxiTpmr,
  [AMBULANCE]: PmtAmbulance,
};

const DAP: Record<string, () => React.ReactElement> = {
  [NON_PROFESSIONNALISE]: DapVehiculePerso,
  [VEHICULE_PERSO]: DapVehiculePerso,
  [TRANSPORT_EN_COMMUN]: DapVehiculePerso,
  [VSL_TAXI]: DapVslTaxi,
  [VSL_TAXI_TPMR]: DapVslTaxiTpmr,
  [AMBULANCE]: DapAmbulance,
};
