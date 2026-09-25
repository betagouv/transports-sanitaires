// Les cas nommés de la matrice v9.7 : ce que le livrable décrit un par un, là où
// la grille (`grille-v9-7-3.test.ts`) balaie un produit croisé.
//
// Ils se lisent par sujet — le mode médical, les séances, l'ALD datée, le ticket
// modérateur, les contextes réglementaires — et chacun garde son identifiant du
// livrable, sous lequel un désaccord remonte à l'éditeur.
//
// Trois sujets ont leur propre fichier, parce qu'ils portent chacun une famille
// entière : la charge de l'établissement (`article-80-v9-7-3.test.ts`), l'accord
// préalable (`accord-prealable-v9-7-3.test.ts`) et la permission temporaire de
// sortie (`permission-v9-7-3.test.ts`).

import { describe, expect, it } from "vitest";
import { evaluerLeCas, type OptionsDuLivrable } from "./livrable-v9-7-3";
import { DAP, NON_ELIGIBLE, PMT } from "./situations-v9-7-3";

/** Un cas nommé : ses options, et les sorties que le livrable lui attend. */
type Cas = [
  id: string,
  options: OptionsDuLivrable,
  attendu: Record<string, unknown>,
];

function rejouer(cas: readonly Cas[]) {
  it.each(cas)("%s", (_id, options, attendu) => {
    const moteur = evaluerLeCas(options);
    for (const [cible, valeur] of Object.entries(attendu))
      expect(moteur.evaluate(cible).nodeValue, cible).toBe(valeur);
  });
}

describe("modèle v9.7 — le mode médical et l’accompagnement", () => {
  rejouer([
    // Q1.1 sans aucun critère : le mode retombe sur le non professionnalisé, et
    // aucun motif n'ouvre le droit.
    [
      "Q11-AUCUN",
      { criterion: "p1_critere_aucun" },
      { cible_cas_final: NON_ELIGIBLE, cible_mode_individual: true },
    ],
    // Le proche accompagnant caractérise l'incapacité : l'ALD est validée, et
    // l'accompagnement se reporte sur le document.
    [
      "Q1-PROCHE",
      { autonomy: 1, m0: { p1_m0_ald: "oui" }, mode: "Transports en commun" },
      { cible_cas_final: PMT, cible_personne_accompagnante: true },
    ],
    [
      "BARIATRIQUE",
      {
        m0: { p1_m0_bariatrique: "oui" },
        reason: "Entrée en hospitalisation",
      },
      { cible_cas_final: PMT, cible_equipement_bariatrique_requis: true },
    ],
  ]);
});

describe("modèle v9.7 — les trois séances, détachées de l’ALD", () => {
  // La v9.5.1 les réunissait sous une case unique, subordonnée à l'ALD. La v9.7
  // en fait trois cases indépendantes, et chacune ouvre le droit à elle seule.
  rejouer([
    [
      "SESSION-chimiotherapie",
      { m0: { p1_m0_seance_chimiotherapie: "oui" }, autonomy: 0 },
      {
        cible_cas_final: PMT,
        cible_mode_individual: true,
        cible_situation_hospitalisation: true,
      },
    ],
    [
      "SESSION-radiotherapie",
      { m0: { p1_m0_seance_radiotherapie: "oui" }, autonomy: 0 },
      {
        cible_cas_final: PMT,
        cible_mode_individual: true,
        cible_situation_hospitalisation: true,
      },
    ],
    [
      "SESSION-dialyse_centre",
      { m0: { p1_m0_seance_dialyse_centre: "oui" }, autonomy: 0 },
      {
        cible_cas_final: PMT,
        cible_mode_individual: true,
        cible_situation_hospitalisation: true,
      },
    ],
    [
      "SESSIONS-CUMULEES",
      {
        m0: {
          p1_m0_seance_chimiotherapie: "oui",
          p1_m0_seance_radiotherapie: "oui",
        },
      },
      { cible_cas_final: PMT, p1_motif_seance: true },
    ],
  ]);
});

describe("modèle v9.7 — l’ALD non exonérante et sa bascule du 1er octobre", () => {
  // Le décret n° 2026-812 du 21 août 2026 retire à l'ALD non exonérante, seule,
  // l'ouverture de droit du b de R.322-10. Les autres motifs sont conservés.
  rejouer([
    [
      "ALD-NONEXO-AVANT",
      { m0: { p1_m0_ald: "oui" }, aldType: "Non exonérante" },
      { cible_cas_final: PMT },
    ],
    [
      "ALD-NONEXO-APRES",
      {
        m0: { p1_m0_ald: "oui" },
        aldType: "Non exonérante",
        instant: "2026-10-01T10:00:00Z",
      },
      { cible_cas_final: NON_ELIGIBLE },
    ],
    [
      "ALD-NONEXO-AUTRE-DROIT-APRES",
      {
        m0: { p1_m0_ald: "oui" },
        aldType: "Non exonérante",
        instant: "2026-10-01T10:00:00Z",
        reason: "Entrée en hospitalisation",
      },
      { cible_cas_final: PMT },
    ],
  ]);
});

describe("modèle v9.7 — l’exonération du ticket modérateur", () => {
  // Nouveauté de la v9.7, et trois listes distinctes, une par document. Une ALD
  // seule ne donne pas l'exonération : il y faut un cas particulier déclaré.
  rejouer([
    [
      "TM-ALD-SEUL",
      { m0: { p1_m0_ald: "oui" } },
      { cible_cas_final: PMT, cible_exoneration_ticket_moderateur: false },
    ],
    [
      "TM-ALD-HOSP",
      {
        m0: { p1_m0_ald: "oui" },
        reason: "Entrée en hospitalisation",
        tmPmt: { p2_tm_pmt_acte: "oui" },
      },
      { cible_cas_final: PMT, cible_exoneration_ticket_moderateur: true },
    ],
    [
      "TM-DAP",
      {
        distance: 2,
        reason: "Entrée en hospitalisation",
        tmDap: { p2_tm_dap_adapte: "oui" },
      },
      { cible_cas_final: DAP, cible_exoneration_ticket_moderateur: true },
    ],
  ]);
});

describe("modèle v9.7 — les contextes réglementaires cumulables", () => {
  // Aucun n'ouvre le droit à lui seul : c'est ce que RARE-SEUL-SANS-DROIT et
  // PENSION-SEULE établissent, et ce qui les distingue d'une raison principale.
  rejouer([
    [
      "RARE-0",
      {
        contexts: { p2_contexte_centre_reference: "oui" },
        reason: "Entrée en hospitalisation",
        distance: 0,
      },
      {
        cible_cas_final: PMT,
        cible_situation_centre_reference_maladies_rares: true,
      },
    ],
    [
      "RARE-2",
      {
        contexts: { p2_contexte_centre_reference: "oui" },
        reason: "Entrée en hospitalisation",
        distance: 2,
      },
      {
        cible_cas_final: DAP,
        cible_situation_centre_reference_maladies_rares: true,
      },
    ],
    [
      "RARE-SEUL-SANS-DROIT",
      { contexts: { p2_contexte_centre_reference: "oui" } },
      { cible_cas_final: NON_ELIGIBLE },
    ],
    [
      "PENSION-SEULE",
      { contexts: { p2_contexte_pension_militaire: "oui" } },
      { cible_cas_final: NON_ELIGIBLE },
    ],
    [
      "PENSION-PMT",
      {
        contexts: { p2_contexte_pension_militaire: "oui" },
        reason: "Entrée en hospitalisation",
      },
      { cible_cas_final: PMT, cible_situation_pension_militaire: true },
    ],
    [
      "PENSION-DAP",
      { contexts: { p2_contexte_pension_militaire: "oui" }, distance: 2 },
      { cible_cas_final: DAP, cible_situation_pension_militaire: true },
    ],
    [
      "MATERNITE",
      { contexts: { p2_contexte_engagement_maternite: "oui" } },
      { cible_cas_final: DAP },
    ],
    [
      "TIERS",
      { reason: "Entrée en hospitalisation", third: true },
      {
        cible_cas_final: PMT,
        cible_accident_cause_par_tiers: true,
        cible_date_accident_cause_par_tiers: "2026-08-01",
      },
    ],
  ]);
});

describe("modèle v9.7 — le retour pénitentiaire", () => {
  // Il reste un contexte, et non une branche : le parcours standard se poursuit,
  // et le trajet est contraint — départ d'une structure, arrivée en établissement
  // pénitentiaire.
  rejouer([
    [
      "PRISON",
      {
        contexts: { p2_contexte_retour_penitentiaire: "oui" },
        depart: "Structure de soins",
        arrival: "Établissement pénitentiaire",
      },
      { cible_cas_final: PMT },
    ],
    [
      "PRISON-RARE-AR",
      {
        contexts: {
          p2_contexte_retour_penitentiaire: "oui",
          p2_contexte_centre_reference: "oui",
        },
        depart: "Structure de soins",
        arrival: "Établissement pénitentiaire",
        organization: "aller-retour identique",
      },
      { cible_cas_final: PMT },
    ],
  ]);
});
