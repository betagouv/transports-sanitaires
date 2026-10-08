// Les déclarations du modèle, comparées aux règles de l'éditeur.
//
// Les faits et les cibles sont écrits à la main, pour typer le modèle. Rien
// d'autre ne garantit qu'ils nomment ce que les règles nomment.

import { describe, expect, it } from "vitest";
import {
  CIBLES,
  CIBLES_ENUMEREES,
} from "../../front/model/declarations/cibles";
import {
  FAITS_BOOLEENS,
  FAITS_NUMERIQUES,
} from "../../front/model/declarations/faits";
import { OPTIONS } from "../../front/model/declarations/questions";
import { rules } from "../../front/model/rules/regles.publicodes";

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
      tries([...FAITS_BOOLEENS, ...FAITS_NUMERIQUES]),
      "Un fait déclaré que les règles ignorent ne décide rien. Un fait des " +
        "règles qui n'est pas déclaré reste sans valeur, et l'issue n'est " +
        "plus calculable.",
    ).toEqual(tries(nomsCommencantPar("fait_")));
  });

  it("se comptent quand les règles les disent numériques", () => {
    expect(
      tries(FAITS_NUMERIQUES),
      "Un fait numérique transmis comme « oui » ou « non » fausse toute " +
        "comparaison à un seuil.",
    ).toEqual(
      tries(
        nomsCommencantPar("fait_").filter(
          (nom) => regles[nom]?.type === "nombre",
        ),
      ),
    );
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
  it.each(Object.entries(OPTIONS))(
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
