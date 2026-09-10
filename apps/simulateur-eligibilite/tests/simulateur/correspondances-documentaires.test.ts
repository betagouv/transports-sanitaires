// La couture entre les trois Cerfa et le modèle.
//
// Le YAML documentaire de la v9.7 nomme, pour chaque case des formulaires, la
// règle qui la décide. Nos rubriques en sont la recopie : elles désignent le
// modèle par des chaînes, comme le reste du produit, et une version qui renomme
// ou retire l'une de ces règles laisserait une case sans décideur.
//
// Le contrat de règles ferme déjà la moitié du problème — une clé qu'il ne
// déclare pas ne compile pas. Ce fichier ferme l'autre : que chacune existe
// dans les règles, et **dans quelle rubrique de quel formulaire** elle manque.
// C'est la différence qui compte le jour où ça rougit : « le S3141 n'a plus de
// source pour sa rubrique ④ » se corrige, « une cible a disparu » se cherche.

import { describe, expect, it } from "vitest";
import type {
  CaseDeFormulaire,
  Rubrique,
} from "../../front/simulateur/secretariat/case-de-formulaire";
import { RUBRIQUES_DAP } from "../../front/simulateur/secretariat/rubriques-de-la-dap";
import { RUBRIQUES_PMT } from "../../front/simulateur/secretariat/rubriques-du-pmt";
import { RUBRIQUES_S3141 } from "../../front/simulateur/secretariat/rubriques-du-s3141";
import { moteurDeTest } from "./moteur";

const FORMULAIRES: ReadonlyArray<
  [nom: string, rubriques: readonly Rubrique[]]
> = [
  ["PMT S3138g", RUBRIQUES_PMT],
  ["DAP S3139h", RUBRIQUES_DAP],
  ["S3141", RUBRIQUES_S3141],
];

const moteur = moteurDeTest({});

describe.each(FORMULAIRES)("%s", (_nom, rubriques) => {
  it.each(rubriques.map((rubrique) => [rubrique.titre, rubrique] as const))(
    "%s : chaque case a une règle qui la décide",
    (_titre, rubrique) => {
      const introuvables = reglesDe(rubrique).filter((regle) => !existe(regle));
      expect(introuvables).toEqual([]);
    },
  );

  // Deux cases de même identifiant dans un même formulaire, c'est une recopie
  // faite deux fois — ou pire, deux règles qui se disputent la même zone du
  // papier. Les identifiants sont ceux du livrable : c'est sous eux qu'un
  // désaccord lui remonte, et ils doivent le désigner sans ambiguïté.
  it("ne recopie pas deux fois la même case", () => {
    const ids = rubriques.flatMap((rubrique) =>
      rubrique.cases.map((laCase) => laCase.id),
    );
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("nomme chaque rubrique une seule fois", () => {
    const titres = rubriques.map((rubrique) => rubrique.titre);
    expect(titres.length).toBe(new Set(titres).size);
  });
});

// ---- implémentation ----

// Les origines `externe`, `manuel` et `application` (sans règle qui les
// tranche, cf. `case-de-formulaire.ts`) n'ont rien à confronter au moteur : ce
// fichier ne couvre que les cases d'origine `publicodes`, seules à porter une
// `source` évaluable.
function reglesDe(rubrique: Rubrique): string[] {
  return rubrique.cases.flatMap((laCase) =>
    laCase.source ? [laCase.source, ...conditionsDe(laCase)] : [],
  );
}

function conditionsDe(laCase: CaseDeFormulaire): string[] {
  const quand = laCase.quand;
  if (!quand) return [];
  if ("toutes" in quand) return [...quand.toutes];
  if ("une" in quand) return [...quand.une];
  return [quand.regle];
}

// Publicodes jette sur une clé inconnue : c'est la seule façon de savoir qu'une
// règle existe *et* s'évalue, plutôt que de la chercher dans le YAML brut.
function existe(regle: string): boolean {
  try {
    moteur.evaluate(regle);
    return true;
  } catch {
    return false;
  }
}
