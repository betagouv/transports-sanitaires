// Les invariants d'architecture, rendus exécutables.
//
// AGENTS.md et `docs/architecture/` énoncent des règles que rien ne vérifiait :
// « les secrets restent au serveur », « le CERFA n'atteint jamais le backend »,
// « l'identification reste hors du moteur d'éligibilité ». Une prose ne bloque
// personne — ce fichier, si.
//
// Chaque règle porte son *pourquoi* dans son message d'échec : qui la casse doit
// apprendre ici ce qu'elle protège, sans avoir à relire la documentation.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Tous les fichiers TypeScript d'un dossier, en chemins relatifs à la racine. */
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
  return trouves;
}

const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

/**
 * Les modules importés par un fichier, résolus en chemins relatifs à la racine
 * (les paquets npm sont ignorés : seules les frontières internes nous occupent).
 */
function importsDe(fichier: string): string[] {
  const source = readFileSync(join(racine, fichier), "utf-8");
  const cibles: string[] = [];
  for (const correspondance of source.matchAll(IMPORT)) {
    const specificateur = correspondance[1];
    if (!specificateur?.startsWith(".")) continue;
    cibles.push(
      relative(racine, resolve(dirname(join(racine, fichier)), specificateur)),
    );
  }
  return cibles;
}

/** Les couples (fichier, import) qui franchissent une frontière interdite. */
function franchissements(
  depuis: string[],
  vers: (cible: string) => boolean,
): string[] {
  return sources(...depuis).flatMap((fichier) =>
    importsDe(fichier)
      .filter(vers)
      .map((cible) => `${fichier} → ${cible}`),
  );
}

const commencePar = (prefixe: string) => (cible: string) =>
  cible.startsWith(prefixe);

describe("frontières de runtime", () => {
  it("le front n'importe rien du serveur", () => {
    // Le serveur détient la clé Grist et le secret de pseudonymisation. Un seul
    // import suffirait à les faire entrer dans le bundle servi au navigateur.
    expect(franchissements(["front"], commencePar("server/"))).toEqual([]);
  });

  it("le serveur n'importe rien du front", () => {
    // Le backend tourne sous Node sans DOM : importer du front y ferait entrer du
    // JSX et des API navigateur qui n'existent pas à l'exécution.
    expect(franchissements(["server"], commencePar("front/"))).toEqual([]);
  });

  it("le contrat partagé ne dépend d'aucune des deux racines", () => {
    // `shared/` est chargé des deux côtés : il ne peut dépendre que de lui-même.
    expect(
      franchissements(
        ["shared"],
        (cible) => cible.startsWith("front/") || cible.startsWith("server/"),
      ),
    ).toEqual([]);
  });
});

describe("invariants métier", () => {
  it("le simulateur ignore qui prescrit", () => {
    // Le moteur d'éligibilité raisonne sur une situation médicale, jamais sur une
    // identité (docs/architecture/identification.md). L'analytics, lui, est admis :
    // il lit l'identité en session de son côté, sans la faire transiter ici.
    expect(
      franchissements(
        ["front/simulateur"],
        commencePar("front/identification/"),
      ),
    ).toEqual([]);
  });

  it("les outils produit se greffent sur le simulateur, jamais l'inverse", () => {
    // La galerie rejoue des seeds dans le moteur, le labo remplace ses règles, le
    // CERFA lit une situation : les outils produit sont bâtis **sur** le socle. Le
    // socle, lui, n'a pas à les connaître — il reçoit d'`App` du contenu déjà
    // composé (`panneauOutilsProduit`, `documentTelechargeable`).
    //
    // Une exception, assumée : `moteur.ts` consulte `labo/labo.ts` pour savoir
    // s'il doit charger des règles de test. Choisir quelles règles charger est une
    // affaire de moteur, et l'inverser demanderait de le sortir de son singleton
    // de module. Elle est nommée ici, donc elle ne peut pas s'étendre en silence.
    const EXCEPTION =
      "front/simulateur/moteur.ts → front/outils-produit/labo/labo";
    expect(
      franchissements(
        ["front/simulateur"],
        commencePar("front/outils-produit/"),
      ),
    ).toEqual([EXCEPTION]);
  });

  it("le CERFA n'adresse jamais le backend", () => {
    // Le prescripteur y complète des données de santé nominatives : elles ne
    // doivent pas quitter le navigateur. Le module ne charge qu'un gabarit vierge,
    // servi comme un asset — aucune route `/api` ne doit apparaître ici.
    const fautifs = sources("front/outils-produit/beta/cerfa").filter((f) =>
      readFileSync(join(racine, f), "utf-8").includes("/api"),
    );
    expect(fautifs).toEqual([]);
  });

  it("les règles publicodes ne portent que de l'éligibilité", () => {
    // Ni identification, ni analytics dans `regles.publicodes` : le moteur reste
    // une transcription de la réglementation, rejouable hors de l'application.
    const regles = readFileSync(
      join(racine, "regles/regles.publicodes"),
      "utf-8",
    );
    const interdits = [
      "prescripteur . nom",
      "prescripteur . prenom",
      "etablissement . id",
      "matomo",
      "analytics",
      "pseudonym",
    ].filter((terme) => regles.toLowerCase().includes(terme));
    expect(interdits).toEqual([]);
  });
});
