// Les `<li>` de modalité propres au transport retenu, dans la marche à suivre du
// patient. Même découpage des quatre transports pour la PMT et la DAP, mais des
// formulations distinctes : la DAP subordonne toute organisation à l'obtention
// préalable de l'accord.

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
      <Justificatifs />
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
      <SansQuitterLeFauteuil />
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
      <Justificatifs />
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
      <SansQuitterLeFauteuil />
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

// Le trajet en véhicule personnel se rembourse sur justificatifs : les deux
// mêmes étapes closent la modalité, que l'accord préalable soit requis ou non.
function Justificatifs() {
  return (
    <>
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

function SansQuitterLeFauteuil() {
  return (
    <li>
      Précisez que le transport doit se faire{" "}
      <strong>sans quitter votre fauteuil roulant manuel ou électrique</strong>.
    </li>
  );
}

const VEHICULE_PERSO = "véhicule personnel ou transport en commun";
const VSL_TAXI = "VSL ou taxi conventionné";
const VSL_TAXI_TPMR = "VSL TPMR ou taxi conventionné TPMR";
const AMBULANCE = "ambulance";

const PMT: Record<string, () => React.ReactElement> = {
  [VEHICULE_PERSO]: PmtVehiculePerso,
  [VSL_TAXI]: PmtVslTaxi,
  [VSL_TAXI_TPMR]: PmtVslTaxiTpmr,
  [AMBULANCE]: PmtAmbulance,
};

const DAP: Record<string, () => React.ReactElement> = {
  [VEHICULE_PERSO]: DapVehiculePerso,
  [VSL_TAXI]: DapVslTaxi,
  [VSL_TAXI_TPMR]: DapVslTaxiTpmr,
  [AMBULANCE]: DapAmbulance,
};
