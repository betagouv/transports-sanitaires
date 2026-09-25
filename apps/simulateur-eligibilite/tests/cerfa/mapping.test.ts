// La couture de contrat du mapping documentaire : que la transcription de
// `front/simulateur/secretariat/` reste fidèle au YAML documentaire de la v9.7,
// et que `outils-produit/beta/cerfa/mapping.ts` la lise correctement. Ne touche
// pas au PDF — c'est `tests/cerfa/remplissage.test.ts` qui confronte un tableau
// de remplissage à son gabarit.
//
// Le compte de lignes est la garantie la plus dure : une ligne ajoutée ou
// retirée par l'éditeur à la prochaine livraison le fait rougir, alors que rien
// ne le signalait avant ce lot.

import { describe, expect, it } from "vitest";
import { dateSurLeChamp } from "../../front/outils-produit/beta/cerfa/dates.ts";
import {
  adresseSurLaLigne,
  depuisLeMapping,
} from "../../front/outils-produit/beta/cerfa/mapping.ts";
import { reponsesDe } from "../../front/outils-produit/beta/cerfa/reponses.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import type { Rubrique } from "../../front/simulateur/secretariat/case-de-formulaire.ts";
import { origineDe } from "../../front/simulateur/secretariat/case-de-formulaire.ts";
import { RUBRIQUES_DAP } from "../../front/simulateur/secretariat/rubriques/rubriques-de-la-dap.ts";
import { RUBRIQUES_PMT } from "../../front/simulateur/secretariat/rubriques/rubriques-du-pmt.ts";
import { RUBRIQUES_S3141 } from "../../front/simulateur/secretariat/rubriques/rubriques-du-s3141.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";

// [nom, rubriques, lignes du mapping]. Comptées ligne à ligne sur le YAML
// documentaire de la v9.7 : PMT 64, DAP 71, S3141 55 — cf. spec 0006.
const FORMULAIRES: ReadonlyArray<
  [nom: string, rubriques: readonly Rubrique[], lignes: number]
> = [
  ["PMT S3138g", RUBRIQUES_PMT, 64],
  ["DAP S3139h", RUBRIQUES_DAP, 71],
  ["S3141", RUBRIQUES_S3141, 55],
];

// Une ligne d'origine `application` sans `source` ni `composition` : aucune
// règle du moteur ne la tranche (`date_prescription`, posée par
// `date-de-prescription.ts`, hors moteur). Nommée ici plutôt que de laisser
// passer un défaut en silence. `elements_medicaux` en sortait depuis la spec
// 0005 : sa ligne porte `composition: "EM-1"` à la place d'une source.
const APPLICATION_SANS_SOURCE = ["date_prescription"];

const moteur = moteurDeTest(situationDe(seedParId("secretariat-prescription")));

describe.each(FORMULAIRES)("%s", (_nom, rubriques, lignes) => {
  const toutesLesCases = rubriques.flatMap((rubrique) => rubrique.cases);

  it(`compte ${lignes} lignes`, () => {
    expect(toutesLesCases.length).toBe(lignes);
  });

  it("les ids sont uniques", () => {
    const ids = toutesLesCases.map((laCase) => laCase.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("chaque source déclarée s'évalue sur le moteur réel", () => {
    const echouent = toutesLesCases
      .filter((laCase) => laCase.source !== undefined)
      .filter((laCase) => !sEvalue(laCase.source as string))
      .map((laCase) => laCase.id);
    expect(echouent).toEqual([]);
  });

  it("toute case publicodes ou application porte une source ou une composition, sauf l'exception nommée", () => {
    const sansSource = toutesLesCases
      .filter((laCase) =>
        ["publicodes", "application"].includes(origineDe(laCase)),
      )
      .filter((laCase) => laCase.source === undefined)
      .filter((laCase) => laCase.composition === undefined)
      .map((laCase) => laCase.id)
      .filter((id) => !APPLICATION_SANS_SOURCE.includes(id));
    expect(sansSource).toEqual([]);
  });

  it("aucune case externe ou manuelle ne porte de source", () => {
    const avecSource = toutesLesCases
      .filter((laCase) => ["externe", "manuel"].includes(origineDe(laCase)))
      .filter((laCase) => laCase.source !== undefined)
      .map((laCase) => laCase.id);
    expect(avecSource).toEqual([]);
  });
});

it("EM-MAPPING-ET-CONTRAT-ALIGNES", () => {
  // Les lignes `elements_medicaux` du PMT et de la DAP portent bien
  // `composition: "EM-1"` et `rendu: "texte"` — le S3141 n'a pas de ligne de
  // ce nom, cf. `EM-S3141-SANS-RUBRIQUE`.
  for (const rubriques of [RUBRIQUES_PMT, RUBRIQUES_DAP]) {
    const laCase = rubriques
      .flatMap((rubrique) => rubrique.cases)
      .find((c) => c.id === "elements_medicaux");
    expect(laCase?.composition).toBe("EM-1");
    expect(laCase?.rendu).toBe("texte");
  }
});

describe("dateSurLeChamp", () => {
  it("rend JJMMAAAA sur un champ à huit cases", () => {
    expect(dateSurLeChamp("2026-03-31", 8)).toBe("31032026");
  });

  it("rend JJ/MM/AAAA sur un champ à dix cases", () => {
    expect(dateSurLeChamp("2026-03-31", 10)).toBe("31/03/2026");
  });

  it("rend une valeur qui n'a pas la forme ISO telle quelle", () => {
    expect(dateSurLeChamp("", 8)).toBe("");
    expect(dateSurLeChamp("hors modèle", 10)).toBe("hors modèle");
  });
});

// La seed la plus chargée du CERFA : ambulance, aller-retour depuis le
// domicile vers une structure de soins, accident causé par un tiers.
describe("depuisLeMapping", () => {
  const réponses = reponsesDe(
    moteurDeTest(),
    situationDe(seedParId("secretariat-prescription")),
  );

  it("coche une case que le moteur tranche", () => {
    const remplissage = depuisLeMapping(
      RUBRIQUES_PMT,
      "ambulance_position_allongee_demi_assise",
    );
    expect(remplissage(réponses)).toEqual({ coché: "On" });
  });

  it("coche « Non » seulement si la cible source est explicitement fausse", () => {
    // L'accident causé par un tiers est retenu : « Oui » se coche, « Non » ne
    // se coche pas — ce n'est pas la négation de l'autre case.
    expect(depuisLeMapping(RUBRIQUES_PMT, "tiers_oui")(réponses)).toEqual({
      coché: "On",
    });
    expect(
      depuisLeMapping(RUBRIQUES_PMT, "tiers_non")(réponses),
    ).toBeUndefined();
  });

  it("écrit la date que le modèle tranche", () => {
    const remplissage = depuisLeMapping(RUBRIQUES_PMT, "tiers_date");
    expect(remplissage(réponses)).toEqual({ texte: "2026-01-12" });
  });

  it("coche le domicile sur une ligne de départ", () => {
    expect(depuisLeMapping(RUBRIQUES_PMT, "depart_domicile")(réponses)).toEqual(
      { coché: "On" },
    );
  });

  it("compose la ligne d'une structure de soins", () => {
    const remplissage = depuisLeMapping(RUBRIQUES_PMT, "arrivee_structure");
    expect(remplissage(réponses)).toEqual({
      texte: "Centre hospitalier, 2 rue de l’Arrivée, 75002, Paris",
    });
  });

  it("laisse une donnée externe au prescripteur, avec sa raison", () => {
    const remplissage = depuisLeMapping(
      RUBRIQUES_PMT,
      "beneficiaire_nom_prenom",
    );
    expect(remplissage(réponses)).toMatchObject({
      laisséÀ: "le prescripteur",
    });
  });

  it("laisse l'adresse du bénéficiaire au prescripteur, jamais à l'adresse du trajet", () => {
    // TS973-14 : rien ne doit copier l'adresse de départ ou d'arrivée dans
    // l'adresse du bénéficiaire — la ligne n'a pas de source, quelle que soit
    // la situation, y compris quand un lieu de trajet est renseigné.
    const remplissage = depuisLeMapping(RUBRIQUES_PMT, "beneficiaire_adresse");
    expect(remplissage(réponses)).toMatchObject({
      laisséÀ: "le prescripteur",
    });
  });

  it("laisse le cadre transporteur au transporteur", () => {
    const remplissage = depuisLeMapping(RUBRIQUES_PMT, "cadre_transporteur");
    expect(remplissage(réponses)).toMatchObject({
      laisséÀ: "le transporteur",
    });
  });

  it("laisse l'avis de la caisse à la caisse, sur la DAP", () => {
    const remplissage = depuisLeMapping(RUBRIQUES_DAP, "avis_caisse");
    expect(remplissage(réponses)).toMatchObject({ laisséÀ: "la caisse" });
  });

  it("lève sur un id que la feuille ne connaît pas", () => {
    expect(() => depuisLeMapping(RUBRIQUES_PMT, "inconnu")).toThrow();
  });
});

describe("adresseSurLaLigne", () => {
  it("assemble les composants renseignés, dans l'ordre du formulaire", () => {
    const réponses = reponsesDe(
      moteurDeTest(),
      situationDe(seedParId("secretariat-prescription")),
    );
    expect(
      adresseSurLaLigne(RUBRIQUES_PMT, "arrivee_structure", réponses),
    ).toBe("Centre hospitalier, 2 rue de l’Arrivée, 75002, Paris");
  });
});

// ---- implémentation ----

// Publicodes jette sur une clé inconnue : c'est la seule façon de savoir qu'une
// règle existe *et* s'évalue, plutôt que de la chercher dans le YAML brut.
function sEvalue(regle: string): boolean {
  try {
    moteur.evaluate(regle);
    return true;
  } catch {
    return false;
  }
}
