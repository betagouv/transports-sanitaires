// Accès au référentiel établissement / service / prescripteur.
//
// L'accès est masqué derrière l'interface `Referentiel` (voir
// docs/architecture/identification.md — §5) afin de pouvoir substituer la source
// (le client HTTP same-origin `http-referentiel.ts` vers le backend Grist ; demain
// FINESS/RPPS) sans toucher les composants consommateurs.
//
// `snapshotReferentiel` : données **factices** (aucune PII réelle), servant de
// **défaut** en dev et dans les tests (front comme backend sans clé Grist).

import type { IdentiteSaisie } from "./identite-saisie.ts";

export type Etablissement = { id: string; libelle: string };
export type Service = { id: string; libelle: string };
export type Prescripteur = { id: string; libelle: string };

export interface Referentiel {
  getEtablissements(): Promise<Etablissement[]>;
  getServices(etabId: string): Promise<Service[]>;
  getPrescripteurs(serviceId: string): Promise<Prescripteur[]>;
  /**
   * Enrichit le référentiel avec les **saisies libres** d'une sélection (service
   * « autre », prescripteur « hors liste »). Optionnel : seule la source Grist
   * l'implémente (le client HTTP front n'écrit jamais). Voir
   * docs/specs/enrichissement-referentiel-saisies-libres.md.
   */
  enrichirDepuisSaisie?(saisie: IdentiteSaisie): Promise<void>;
}

type SnapshotService = Service & { etabId: string };
type SnapshotPrescripteur = Prescripteur & { serviceId: string };

const ETABLISSEMENTS: Etablissement[] = [
  { id: "e_chu_grenoble", libelle: "CHU Grenoble Alpes" },
  { id: "e_ch_chambery", libelle: "Centre hospitalier de Chambéry" },
  { id: "e_clinique_belledonne", libelle: "Clinique Belledonne" },
  // Établissement « fourre-tout » du référentiel pour les prescripteurs sans
  // établissement de rattachement : ils le sélectionnent puis renseignent leur
  // service (ou « Autre ») et leur identité (« hors liste »).
  { id: "e_liberal_cnam", libelle: "Libéral / CNAM / CPAM / Autre" },
];

// Chaque établissement possède une entrée « Autre » (service / unité non listé) :
// c'est un service du référentiel comme les autres, avec ses propres prescripteurs
// et la même option « hors liste ». Il n'y a plus de service « libre » saisi à part.
const SERVICES: SnapshotService[] = [
  { id: "s_grenoble_cardio", etabId: "e_chu_grenoble", libelle: "Cardiologie" },
  { id: "s_grenoble_dialyse", etabId: "e_chu_grenoble", libelle: "Néphrologie — dialyse" },
  { id: "s_grenoble_onco", etabId: "e_chu_grenoble", libelle: "Oncologie" },
  { id: "s_grenoble_autre", etabId: "e_chu_grenoble", libelle: "Autre" },
  { id: "s_chambery_urgences", etabId: "e_ch_chambery", libelle: "Urgences" },
  { id: "s_chambery_medecine", etabId: "e_ch_chambery", libelle: "Médecine interne" },
  { id: "s_chambery_autre", etabId: "e_ch_chambery", libelle: "Autre" },
  { id: "s_belledonne_chirurgie", etabId: "e_clinique_belledonne", libelle: "Chirurgie ambulatoire" },
  { id: "s_belledonne_autre", etabId: "e_clinique_belledonne", libelle: "Autre" },
  { id: "s_liberal", etabId: "e_liberal_cnam", libelle: "Libéral" },
  { id: "s_cnam_cpam", etabId: "e_liberal_cnam", libelle: "CNAM / CPAM" },
  { id: "s_liberal_autre", etabId: "e_liberal_cnam", libelle: "Autre" },
];

const PRESCRIPTEURS: SnapshotPrescripteur[] = [
  { id: "p_grenoble_cardio_1", serviceId: "s_grenoble_cardio", libelle: "Dr Amina Berger" },
  { id: "p_grenoble_cardio_2", serviceId: "s_grenoble_cardio", libelle: "Dr Louis Fontaine" },
  { id: "p_grenoble_dialyse_1", serviceId: "s_grenoble_dialyse", libelle: "Dr Claire Nguyen" },
  { id: "p_grenoble_onco_1", serviceId: "s_grenoble_onco", libelle: "Dr Marc Rossi" },
  { id: "p_grenoble_autre_1", serviceId: "s_grenoble_autre", libelle: "Dr Hélène Fabre" },
  { id: "p_chambery_urgences_1", serviceId: "s_chambery_urgences", libelle: "Dr Sophie Meunier" },
  { id: "p_chambery_medecine_1", serviceId: "s_chambery_medecine", libelle: "Dr Paul Girard" },
  { id: "p_belledonne_chirurgie_1", serviceId: "s_belledonne_chirurgie", libelle: "Dr Inès Lopez" },
];

export const snapshotReferentiel: Referentiel = {
  async getEtablissements() {
    return ETABLISSEMENTS;
  },
  async getServices(etabId) {
    return SERVICES.filter((service) => service.etabId === etabId).map(
      ({ id, libelle }) => ({ id, libelle })
    );
  },
  async getPrescripteurs(serviceId) {
    return PRESCRIPTEURS.filter(
      (prescripteur) => prescripteur.serviceId === serviceId
    ).map(({ id, libelle }) => ({ id, libelle }));
  },
};
