// TS973-17 : l'âge, les dates et le cadre d'une permission se qualifient
// avant les contextes complémentaires, et l'urgence se pose après le trajet.
// Un S3141 sans DAP ne demande pas l'urgence, une permission avec DAP la
// garde.

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur, texte, vrai } from "../../front/simulateur/moteur";
import { ETAPES } from "../../front/simulateur/questionnaire/etapes";
import { champsPoses } from "./champs-poses";

beforeEach(() => sessionStorage.clear());

const RAISON = /raison principale du déplacement/i;
const PERMISSION = /^permission temporaire de sortie$/i;
const AGE = /^dans quelle tranche d’âge le patient se situe-t-il/i;
const CADRE = /^dans quel cadre cette permission/i;
const DISTANCE = /^la distance du trajet aller/i;

describe("TS973-17, l'ordre des étapes", () => {
  it("permissions avant contextes, urgence après la distance", () => {
    const ordre = ETAPES.map((etape) => etape.id);
    const rang = (id: string) => {
      expect(ordre).toContain(id);
      return ordre.indexOf(id);
    };
    expect(rang("p2_permission_cadre")).toBeLessThan(
      rang("p2_contextes_complementaires"),
    );
    expect(rang("p2_transport_urgence")).toBeGreaterThan(
      rang("p2_justification_longue_distance"),
    );
    expect(rang("p2_urgence_autre_precision")).toBe(
      rang("p2_transport_urgence") + 1,
    );
  });
});

describe("TS973-17, les issues sans contextes", () => {
  it.each([
    [
      "Demande du patient sans justification médicale",
      /reste à votre charge|à la charge du patient/i,
    ],
    ["Motif thérapeutique", /à la charge de l’établissement/i],
  ])(
    "à 20 ans, le cadre « %s » conclut sans contextes",
    async (cadre, issue) => {
      const posees = await champsPoses([
        [RAISON, PERMISSION],
        [AGE, /^20 ans ou plus$/i],
        [CADRE, new RegExp(`^${cadre}$`, "i")],
      ]);
      expect(posees).toContain("p2_permission_cadre");
      expect(posees.some((nom) => nom.startsWith("p2_contexte_"))).toBe(false);
      expect(posees).not.toContain("p2_transport_urgence");
      expect(
        await screen.findAllByText(issue, undefined, { timeout: 10_000 }),
      ).not.toHaveLength(0);
    },
    60_000,
  );
});

describe("TS973-17, l'urgence", () => {
  it("un S3141 sans DAP ne la demande pas", async () => {
    const posees = await champsPoses([
      [RAISON, PERMISSION],
      [AGE, /^de 16 à 19 ans$/i],
      [CADRE, /^motif thérapeutique$/i],
    ]);
    expect(posees).toContain("p2_permission_ar_par_mois");
    expect(posees).not.toContain("p2_transport_urgence");
    expect(
      await screen.findAllByText(/S3141/, undefined, { timeout: 10_000 }),
    ).not.toHaveLength(0);
    // Le parcours standard s'applique au S3141 : ses contextes restent posés.
    expect(posees.some((nom) => nom.startsWith("p2_contexte_"))).toBe(true);
  }, 60_000);

  it("une permission avec DAP la demande, après la distance", async () => {
    const posees = await champsPoses([
      [RAISON, PERMISSION],
      [AGE, /^de 16 à 19 ans$/i],
      [CADRE, /^motif thérapeutique$/i],
      [DISTANCE, /^plus de 150 km$/i],
    ]);
    expect(posees.some((nom) => nom.startsWith("p2_contexte_"))).toBe(true);
    const urgence = posees.indexOf("p2_transport_urgence");
    const distance = posees.indexOf("p2_tranche_distance_trajet_aller");
    expect(distance).not.toBe(-1);
    expect(urgence).toBeGreaterThan(distance);
  }, 60_000);
});

describe("TS973-17, au moteur", () => {
  const S3141 = situationDe(seedParId("secretariat-permission-s3141"));

  it.each([
    ["aller-retour identique", "Structure de soins", "Domicile", true, "2"],
    ["trajets simples", "Structure de soins", "Domicile", false, "1"],
    ["trajets simples", "Domicile", "Structure de soins", false, "1"],
    ["aller-retour différent", "Domicile", "Structure de soins", false, "1"],
  ])(
    "%s de %s vers %s : S3141, aller-retour coché %s, %s trajet(s) par mois",
    (organisation, depart, arrivee, allerRetour, nombre) => {
      const positionne = moteur.setSituation(
        avecEntreesCalculees({
          ...S3141,
          p2_organisation_transports: `'${organisation}'`,
          p2_trajet_depart: `'${depart}'`,
          p2_trajet_arrivee: `'${arrivee}'`,
          p2_depart_nom_lieu: "'Centre hospitalier'",
          p2_arrivee_nom_lieu: "'Centre hospitalier'",
        }),
      );
      expect(texte(positionne, "cible_cas_final")).toBe("prescription S3141");
      expect(vrai(positionne, "cible_case_aller_retour")).toBe(allerRetour);
      expect(texte(positionne, "cible_s3141_nombre_trajets_mois")).toBe(nombre);
    },
  );

  it.each([
    ["Appel au SAMU - Centre 15", true],
    ["Non", false],
  ])(
    "une permission avec DAP garde l'effet de l'urgence « %s »",
    (urgence, attestee) => {
      const positionne = moteur.setSituation(
        avecEntreesCalculees({
          ...situationDe(seedParId("secretariat-permission-longue-distance")),
          p2_transport_urgence: `'${urgence}'`,
        }),
      );
      expect(texte(positionne, "cible_cas_final")).toBe(
        "demande d’accord préalable",
      );
      expect(vrai(positionne, "cible_urgence_attestee")).toBe(attestee);
    },
  );
});
