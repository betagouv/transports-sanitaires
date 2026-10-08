// Le référentiel établissement / service : son interface, et des données
// factices pour le développement et les tests.

import type { RattachementSaisi } from "./rattachement-saisi.ts";

export type Etablissement = { id: string; libelle: string };
export type Service = { id: string; libelle: string };

/**
 * L'accès au référentiel passe par cette interface (§5 de
 * docs/knowledge/adr/identification.md). On peut ainsi changer de source sans
 * toucher aux composants. Le front utilise le client HTTP
 * `front/socle/rattachement/referentiel-http.ts`, vers le backend Grist.
 */
export interface Referentiel {
  listerEtablissements(): Promise<Etablissement[]>;
  listerServices(etabId: string): Promise<Service[]>;
  /**
   * Ajoute au référentiel le service saisi sous « Autre ». Optionnel : seule la
   * source Grist l'implémente, le client HTTP du front n'écrit jamais. Voir
   * docs/knowledge/domain/enrichissement-referentiel-rattachement.md.
   */
  enrichirDepuisSaisie?(saisie: RattachementSaisi): Promise<void>;
}

/**
 * Données factices, sans donnée personnelle. Défaut en dev et dans les tests,
 * au front comme au backend, quand il n'y a pas de clé Grist.
 */
export const snapshotReferentiel: Referentiel = {
  async listerEtablissements() {
    return ETABLISSEMENTS;
  },
  async listerServices(etabId) {
    return SERVICES.filter((service) => service.etabId === etabId).map(
      ({ id, libelle }) => ({ id, libelle }),
    );
  },
};

// ---- implémentation ----

type SnapshotService = Service & { etabId: string };

const ETABLISSEMENTS: Etablissement[] = [
  { id: "e_chu_grenoble", libelle: "CHU Grenoble Alpes" },
  { id: "e_ch_chambery", libelle: "Centre hospitalier de Chambéry" },
  { id: "e_clinique_belledonne", libelle: "Clinique Belledonne" },
  // L'établissement fourre-tout, pour les prescripteurs sans établissement. Ils
  // le sélectionnent, puis choisissent leur service (ou « Autre »).
  { id: "e_liberal_cnam", libelle: "Libéral / CNAM / CPAM / Autre" },
];

// Chaque établissement a une entrée « Autre » (service non listé). C'est un
// service du référentiel comme les autres.
const SERVICES: SnapshotService[] = [
  { id: "s_grenoble_cardio", etabId: "e_chu_grenoble", libelle: "Cardiologie" },
  {
    id: "s_grenoble_dialyse",
    etabId: "e_chu_grenoble",
    libelle: "Néphrologie — dialyse",
  },
  { id: "s_grenoble_onco", etabId: "e_chu_grenoble", libelle: "Oncologie" },
  { id: "s_grenoble_autre", etabId: "e_chu_grenoble", libelle: "Autre" },
  { id: "s_chambery_urgences", etabId: "e_ch_chambery", libelle: "Urgences" },
  {
    id: "s_chambery_medecine",
    etabId: "e_ch_chambery",
    libelle: "Médecine interne",
  },
  { id: "s_chambery_autre", etabId: "e_ch_chambery", libelle: "Autre" },
  {
    id: "s_belledonne_chirurgie",
    etabId: "e_clinique_belledonne",
    libelle: "Chirurgie ambulatoire",
  },
  {
    id: "s_belledonne_autre",
    etabId: "e_clinique_belledonne",
    libelle: "Autre",
  },
  { id: "s_liberal", etabId: "e_liberal_cnam", libelle: "Libéral" },
  { id: "s_cnam_cpam", etabId: "e_liberal_cnam", libelle: "CNAM / CPAM" },
  // Le service du produit : il déverrouille les developer tools. C'est le
  // service Grist `Id2 = 4` en production (voir front/socle/developerTools/unlock.ts).
  {
    id: "s_transport_sanitaire",
    etabId: "e_liberal_cnam",
    libelle: "Transport Sanitaire",
  },
  { id: "s_liberal_autre", etabId: "e_liberal_cnam", libelle: "Autre" },
];
