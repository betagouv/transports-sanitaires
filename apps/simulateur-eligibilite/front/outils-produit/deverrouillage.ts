// Qui voit les outils produit (mode test des règles, galerie de seeds, traces de
// debug) : le service choisi à l'écran-porte, et rien d'autre.

import { normalise } from "../../shared/identite-saisie";

/** Vrai quand le service sélectionné déverrouille les outils produit. */
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

// Service du référentiel Grist qui déverrouille les outils produit (colonne `Id2`,
// choix produit). On accepte aussi le libellé pour rester robuste si l'`Id2` change.
const SERVICE_PRODUIT_ID = "4";
const SERVICE_PRODUIT_LIBELLE = "Transport Sanitaire";

// Pas de garde au build : les outils sont disponibles sur **tous** les
// environnements, production comprise — c'est le référentiel qui décide qui les
// voit. Et la garde vit ici plutôt que dans `labo/`, parce qu'elle sert à tous
// les outils : l'y laisser aurait fait dépendre la galerie du module labo.
