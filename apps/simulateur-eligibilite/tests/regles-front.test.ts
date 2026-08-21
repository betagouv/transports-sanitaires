// La couture entre `regles/regles.publicodes` et le TypeScript qui le consomme.
//
// Le modèle de règles est livré de l'extérieur et intégré par recopie
// (`cp tmp/…flat-vX.yaml regles/regles.publicodes`). Une montée de version peut
// renommer une clé, retirer une possibilité ou ajouter un cas final — et le front,
// lui, désigne tout cela par des **chaînes de caractères**. Rien ne relie les deux
// à la compilation : une clé inconnue jette à l'exécution, un cas final non traité
// vide silencieusement la page remise au patient.
//
// Le pivot est `front/simulateur/contrat-regles-publicodes.ts` : il déclare les
// noms que le code a le droit d'employer, et TypeScript refuse tout le reste. Ce
// fichier vérifie l'autre moitié — que ces noms existent bel et bien dans le
// modèle. Le contrat sans le test laisserait déclarer une clé fantôme ; le test
// sans le contrat n'aurait rien de sûr à inspecter, faute de savoir ce que le code
// emploie autrement qu'en balayant du texte.
//
// Restent deux vérifications que le typage n'atteint pas encore : les *valeurs*
// comparées aux sorties du moteur, et l'exhaustivité des blocs de résultat. Ce sont
// des chaînes libres dans les deux cas, d'où le balayage — le contrat, lui, ne
// porte que les noms de règles.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import {
  CIBLES,
  QUESTIONS,
  REGLES_LUES,
} from "../front/simulateur/contrat-regles-publicodes.ts";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, { "une possibilité"?: string[]; question?: string } | null>;

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

describe("contrat de règles", () => {
  // `front/simulateur/contrat-regles-publicodes.ts` déclare les noms que le code a
  // le droit d'employer, et TypeScript refuse tout le reste — dans une situation,
  // dans un tableau de cibles, dans un appel à `texte()`/`vrai()`. Reste à vérifier
  // l'autre moitié : que ces noms existent bel et bien dans le modèle. Les deux
  // ensemble ferment la boucle, sans qu'aucune ne dépende d'un balayage de texte.
  it.each([
    ["cible", CIBLES],
    ["question", QUESTIONS],
    ["règle lue", REGLES_LUES],
  ])("chaque %s du contrat existe dans les règles", (_genre, noms) => {
    expect(noms.filter((nom) => !(nom in regles))).toEqual([]);
  });

  it("ne déclare aucun nom en double", () => {
    // Un doublon passerait inaperçu — le type dérivé est une union, elle absorbe
    // la répétition — mais signale une liste éditée à deux mains.
    const noms = [...CIBLES, ...QUESTIONS, ...REGLES_LUES];
    expect(noms.length).toBe(new Set(noms).size);
  });

  it("range les cibles et les questions du bon côté", () => {
    expect(CIBLES.filter((c) => !c.startsWith("cible_"))).toEqual([]);
    expect(QUESTIONS.filter((q) => q.startsWith("cible_"))).toEqual([]);
    expect(REGLES_LUES.filter((r) => r.startsWith("cible_"))).toEqual([]);
  });

  it("ne déclare en règle lue que des règles sans question", () => {
    // Une règle que le modèle pose à l'utilisateur est une question : la ranger
    // ici la rendrait non renseignable, et le parcours se bloquerait dessus.
    expect(
      REGLES_LUES.filter((r) => regles[r]?.question !== undefined),
    ).toEqual([]);
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
        .map((correspondance) => correspondance[1])
        .filter((valeur) => valeur !== undefined)
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
