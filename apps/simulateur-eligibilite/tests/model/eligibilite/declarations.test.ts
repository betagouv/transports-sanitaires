// Les déclarations du modèle, comparées aux règles de l'éditeur.
//
// Les faits et les cibles sont écrits à la main, pour typer le modèle. Rien
// d'autre ne garantit qu'ils nomment ce que les règles nomment.

import { describe, expect, it } from "vitest";
import {
  CIBLES,
  CIBLES_ENUMEREES,
} from "../../../front/models/eligibilite/declarations/cibles";
import { FAITS } from "../../../front/models/eligibilite/declarations/faits";
import { OPTIONS } from "../../../front/models/eligibilite/declarations/questions";
import { rules } from "../../../front/models/eligibilite/rules/regles.publicodes";

type Regle = {
  type?: string;
  valeur?: { variations?: { alors?: string; sinon?: string }[] };
};

const regles = rules as Record<string, Regle>;
const nomsCommencantPar = (prefixe: string) =>
  Object.keys(regles).filter((nom) => nom.startsWith(prefixe));
const tries = (noms: readonly string[]) => [...noms].sort();

// Les constantes qu'une règle peut rendre : ce qui suit ses `alors` et son
// `sinon`, sans les apostrophes de publicodes.
const constantesDe = (cible: string) => [
  ...new Set(
    (regles[cible]?.valeur?.variations ?? []).map((variation) =>
      (variation.alors ?? variation.sinon ?? "").replaceAll("'", ""),
    ),
  ),
];

describe("les faits déclarés", () => {
  it("sont ceux que les règles reçoivent, ni plus ni moins", () => {
    expect(
      tries(FAITS),
      "Un fait déclaré que les règles ignorent ne décide rien. Un fait des " +
        "règles qui n'est pas déclaré reste sans valeur, et l'issue n'est " +
        "plus calculable.",
    ).toEqual(tries(nomsCommencantPar("fait_")));
  });

  it("valent tous « oui » ou « non »", () => {
    expect(
      nomsCommencantPar("fait_").filter((nom) => regles[nom]?.type),
      "Les faits sont déclarés en `Fait`, qui part aux règles en « oui » ou " +
        "« non ». Un fait typé par les règles, un nombre par exemple, " +
        "fausserait toute comparaison.",
    ).toEqual([]);
  });
});

describe("les cibles déclarées", () => {
  it("sont celles que les règles calculent, ni plus ni moins", () => {
    expect(
      tries(CIBLES),
      "Une cible déclarée que les règles ne calculent pas fait échouer la " +
        "préconisation. Une cible des règles qui n'est pas déclarée n'atteint " +
        "ni le résultat ni le cerfa.",
    ).toEqual(tries(nomsCommencantPar("cible_")));
  });

  it.each(Object.entries(CIBLES_ENUMEREES))(
    "%s ne vaut que les constantes déclarées",
    (cible, constantes) => {
      expect(
        tries(constantes),
        "Le résultat et le cerfa aiguillent sur ces constantes. Une constante " +
          "des règles qui manque ici n'est traitée par personne.",
      ).toEqual(tries(constantesDe(cible)));
    },
  );
});

describe("les options déclarées", () => {
  // Q2.2.1.b ne montre que les options 1, 4 à 10 et 13 des treize de Q2.2.1 :
  // elles gardent leur numéro du catalogue (S1). Q2.6 pose son option 1, le
  // type du transfert, à part (D-106).
  const { "Q2.2.1.b": contextes, "Q2.6": exceptions, ...suivies } = OPTIONS;

  it.each(Object.entries(suivies))(
    "%s numérote ses options comme le catalogue, de 1 en 1",
    (_, options) => {
      const slugs = Object.keys(options);
      expect(
        slugs.map((slug) => slug.split("_")[0]),
        "Un slug commence par le numéro de l'option dans le catalogue de " +
          "l'éditeur, et les options se déclarent dans son ordre : c'est ce " +
          "qui permet de relire une condition contre le catalogue.",
      ).toEqual(slugs.map((_, rang) => String(rang + 1)));
    },
  );

  it("Q2.2.1.b garde les numéros des options de Q2.2.1", () => {
    expect(
      Object.keys(contextes).map((slug) => Number(slug.split("_")[0])),
    ).toEqual([1, 4, 5, 6, 7, 8, 9, 10, 13]);
  });

  it("Q2.6 numérote ses exceptions à partir de 2, après le type", () => {
    expect(
      Object.keys(exceptions).map((slug) => Number(slug.split("_")[0])),
    ).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it.each(Object.entries(OPTIONS))(
    "%s nomme chaque option après son numéro",
    (_, options) => {
      expect(
        Object.keys(options).filter((slug) => !/^\d+_[A-Z][A-Z_]*$/.test(slug)),
        "Le numéro seul ne dit rien à la lecture : le slug le fait suivre " +
          "de ce que l'option veut dire, en majuscules.",
      ).toEqual([]);
    },
  );
});

describe("les libellés des options", () => {
  it("ne portent aucune consigne destinée aux développeurs", () => {
    const libelles = Object.values(OPTIONS).flatMap((options) =>
      Object.values(options),
    );
    expect(
      libelles.filter((libelle) =>
        /\bQ\d|à préciser|déduit de|\[Seulement/.test(libelle),
      ),
      "Le catalogue mêle parfois au libellé une consigne pour nous (« à " +
        "préciser en Q2.10 », « déduit de Q1.3… »). Le prescripteur ne doit " +
        "voir que le libellé.",
    ).toEqual([]);
  });
});
