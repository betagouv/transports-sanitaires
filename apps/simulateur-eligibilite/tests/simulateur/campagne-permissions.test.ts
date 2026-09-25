// La campagne v9.7.3 de l'éditeur sur les permissions de sortie
// (`tests/campagne-v973/permissions.mjs`), rejouée au moteur sous ses
// identifiants `PERM-*`.
//
// Un refus de la campagne (saisie rejetée par `Session.submit`) se lit au
// moteur comme un résultat bloqué : les gardes des entrées calculées
// (`p2_permission_dates_valides`, `p2_permission_calendrier_valide`,
// `p2_types_lieux_valides`, `p2_nombre_permission_dap_valide`) le portent.
//
// Non transposés, faute de session au moteur nu :
// - `PERM-CHANGEMENT-AGE` et `PERM-CHANGEMENT-DATE` rejouent une modification
//   après coup. L'application n'efface en aval que sur la raison, le
//   transfert et ses exceptions (TS973-16) ;
// - `PERM-UX-*` lisent les écrans vus. Ils sont couverts à l'écran par
//   `permissions-qualifiees-tot.test.tsx` ;
// - les bornes de fréquence (`PERM-FREQUENCE-*` invalides) sont aussi posées
//   par la saisie elle-même (`bornes-de-saisie.ts`). Le moteur, lui, bloque.

import { describe, expect, it } from "vitest";
import { texte, vrai } from "../../front/simulateur/moteur";
import { evaluerLeCas, type OptionsDuLivrable } from "./livrable";

const PERMISSION = "Permission temporaire de sortie";
const S3141 = "prescription S3141";
const ETABLISSEMENT = "transport à la charge de l’établissement";
const PATIENT = "permission de sortie sans motif médical";
const DAP = "demande d’accord préalable";

describe("PERM, le jour et l'âge", () => {
  it.each([12, 13, 14, 15])("PERM-JOUR-%i", (jour) => {
    const date = `2026-08-${String(jour).padStart(2, "0")}`;
    const lendemain = `2026-08-${String(jour + 1).padStart(2, "0")}`;
    const moteur = permission({
      permissionStart: `${date}T10:00:00+02:00`,
      permissionEnd: `${lendemain}T10:00:00+02:00`,
    });
    expect(casFinal(moteur)).toBe(jour < 14 ? ETABLISSEMENT : S3141);
    expect(texte(moteur, "p2_permission_rang_jour")).toBe(String(jour));
  });

  it.each([
    ["PERM-AGE-15", "Moins de 16 ans", S3141],
    ["PERM-AGE-19", "De 16 à 19 ans", S3141],
    ["PERM-AGE-20", "20 ans ou plus", ETABLISSEMENT],
  ])("%s", (_id, age, attendu) => {
    expect(casFinal(permission({ age }))).toBe(attendu);
  });
});

describe("PERM, le financement hors régime dérogatoire", () => {
  const J13 = {
    age: "De 16 à 19 ans",
    permissionStart: "2026-08-13T10:00:00+02:00",
    permissionEnd: "2026-08-14T10:00:00+02:00",
  };
  it.each([
    ["THERAPEUTIQUE", "Motif thérapeutique", ETABLISSEMENT],
    ["ORGANISATION", "Organisation de l’établissement", ETABLISSEMENT],
    ["PATIENT", "Demande du patient sans justification médicale", PATIENT],
  ])("PERM-FINANCE-%s-20", (_id, cadre, attendu) => {
    const vingt = permission({ age: "20 ans ou plus", permissionCadre: cadre });
    expect(casFinal(vingt)).toBe(attendu);
  });

  it.each([
    ["THERAPEUTIQUE", "Motif thérapeutique", ETABLISSEMENT],
    ["ORGANISATION", "Organisation de l’établissement", ETABLISSEMENT],
    ["PATIENT", "Demande du patient sans justification médicale", PATIENT],
  ])("PERM-FINANCE-%s-J13", (_id, cadre, attendu) => {
    expect(casFinal(permission({ ...J13, permissionCadre: cadre }))).toBe(
      attendu,
    );
  });
});

describe("PERM, la durée (48 heures réelles au plus)", () => {
  it.each([
    ["MINUTE", "2026-09-05T10:01:00+02:00", 1 / 60],
    ["47H59", "2026-09-07T09:59:00+02:00", 47 + 59 / 60],
    ["48H", "2026-09-07T10:00:00+02:00", 48],
  ])("PERM-DUREE-%s", (_id, permissionEnd, heures) => {
    const moteur = permission({ permissionEnd });
    expect(casFinal(moteur)).toBe(S3141);
    expect(Number(texte(moteur, "p2_permission_duree_heures"))).toBeCloseTo(
      heures,
      9,
    );
  });

  it.each([
    ["ZERO", "2026-09-05T10:00:00+02:00"],
    ["NEGATIVE", "2026-09-05T09:59:00+02:00"],
    ["48H01", "2026-09-07T10:01:00+02:00"],
    ["49H", "2026-09-07T11:00:00+02:00"],
  ])("PERM-DUREE-%s", (_id, permissionEnd) => {
    estRefuse(permission({ permissionEnd }));
  });

  it("PERM-DST-PRINTEMPS-47H", () => {
    const moteur = permission({
      instant: "2026-03-27T10:00:00Z",
      hospital: "2026-03-01",
      permissionStart: "2026-03-28T10:00:00+01:00",
      permissionEnd: "2026-03-30T10:00:00+02:00",
      overrides: { p2_permission_periode_fin: "'2026-06-30'" },
    });
    expect(casFinal(moteur)).toBe(S3141);
    expect(texte(moteur, "p2_permission_duree_heures")).toBe("47");
  });

  it("PERM-DST-AUTOMNE-49H", () => {
    estRefuse(
      permission({
        hospital: "2026-09-01",
        permissionStart: "2026-10-24T10:00:00+02:00",
        permissionEnd: "2026-10-26T10:00:00+01:00",
      }),
    );
  });
});

describe("PERM, les dates", () => {
  it.each([
    ["HOSPITAL-FUTURE", { hospital: "2026-09-22" }],
    ["HOSPITAL-IMPOSSIBLE", { hospital: "2026-02-30" }],
    ["PERMISSION-AVANT-HOSPITAL", { hospital: "2026-09-06" }],
  ])("PERM-DATE-%s", (_id, options) => {
    estRefuse(permission({ ...options, instant: "2026-09-21T10:00:00Z" }));
  });

  it("PERM-DATE-SANS-FUSEAU : accepté, c'est l'heure de Paris", () => {
    // Écart assumé : l'éditeur refuse une date-heure sans fuseau. Notre
    // formulaire (`datetime-local`) n'en produit pas d'autre, et
    // `heure-de-paris.ts` la lit à l'heure de l'établissement.
    expect(
      casFinal(permission({ permissionStart: "2026-09-05T10:00:00" })),
    ).toBe(S3141);
  });
});

describe("PERM, la période (six mois après l'hospitalisation)", () => {
  it.each([
    ["AVANT-PREMIERE", {}, "2026-09-04", false],
    ["6MOIS-EXACT", {}, "2027-02-01", true],
    ["6MOIS-PLUS1", {}, "2027-02-02", false],
    ["FIN-MOIS", AVRIL, "2026-09-30", true],
    ["FIN-MOIS-DEPASSE", AVRIL, "2026-10-01", false],
  ])("PERM-PERIODE-%s", (_id, options, fin, admise) => {
    const moteur = permission({
      ...options,
      overrides: { p2_permission_periode_fin: `'${fin}'` },
    });
    if (admise) expect(casFinal(moteur)).toBe(S3141);
    else estRefuse(moteur);
  });
});

describe("PERM, la fréquence mensuelle", () => {
  it.each([
    ["ZERO", "0"],
    ["NEGATIF", "-1"],
    ["SIX", "6"],
    ["DECIMAL", "1.5"],
    ["TEXTE", "'4'"],
  ])("PERM-FREQUENCE-%s", (_id, frequence) => {
    estRefuse(
      permission({ overrides: { p2_permission_ar_par_mois: frequence } }),
    );
  });

  it.each([1, 4, 5])("PERM-FREQUENCE-VALIDE-%i", (frequence) => {
    const moteur = permission({
      overrides: { p2_permission_ar_par_mois: String(frequence) },
    });
    expect(casFinal(moteur)).toBe(S3141);
    expect(texte(moteur, "cible_s3141_nombre_trajets_mois")).toBe(
      String(frequence * 2),
    );
  });
});

describe("PERM, le trajet", () => {
  it.each([
    ["ALLER-SIMPLE", "trajets simples", "Structure de soins", "Domicile"],
    ["RETOUR-SIMPLE", "trajets simples", "Domicile", "Structure de soins"],
    [
      "RETOUR-DIFFERENT",
      "aller-retour différent",
      "Domicile",
      "Structure de soins",
    ],
  ])("PERM-TRAJET-%s", (_id, organization, depart, arrival) => {
    const moteur = permission({ organization, depart, arrival });
    expect(casFinal(moteur)).toBe(S3141);
    expect(vrai(moteur, "cible_case_aller_retour")).toBe(false);
    expect(texte(moteur, "cible_s3141_nombre_trajets_mois")).toBe("4");
    expect(texte(moteur, "cible_lieu_depart_type")).toBe(depart);
  });

  it.each([
    ["DOMICILE-DOMICILE", "Domicile", "Domicile"],
    ["STRUCTURE-STRUCTURE", "Structure de soins", "Structure de soins"],
    ["PRISON", "Structure de soins", "Établissement pénitentiaire"],
  ])("PERM-TRAJET-INVALIDE-%s", (_id, depart, arrival) => {
    estRefuse(permission({ organization: "trajets simples", depart, arrival }));
  });
});

describe("PERM, le total d'une DAP (TS973-09)", () => {
  const dap = (total: string, plus: OptionsDuLivrable = {}) =>
    permission({
      distance: 2,
      ...plus,
      overrides: {
        ...plus.overrides,
        p2_nombre_transports_permission_dap: total,
      },
    });
  const periodeCourte: OptionsDuLivrable = {
    instant: "2026-09-03T10:00:00Z",
    permissionStart: "2026-09-04T10:00:00+02:00",
    permissionEnd: "2026-09-06T10:00:00+02:00",
    overrides: {
      p2_permission_ar_par_mois: "1",
      p2_permission_periode_fin: "'2026-09-06'",
    },
  };

  it("PERM-DAP-TOTAL-DISTINCT", () => {
    const moteur = dap("12");
    expect(casFinal(moteur)).toBe(DAP);
    expect(texte(moteur, "cible_nombre_transports_document")).toBe("12");
  });
  it("PERM-DAP-TOTAL-ZERO", () => estRefuse(dap("0")));
  it.each(["1", "3", "11"])("PERM-DAP-ALLER-RETOUR-IMPAIR-%s", (total) => {
    estRefuse(dap(total));
  });
  it("PERM-DAP-TRAJETS-SIMPLES-IMPAIR", () => {
    const moteur = dap("11", { organization: "trajets simples" });
    expect(casFinal(moteur)).toBe(DAP);
    expect(vrai(moteur, "cible_case_aller_retour")).toBe(false);
  });
  it("PERM-DAP-PERIODE-2-TRAJETS", () => {
    const moteur = dap("2", periodeCourte);
    expect(casFinal(moteur)).toBe(DAP);
    expect(vrai(moteur, "cible_case_aller_retour")).toBe(true);
  });
  it.each(["4", "999"])("PERM-DAP-PERIODE-DEPASSE-%s", (total) => {
    estRefuse(dap(total, periodeCourte));
  });
});

// ---- implémentation ----

type Moteur = ReturnType<typeof evaluerLeCas>;

// Une permission le 31 mars : six mois calendaires mènent au 30 septembre.
const AVRIL: OptionsDuLivrable = {
  hospital: "2026-03-31",
  permissionStart: "2026-04-14T10:00:00+02:00",
  permissionEnd: "2026-04-16T10:00:00+02:00",
};

function permission(options: OptionsDuLivrable = {}): Moteur {
  return evaluerLeCas({ reason: PERMISSION, ...options });
}

function casFinal(moteur: Moteur): string {
  return texte(moteur, "cible_cas_final");
}

// Bloqué par une garde, et non faute d'une réponse : rien ne manque.
function estRefuse(moteur: Moteur) {
  const resultat = moteur.evaluate("cible_resultat_2_affichable");
  expect(resultat.nodeValue).toBe(false);
  expect(Object.keys(resultat.missingVariables)).toEqual([]);
}
