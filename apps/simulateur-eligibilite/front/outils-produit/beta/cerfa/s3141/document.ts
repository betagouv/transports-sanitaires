// La prescription pour permission de sortie, telle que le parcours la propose.

import type { DocumentCerfa } from "../document";
import { gabaritDepuisLAsset } from "../document";
import gabaritUrl from "./gabarit/cerfa-16184-01.pdf?url";

export const S3141: DocumentCerfa = {
  casFinal: "prescription S3141",
  titre: "Prescription pour permission de sortie",
  numero: "n° 16184*01",
  fichier: "prescription-permission-sortie",
  libelléDuBouton: "Télécharger la prescription de permission pré-remplie",
  ceQuiEstRempli:
    "la date de début d’hospitalisation, le mode de transport et sa " +
    "justification, le trajet et la date de fin de la période prescrite y " +
    "sont déjà cochés, ainsi que le lien avec une ALD ou un accident du " +
    "travail et l’exonération du ticket modérateur",
  ceQuiResteASaisir:
    "l’identité du patient et de l’assuré, celle du prescripteur, ainsi que " +
    "le nombre de trajets par mois — son unité n’est pas encore confirmée " +
    "par la CNAM",
  chargerGabarit: () => gabaritDepuisLAsset(gabaritUrl),
  chargerSaisies: async () =>
    (await import("./depuis-simulateur.ts")).saisiesDepuisSituation,
};
