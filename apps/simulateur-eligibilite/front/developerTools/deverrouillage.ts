// Qui voit les developer tools (écran des seeds, traces de
// debug) : le service choisi à l'écran-porte, et rien d'autre.

import { normalise } from "../../shared/rattachement-saisi";

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

// Service du référentiel Grist qui déverrouille les developer tools (colonne `Id2`,
// choix produit). On accepte aussi le libellé pour rester robuste si l'`Id2` change.
const SERVICE_PRODUIT_ID = "4";
const SERVICE_PRODUIT_LIBELLE = "Transport Sanitaire";

// Pas de garde au build : les outils sont disponibles sur **tous** les
// environnements, production comprise — c'est le référentiel qui décide qui les
// voit. Et la garde vit ici plutôt que dans un outil, parce qu'elle sert à tous.
