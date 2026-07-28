import { beforeEach, describe, expect, it } from "vitest";
import {
  activerLabo,
  desactiverLabo,
  estServiceLabo,
  historiqueLabo,
  laboActif,
  reglesLaboActives,
  validerRegles,
  versionLaboActive,
} from "../../front/labo/labo";

const REGLES_OK = `montant net:\n  valeur: 100\n`;

beforeEach(() => {
  localStorage.clear();
});

describe("validerRegles", () => {
  it("accepte un document publicodes valide", () => {
    const r = validerRegles(REGLES_OK);
    expect(r).toEqual({ ok: true, nbRegles: 1 });
  });

  it("rejette une syntaxe YAML invalide avec la position", () => {
    const r = validerRegles("a:\n  - x\n b: y");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/YAML/);
  });

  it("rejette des règles incohérentes (référence manquante)", () => {
    const r = validerRegles("a:\n  valeur: b + 1\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/invalides/i);
  });
});

describe("activation / désactivation", () => {
  it("active un jeu de règles et le retrouve, puis le désactive", () => {
    expect(laboActif()).toBe(false);

    activerLabo({ nom: "v2.publicodes", yaml: REGLES_OK, date: iso() });
    expect(laboActif()).toBe(true);
    expect(reglesLaboActives()).toBe(REGLES_OK);
    expect(versionLaboActive()?.nom).toBe("v2.publicodes");

    desactiverLabo();
    expect(laboActif()).toBe(false);
    // L'historique survit à la désactivation.
    expect(historiqueLabo()).toHaveLength(1);
  });

  it("historise les versions, dédupliquées par contenu, la plus récente en tête", () => {
    activerLabo({ nom: "a", yaml: "x:\n  valeur: 1\n", date: iso() });
    activerLabo({ nom: "b", yaml: "y:\n  valeur: 2\n", date: iso() });
    activerLabo({ nom: "a-bis", yaml: "x:\n  valeur: 1\n", date: iso() }); // même YAML que "a"

    const h = historiqueLabo();
    expect(h.map((v) => v.nom)).toEqual(["a-bis", "b"]);
  });
});

describe("estServiceLabo", () => {
  it("reconnaît le service par identifiant Grist", () => {
    expect(estServiceLabo({ id: "4", libelle: "Peu importe" })).toBe(true);
  });

  it("reconnaît le service par libellé (insensible à la casse)", () => {
    expect(estServiceLabo({ id: "s_x", libelle: "transport sanitaire" })).toBe(true);
  });

  it("ignore les autres services", () => {
    expect(estServiceLabo({ id: "s_grenoble_cardio", libelle: "Cardiologie" })).toBe(
      false
    );
  });
});

const iso = () => new Date().toISOString();
