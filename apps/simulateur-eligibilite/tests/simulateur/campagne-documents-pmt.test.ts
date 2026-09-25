// La campagne v9.7.3 de l'éditeur sur les documents (`documents.mjs`), côté
// PMT et adresses,
// rejouée sous ses identifiants `DOC-*`. Un champ du document se lit par son
// id du mapping, comme `field()` de la campagne, à travers notre transcription
// (`depuisLeMapping`) : c'est elle que le Cerfa remplit.
//
// Écarts de lecture, sans écart de fond :
// - une date se lit en ISO, là où le payload de l'éditeur la rend en
//   `JJ/MM/AAAA` : c'est le Cerfa qui la reformate, champ par champ ;
// - un nombre se lit en texte ;
// - les composants d'une adresse se lisent sur la ligne qu'ils composent.
//
// Non transposé :
// - les pages PDF et la confidentialité (`DOC-PRIV-*`), couvertes par
//   `tests/cerfa/texte-medical-integral.test.ts` ;
// - l'identité injectée dans le payload (`DOC-ADDR-*`, second volet) et la
//   date de prescription (`DOC-031`), posées hors mapping ;
// - les étapes vues de `DOC-P04`, `DOC-P05` et `DOC-P07`, couvertes par les
//   tests du parcours. Leur part moteur est rejouée ici.

import { describe, expect, it } from "vitest";
import {
  BRANCARDAGE,
  coches,
  DAP,
  decoches,
  documentDe,
  ENTREE,
  PERMISSION,
  SORTIE,
} from "./document-du-livrable";

describe("DOC, la PMT", () => {
  it("DOC-001", () => {
    const pmt = documentDe(SORTIE, "PMT");
    coches(
      pmt,
      "hospitalisation",
      "ambulance_brancardage_portage",
      "tiers_non",
      "exoneration_non",
      "arrivee_domicile",
    );
    decoches(
      pmt,
      "ald_exo",
      "ald_non_exo",
      "tiers_oui",
      "exoneration_oui",
      "mode_tap_ou_tpmr",
      "urgence_autre",
      "urgence_appel15",
    );
    expect(pmt.lire("elements_medicaux")).toContain(BRANCARDAGE);
  });

  it("DOC-005 : adresse EHPAD sur la ligne autre lieu", () => {
    const pmt = documentDe(
      {
        ...SORTIE,
        arrival: "EHPAD",
        overrides: {
          p2_arrivee_nom_lieu: "'EHPAD Bêta'",
          p2_arrivee_complement_adresse: "'Bâtiment B'",
        },
      },
      "PMT",
    );
    coches(pmt, "arrivee_autre");
    decoches(pmt, "arrivee_domicile", "arrivee_structure");
    // Les composants s'assemblent sur la ligne choisie : c'est elle qu'écrit
    // le Cerfa.
    expect(pmt.lire("arrivee_autre")).toContain("EHPAD Bêta");
    expect(pmt.lire("arrivee_autre")).toContain("Bâtiment B");
  });

  it.each([
    ["EXO", "Exonérante", "ald_exo", "ald_non_exo"],
    ["NONEXO", "Non exonérante", "ald_non_exo", "ald_exo"],
  ])("DOC-ALD-%s", (_id, aldType, attendue, opposee) => {
    const pmt = documentDe(
      { ...ENTREE, m0: { p1_m0_ald: "oui" }, aldType },
      "PMT",
    );
    coches(pmt, attendue, "exoneration_non");
    decoches(pmt, opposee, "exoneration_oui");
  });

  it("DOC-013 : accident causé par un tiers", () => {
    const pmt = documentDe({ ...SORTIE, third: true }, "PMT");
    coches(pmt, "tiers_oui");
    decoches(pmt, "tiers_non", "atmp");
    expect(pmt.lire("tiers_date")).toBe("2026-08-01");
    expect(pmt.lire("atmp_date")).toBe("");
  });

  it("DOC-014 : pension militaire", () => {
    const pmt = documentDe(
      { ...SORTIE, contexts: { p2_contexte_pension_militaire: "oui" } },
      "PMT",
    );
    coches(pmt, "pension_militaire_oui");
    decoches(pmt, "pension_militaire_non", "ald_exo", "atmp");
    expect(pmt.lire("elements_medicaux")).toContain(
      "pension militaire d’invalidité",
    );
  });

  it.each([
    [
      "018",
      { overrides: { p1_transport_partage_incompatible: "oui" } },
      ["mode_tap_ou_tpmr", "partage_incompatible"],
      [
        "mode_individual",
        "mode_public",
        "fauteuil",
        "ambulance_brancardage_portage",
        "ambulance_surveillance_constante",
      ],
    ],
    [
      "019",
      { criterion: "p1_critere_fauteuil_sans_transfert" },
      ["mode_tap_ou_tpmr", "fauteuil"],
      ["ambulance_brancardage_portage", "mode_individual", "mode_public"],
    ],
    [
      "020",
      { autonomy: 1 as const, mode: "Transports en commun" },
      ["mode_public", "accompagnant"],
      ["mode_individual", "mode_tap_ou_tpmr", "ambulance_brancardage_portage"],
    ],
  ])("DOC-%s : mode de transport", (_id, options, oui, non) => {
    const pmt = documentDe({ ...ENTREE, ...options }, "PMT");
    coches(pmt, ...oui);
    decoches(pmt, ...non);
  });

  it.each([
    ["15", "Appel au SAMU - Centre 15", "urgence_appel15", "urgence_autre", ""],
    [
      "AUTRE",
      "Autre urgence médicale attestée",
      "urgence_autre",
      "urgence_appel15",
      "État clinique nécessitant un transport sans délai",
    ],
  ])("DOC-URGENCE-%s", (_id, urgency, oui, non, precision) => {
    const pmt = documentDe({ ...SORTIE, urgency }, "PMT");
    coches(pmt, oui);
    decoches(pmt, non);
    expect(pmt.lire("urgence_precision")).toBe(precision);
  });

  it("DOC-P01 : pas de nombre itératif pour un seul trajet (TS973-13)", () => {
    expect(documentDe(SORTIE, "PMT").lire("nombre")).toBe("");
  });

  it("DOC-P06 : « Autre examen ou soin » mène droit à sa précision", () => {
    const pmt = documentDe(
      {
        reason: "Autre examen ou soin",
        criterion: "p1_critere_brancardage_portage",
      },
      "PMT",
    );
    expect(pmt.lire("elements_medicaux")).toContain(
      "Examen de contrôle médical",
    );
  });

  it("DOC-P02, DOC-P03, DOC-P04 : texte médical EM-2 (TS973-12)", () => {
    const texteMedical = String(
      documentDe(SORTIE, "PMT").lire("elements_medicaux"),
    );
    expect(texteMedical).not.toContain("\n");
    expect(texteMedical).toContain(` ; ${BRANCARDAGE}`);
    expect(texteMedical).not.toMatch(/annexe/i);
    expect(texteMedical).not.toMatch(/Hospitalisation complète/);
  });
});

describe("DOC, adresses et domicile", () => {
  it.each([
    ["PMT", SORTIE, "arrivee", "depart"],
    ["DAP", DAP, "depart", "arrivee"],
    ["S3141", PERMISSION, "arrivee", "depart"],
  ] as const)(
    "DOC-ADDR-%s (et EM-DOMICILE-NE-REMPLIT-PAS-IDENTITE)",
    (type, options, domicile, autre) => {
      const document = documentDe(options, type);
      coches(document, `${domicile}_domicile`, `${autre}_structure`);
      // L'adresse du domicile n'est pas recopiée, ni dans le trajet ni dans
      // l'en-tête du bénéficiaire, qui reste une donnée externe.
      expect(document.lire(`${domicile}_adresse`)).toBe("");
      expect(document.lire("beneficiaire_adresse")).toBe("");
      expect(document.lire(`${autre}_structure`)).toContain(
        autre === "depart" ? "12 rue des Lilas" : "30 rue Victor Hugo",
      );
      expect(document.lire(`${autre}_structure`)).toContain(
        autre === "depart" ? "01000" : "69001",
      );
    },
  );
});
