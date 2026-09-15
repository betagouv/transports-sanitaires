// Ce que le contrat fait dire à un refus, selon le mode retenu (Bloc 1) : le
// patient qui organisera quand même son déplacement doit savoir ce qu'il
// engage.
//
// Trois formulations, parce que trois situations : celui qui prend sa voiture
// ne s'adresse à personne, celui qui prend le bus achète un titre, et celui
// qui réserve un transporteur peut lui demander son tarif d'avance.

/** Frais restant à la charge du patient, quand le transport n'est pas pris en charge. */
export function FraisAPrevoir({ transport }: { transport: string }) {
  if (transport === "véhicule personnel")
    return (
      <p>
        Si vous effectuez ce déplacement en véhicule personnel, les frais
        correspondants ne seront pas remboursés par l’Assurance Maladie.
      </p>
    );
  if (transport === "transport en commun terrestre")
    return (
      <p>
        Avant d’acheter vos titres de transport en commun, vérifiez leur prix.
        Ces frais ne seront pas remboursés par l’Assurance Maladie.
      </p>
    );
  return (
    <p>
      Avant d’éventuellement réserver {aReserver(transport)}, renseignez-vous
      auprès du transporteur sur le montant à régler.
    </p>
  );
}

function aReserver(transport: string): string {
  if (transport === "ambulance") return "une ambulance";
  if (transport.includes("TPMR"))
    return "un VSL (Véhicule Sanitaire Léger) adapté au transport de personnes à mobilité réduite (TPMR) ou un taxi conventionné adapté TPMR";
  return "un VSL (Véhicule Sanitaire Léger) ou un taxi conventionné";
}
