// Le référentiel établissement / service : son interface, et le jeu de données
// factices qui sert de défaut quand aucune source réelle n'est branchée.

import type { IdentiteSaisie } from "./identite-saisie.ts";

export type Etablissement = { id: string; libelle: string };
export type Service = { id: string; libelle: string };

/**
 * L'accès est masqué derrière cette interface, décrite au §5 de
 * docs/knowledge/adr/identification.md, pour pouvoir substituer la source sans
 * toucher les composants consommateurs. C'est aujourd'hui le client HTTP
 * same-origin `front/identification/referentiel-http.ts` vers le backend Grist, et
 * demain peut-être FINESS.
 */
export interface Referentiel {
  listerEtablissements(): Promise<Etablissement[]>;
  listerServices(etabId: string): Promise<Service[]>;
  /**
   * Enrichit le référentiel avec le service saisi sous « Autre ». C'est
   * optionnel : seule la source Grist l'implémente, le client HTTP du front
   * n'écrivant jamais. Voir
   * docs/knowledge/domain/enrichissement-referentiel-saisies-libres.md.
   */
  enrichirDepuisSaisie?(saisie: IdentiteSaisie): Promise<void>;
}

/**
 * Données factices, sans aucune PII réelle. Elles servent de défaut en dev et dans
 * les tests, côté front comme côté backend, quand il n'y a pas de clé Grist.
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
  // Établissement « fourre-tout » du référentiel pour les prescripteurs sans
  // établissement de rattachement : ils le sélectionnent puis renseignent leur
  // service (ou « Autre »).
  { id: "e_liberal_cnam", libelle: "Libéral / CNAM / CPAM / Autre" },
];

// Chaque établissement possède une entrée « Autre » (service / unité non listé) :
// c'est un service du référentiel comme les autres.
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
  // Service dédié au produit : déverrouille le « mode test des règles » (labo).
  // Correspond au service Grist `Id2 = 4` en production (cf. front/outils-produit/labo/labo.ts).
  {
    id: "s_transport_sanitaire",
    etabId: "e_liberal_cnam",
    libelle: "Transport Sanitaire",
  },
  { id: "s_liberal_autre", etabId: "e_liberal_cnam", libelle: "Autre" },
];
