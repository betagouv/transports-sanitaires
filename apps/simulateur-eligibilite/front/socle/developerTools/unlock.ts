// Qui voit les developer tools : le service choisi à l'écran de rattachement.

import { normalise } from "../../../shared/rattachement-saisi";

/** Vrai quand le service sélectionné déverrouille les developer tools. */
export function estServiceProduit(service: {
  id: string;
  libelle: string;
}): boolean {
  return (
    service.id === SERVICE_PRODUIT_ID ||
    normalise(service.libelle) === normalise(SERVICE_PRODUIT_LIBELLE)
  );
}

// ---- implémentation ----

// Le service du référentiel Grist qui déverrouille les developer tools (colonne
// `Id2`). Le libellé est accepté aussi, au cas où l'`Id2` changerait.
const SERVICE_PRODUIT_ID = "4";
const SERVICE_PRODUIT_LIBELLE = "Transport Sanitaire";

// Pas de garde au build : les outils existent sur tous les environnements,
// production comprise. Le référentiel décide qui les voit.
