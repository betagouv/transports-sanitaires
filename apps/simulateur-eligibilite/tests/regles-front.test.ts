// La couture entre `regles/regles.publicodes` et le TypeScript qui le consomme.
//
// Le modèle de règles est livré de l'extérieur et intégré par recopie
// (`cp tmp/…flat-vX.yaml regles/regles.publicodes`). Une montée de version peut
// renommer une clé, retirer une possibilité ou ajouter un cas final — et le front,
// lui, désigne tout cela par des **chaînes de caractères**. Rien ne relie les deux
// à la compilation : une clé inconnue jette à l'exécution, un cas final non traité
// vide silencieusement la page remise au patient.
//
// D'où ces trois vérifications. Elles ne testent pas un comportement : elles
// tiennent un contrat que le typage ne peut pas exprimer.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, { "une possibilité"?: string[] } | null>;

/** Les valeurs d'une règle `une possibilité`, débarrassées de leurs quotes. */
function possibilites(cle: string): string[] {
  return (regles[cle]?.["une possibilité"] ?? []).map((v) => v.slice(1, -1));
}

/** Tous les fichiers TypeScript des racines données, ce fichier-ci excepté. */
function sources(...dossiers: string[]): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(join(racine, dossier), {
      withFileTypes: true,
    })) {
      const chemin = `${dossier}/${entree.name}`;
      if (entree.isDirectory()) parcourir(chemin);
      else if (/\.tsx?$/.test(entree.name)) trouves.push(chemin);
    }
  };
  for (const dossier of dossiers) parcourir(dossier);
  return trouves.filter((f) => !f.endsWith("regles-front.test.ts"));
}

const lire = (fichier: string) => readFileSync(join(racine, fichier), "utf-8");

describe("clés de règles citées depuis le TypeScript", () => {
  // Les noms du modèle plat : `p1_*` et `p2_*` (les questions des deux parties),
  // `m0_*` (les filtres d'entrée), `cible_*` (les sorties).
  const NOM_DE_REGLE = /["']((?:p1|p2|m0|cible)_[a-z0-9_]+)["']/g;

  it("désignent toutes une règle qui existe", () => {
    // `engine.setSituation` et `evaluate` jettent sur une clé inconnue : sans
    // cette vérification, une règle renommée en amont ne se voit qu'à l'exécution,
    // et seulement sur le parcours qui la traverse.
    const fantomes = sources("front", "tests", "scripts").flatMap((fichier) =>
      [...lire(fichier).matchAll(NOM_DE_REGLE)]
        .map(([, cle]) => cle)
        .filter((cle) => !(cle in regles))
        .map((cle) => `${fichier} :: ${cle}`),
    );
    expect(fantomes).toEqual([]);
  });
});

describe("valeurs comparées aux sorties du moteur", () => {
  // Chaque variable qui porte une sortie du moteur, et la règle dont elle vient.
  // Comparer à l'union de toutes les possibilités ne suffirait pas : `article80.mode`
  // et le transport prescrit ont des valeurs qui ne diffèrent que d'un « s »
  // (« transports en commun »), et les confondre passerait inaperçu.
  const SORTIES: ReadonlyArray<[nom: string, regle: string]> = [
    ["casFinal", "cible_cas_final"],
    ["transport", "cible_transport_sanitaire_prescrit"],
    ["doc", "cible_document_a_remettre_au_patient"],
    ["resultatMedical", "cible_resultat_medical"],
    ["article80.mode", "cible_article_80_mode"],
  ];

  it.each(SORTIES)("%s ne se compare qu'à des valeurs de %s", (nom, regle) => {
    // Le modèle laisse une sortie vide plutôt que d'inventer une valeur : le front
    // teste donc aussi la chaîne vide, qui n'est pas une possibilité déclarée.
    const admises = new Set([...possibilites(regle), ""]);
    const motif = new RegExp(
      `\\b${nom.replace(".", "\\.")}\\s*===\\s*"([^"]+)"`,
      "g",
    );

    const inconnues = sources("front").flatMap((fichier) =>
      [...lire(fichier).matchAll(motif)]
        .map(([, valeur]) => valeur)
        .filter((valeur) => !admises.has(valeur))
        .map((valeur) => `${fichier} :: ${valeur}`),
    );
    expect(inconnues).toEqual([]);
  });
});

describe("exhaustivité de la Page Résultat 2", () => {
  // Les trois blocs prétendent traiter *tous* les cas finaux : le premier leur
  // donne une teinte et un titre, le deuxième ce qui reste à la charge du
  // patient, le troisième l'intitulé du cas retenu. Un cas absent n'y provoque
  // aucune erreur — il retombe sur un défaut muet, et le patient reçoit un
  // document amputé. `cerfa/depuis-simulateur.ts` en est exclu à dessein : il ne
  // traite que la prescription médicale de transport.
  const BLOCS = [
    "front/simulateur/secretariat/Bloc1Resultat.tsx",
    "front/simulateur/secretariat/Bloc2Etapes.tsx",
    "front/simulateur/secretariat/Bloc3CasRetenu.tsx",
  ];

  it.each(BLOCS)("%s traite chaque cas final", (bloc) => {
    const source = lire(bloc);
    const absents = possibilites("cible_cas_final").filter(
      (cas) => !source.includes(cas),
    );
    expect(absents).toEqual([]);
  });
});
