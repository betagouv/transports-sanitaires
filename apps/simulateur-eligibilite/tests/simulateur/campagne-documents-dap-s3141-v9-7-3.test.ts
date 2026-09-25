// La campagne v9.7.3 de l'éditeur sur les documents (`documents.mjs`), côté
// DAP, S3141 et issues sans Cerfa, rejouée sous ses identifiants `DOC-*`.
// Les écarts de lecture et ce qui n'est pas transposé sont décrits en tête de
// `campagne-documents-pmt-v9-7-3.test.ts`.

import { describe, expect, it } from "vitest";
import { moteur, texte, vrai } from "../../front/simulateur/moteur";
import {
  coches,
  DAP,
  decoches,
  documentDe,
  ENTREE,
  INSTANT,
  PERMISSION,
} from "./document-du-livrable";
import { situationDuLivrable } from "./livrable-v9-7-3";

describe("DOC, la DAP", () => {
  it.each([
    [
      "PMT",
      { ...ENTREE, contexts: { p2_contexte_at_mp: "oui" } },
      "atmp",
      "atmp_date",
    ],
    [
      "DAP",
      { ...DAP, contexts: { p2_contexte_at_mp: "oui" } },
      "lien_atmp",
      "lien_atmp_date",
    ],
  ] as const)("DOC-ATMP-%s", (type, options, caseAtmp, date) => {
    const document = documentDe(options, type);
    coches(document, caseAtmp, "tiers_non");
    decoches(document, "tiers_oui");
    expect(document.lire(date)).toBe("2026-08-01");
  });

  it.each([
    ["PMT", { ...ENTREE, tmPmt: { p2_tm_pmt_acte: "oui" } }],
    ["DAP", { ...DAP, tmDap: { p2_tm_dap_acte: "oui" } }],
    [
      "S3141",
      {
        ...PERMISSION,
        overrides: { p2_tm_s3141_acte: "oui", p2_tm_s3141_aucun: "non" },
      },
    ],
  ] as const)("DOC-TM-%s", (type, options) => {
    const document = documentDe(options, type);
    coches(document, "exoneration_oui");
    decoches(document, "exoneration_non");
  });

  it("DOC-023 : une DAP urgente dispense de l'attente", () => {
    const dap = documentDe(
      { ...DAP, urgency: "Autre urgence médicale attestée" },
      "DAP",
    );
    coches(dap, "longue_distance", "urgence_autre");
    expect(vrai(dap.moteur, "cible_attente_accord_prealable_requise")).toBe(
      false,
    );
  });

  it("DOC-024 : une série de quatre trajets", () => {
    const dap = documentDe({ ...ENTREE, distance: 1, count: 4 }, "DAP");
    coches(dap, "serie", "aller_retour");
    decoches(dap, "longue_distance", "avion_bateau");
    expect(dap.lire("nombre")).toBe("4");
  });

  it("DOC-025 : avion et hospitalisation", () => {
    const dap = documentDe(
      { ...ENTREE, special: { p2_special_avion_bateau: "oui" } },
      "DAP",
    );
    coches(dap, "avion_bateau", "air_hospitalisation");
    decoches(
      dap,
      "air_ald_exo",
      "air_ald_non_exo",
      "air_atmp",
      "longue_distance",
    );
    expect(dap.lire("nombre")).toBe("1");
  });

  it("DOC-026 : longue distance seule, un trajet", () => {
    const dap = documentDe(DAP, "DAP");
    coches(dap, "longue_distance");
    decoches(
      dap,
      "avion_bateau",
      "air_hospitalisation",
      "air_atmp",
      "aller_retour",
    );
    expect(dap.lire("nombre")).toBe("1");
  });

  it("DOC-029 : permission en DAP, total saisi", () => {
    const dap = documentDe(
      {
        ...PERMISSION,
        distance: 2,
        overrides: { p2_nombre_transports_permission_dap: "12" },
      },
      "DAP",
    );
    coches(dap, "longue_distance");
    expect(dap.lire("nombre")).toBe("12");
    expect(dap.lire("elements_medicaux")).toContain(
      "4 allers-retours par mois",
    );
  });
});

describe("DOC, le S3141", () => {
  it("DOC-008 : ni rubrique médicale, ni urgence, ni centre de référence", () => {
    const s3141 = documentDe(PERMISSION, "S3141");
    for (const id of [
      "elements_medicaux",
      "urgence_autre",
      "urgence_appel15",
      "urgence_precision",
      "centre_rare",
    ])
      expect(s3141.existe(id), id).toBe(false);
    expect(s3141.lire("debut_hospitalisation")).toBe("2026-08-01");
    expect(s3141.lire("periode_fin")).toBe("2026-12-31");
  });

  it("DOC-027 : quatre allers-retours donnent huit trajets par mois", () => {
    const s3141 = documentDe(PERMISSION, "S3141");
    coches(s3141, "aller_retour");
    expect(s3141.lire("nombre")).toBe("8");
  });

  it("DOC-028 : un trajet retour distinct", () => {
    const s3141 = documentDe(
      {
        ...PERMISSION,
        organization: "aller-retour différent",
        depart: "Domicile",
        arrival: "Structure de soins",
      },
      "S3141",
    );
    coches(s3141, "depart_domicile", "arrivee_structure");
    decoches(s3141, "aller_retour");
    expect(s3141.lire("nombre")).toBe("4");
  });
});

describe("DOC, sans Cerfa", () => {
  it("DOC-030 et DOC-P05 : un transfert à la charge de l'établissement", () => {
    const positionne = moteur.setSituation(
      situationDuLivrable({
        ...INSTANT,
        reason: "Examen médical",
        transfer: true,
      }),
    );
    expect(texte(positionne, "cible_cas_final")).toBe(
      "transport à la charge de l’établissement",
    );
    expect(positionne.evaluate("p2_motif_detail").nodeValue).toBeNull();
  });
});
