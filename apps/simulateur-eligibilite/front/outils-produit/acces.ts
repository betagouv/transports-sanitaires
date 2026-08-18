// Garde d'accès des **outils produit** (mode test des règles, galerie de seeds).
//
// Un seul critère, commun aux deux : le service sélectionné à l'écran-porte. Pas de
// garde au build — les outils sont disponibles sur **tous les environnements**,
// production comprise ; c'est le référentiel qui décide qui les voit.
//
// La garde est ici, et non dans `labo/`, parce qu'elle sert désormais aux deux
// outils : l'y laisser aurait fait dépendre la galerie du module labo.

import { normalise } from "../../shared/identite-saisie";

// Service du référentiel Grist qui déverrouille les outils produit (colonne `Id2`,
// choix produit). On accepte aussi le libellé pour rester robuste si l'`Id2` change.
export const SERVICE_PRODUIT_ID = "4";
export const SERVICE_PRODUIT_LIBELLE = "Transport Sanitaire";

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
