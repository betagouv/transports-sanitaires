// Accès au référentiel établissement / service / prescripteur.
//
// L'accès est masqué derrière l'interface `Referentiel` (voir
// docs/architecture/identification.md — §5) afin de pouvoir substituer la source
// (le client HTTP same-origin `http-referentiel.ts` vers le backend Grist ; demain
// FINESS/RPPS) sans toucher les composants consommateurs.
//
// `snapshotReferentiel` : données **factices** (aucune PII réelle), servant de
// **défaut** en dev et dans les tests (front comme backend sans clé Grist).

export type Etablissement = { id: string; libelle: string };
export type Service = { id: string; libelle: string };
export type Prescripteur = { id: string; libelle: string };

export interface Referentiel {
  getEtablissements(): Promise<Etablissement[]>;
  getServices(etabId: string): Promise<Service[]>;
  getPrescripteurs(serviceId: string): Promise<Prescripteur[]>;
}

type SnapshotService = Service & { etabId: string };
type SnapshotPrescripteur = Prescripteur & { serviceId: string };

const ETABLISSEMENTS: Etablissement[] = [
  { id: "e_chu_grenoble", libelle: "CHU Grenoble Alpes" },
  { id: "e_ch_chambery", libelle: "Centre hospitalier de Chambéry" },
  { id: "e_clinique_belledonne", libelle: "Clinique Belledonne" },
];

const SERVICES: SnapshotService[] = [
  { id: "s_grenoble_cardio", etabId: "e_chu_grenoble", libelle: "Cardiologie" },
  { id: "s_grenoble_dialyse", etabId: "e_chu_grenoble", libelle: "Néphrologie — dialyse" },
  { id: "s_grenoble_onco", etabId: "e_chu_grenoble", libelle: "Oncologie" },
  { id: "s_chambery_urgences", etabId: "e_ch_chambery", libelle: "Urgences" },
  { id: "s_chambery_medecine", etabId: "e_ch_chambery", libelle: "Médecine interne" },
  { id: "s_belledonne_chirurgie", etabId: "e_clinique_belledonne", libelle: "Chirurgie ambulatoire" },
];

const PRESCRIPTEURS: SnapshotPrescripteur[] = [
  { id: "p_grenoble_cardio_1", serviceId: "s_grenoble_cardio", libelle: "Dr Amina Berger" },
  { id: "p_grenoble_cardio_2", serviceId: "s_grenoble_cardio", libelle: "Dr Louis Fontaine" },
  { id: "p_grenoble_dialyse_1", serviceId: "s_grenoble_dialyse", libelle: "Dr Claire Nguyen" },
  { id: "p_grenoble_onco_1", serviceId: "s_grenoble_onco", libelle: "Dr Marc Rossi" },
  { id: "p_chambery_urgences_1", serviceId: "s_chambery_urgences", libelle: "Dr Sophie Meunier" },
  { id: "p_chambery_medecine_1", serviceId: "s_chambery_medecine", libelle: "Dr Paul Girard" },
  { id: "p_belledonne_chirurgie_1", serviceId: "s_belledonne_chirurgie", libelle: "Dr Inès Lopez" },
];

export const snapshotReferentiel: Referentiel = {
  async getEtablissements() {
    return ETABLISSEMENTS;
  },
  async getServices(etabId) {
    return SERVICES.filter((s) => s.etabId === etabId).map(({ id, libelle }) => ({
      id,
      libelle,
    }));
  },
  async getPrescripteurs(serviceId) {
    return PRESCRIPTEURS.filter((p) => p.serviceId === serviceId).map(
      ({ id, libelle }) => ({ id, libelle })
    );
  },
};
