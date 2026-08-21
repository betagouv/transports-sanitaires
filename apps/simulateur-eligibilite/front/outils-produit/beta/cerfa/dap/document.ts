// La demande d'accord préalable, telle que le parcours la propose.

import type { DocumentCerfa } from "../document";
import { gabaritDepuisLAsset } from "../document";
import gabaritUrl from "./gabarit/cerfa-11575-08.pdf?url";

export const DAP: DocumentCerfa = {
  casFinal: "demande d’accord préalable",
  titre: "Demande d’accord préalable de transport",
  numero: "n° 11575*08",
  fichier: "demande-accord-prealable",
  libelléDuBouton: "Télécharger la demande d’accord préalable pré-remplie",
  ceQuiEstRempli:
    "le motif de la demande, le mode de transport et sa justification, le " +
    "trajet et le contexte d’urgence y sont déjà cochés, sur les trois volets",
  ceQuiResteASaisir:
    "l’identité du patient et de l’assuré, celle du prescripteur, ainsi que " +
    "les éléments d’ordre médical. Les avis médical et administratif sont, eux, " +
    "réservés à votre caisse",
  chargerGabarit: () => gabaritDepuisLAsset(gabaritUrl),
  chargerSaisies: async () =>
    (await import("./depuis-simulateur.ts")).saisiesDepuisSituation,
};
