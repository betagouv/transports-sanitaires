// La prescription médicale de transport, telle que le parcours la propose.

import type { DocumentCerfa } from "../document";
import { gabaritDepuisLAsset } from "../document";
import gabaritUrl from "./gabarit/cerfa-11574-07.pdf?url";

export const PMT: DocumentCerfa = {
  casFinal: "prescription médicale de transport",
  titre: "Prescription médicale de transport",
  numero: "n° 11574*07",
  fichier: "prescription-medicale-transport",
  libelléDuBouton: "Télécharger la prescription pré-remplie",
  ceQuiEstRempli:
    "la situation ouvrant droit, le mode de transport et sa justification, " +
    "le trajet et le contexte d’urgence y sont déjà cochés, sur les deux " +
    "volets, ainsi que l’exonération du ticket modérateur, la pension " +
    "militaire d’invalidité, la date de prescription et les éléments " +
    "d’ordre médical, à relire",
  ceQuiResteASaisir:
    "l’identité du patient et de l’assuré, celle du prescripteur, ainsi que " +
    "l’annexe médicale, si le document en joint une, à signer",
  chargerGabarit: () => gabaritDepuisLAsset(gabaritUrl),
  chargerSaisies: async () =>
    (await import("./depuis-simulateur.ts")).saisiesDepuisSituation,
};
