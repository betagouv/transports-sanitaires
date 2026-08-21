// Les adresses de départ et d'arrivée, composées depuis la Partie 2.
//
// Le formulaire n'offre qu'**une ligne** par lieu, quand la v9.1 en a fait six
// saisies (D1-D12 pour les deux bouts). Ce module les aplatit. C'est le seul
// endroit du CERFA où une valeur écrite vient d'un texte tapé par l'utilisateur ;
// *quel* champ la reçoit — structure de soins ou autre lieu — se décide dans
// `remplissage-pmt.ts`, à côté du nom du champ.

import type { CleDeRegle } from "../../../../simulateur/contrat-regles-publicodes.ts";
import type { Reponses } from "./reponses.ts";

/** L'adresse du lieu de départ, sur une ligne. Vide si rien n'est renseigné. */
export function adresseDépart(réponses: Reponses): string {
  return surUneLigne(réponses, [
    "p2_depart_nom_lieu",
    "p2_depart_adresse",
    "p2_depart_complement_adresse",
    "p2_depart_code_postal",
    "p2_depart_commune",
    "p2_depart_pays",
  ]);
}

/** L'adresse du lieu d'arrivée, sur une ligne. Vide si rien n'est renseigné. */
export function adresseArrivée(réponses: Reponses): string {
  return surUneLigne(réponses, [
    "p2_arrivee_nom_lieu",
    "p2_arrivee_adresse",
    "p2_arrivee_complement_adresse",
    "p2_arrivee_code_postal",
    "p2_arrivee_commune",
    "p2_arrivee_pays",
  ]);
}

// ---- implémentation ----

// Les six saisies séparées par des virgules. Les vides — complément d'adresse,
// pays en France — disparaissent d'elles-mêmes.
function surUneLigne(
  réponses: Reponses,
  saisies: readonly CleDeRegle[],
): string {
  return saisies
    .map((saisie) => réponses.texte(saisie).trim())
    .filter((morceau) => morceau !== "")
    .join(", ");
}
