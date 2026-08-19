// Les invariants d'architecture, rendus exécutables.
//
// AGENTS.md et `docs/architecture/` énoncent des règles que rien ne vérifiait :
// « les secrets restent au serveur », « le CERFA n'atteint jamais le backend »,
// « l'identification reste hors du moteur d'éligibilité ». Une prose ne bloque
// personne — ce fichier, si.
//
// Chaque règle porte son *pourquoi* dans son message d'échec : qui la casse doit
// apprendre ici ce qu'elle protège, sans avoir à relire la documentation. C'est
// le second argument d'`expect`, pas un commentaire — un commentaire ne s'affiche
// pas quand le test rougit.

import { describe, expect, it } from "vitest";
import {
  fonctionsDe,
  franchissements,
  lignesDe,
  sources,
  texteDe,
} from "./inspection-des-sources";

const commencePar = (prefixe: string) => (cible: string) =>
  cible.startsWith(prefixe);

describe("frontières de runtime", () => {
  it("le front n'importe rien du serveur", () => {
    expect(
      franchissements(["front"], commencePar("server/")),
      "Le serveur détient la clé Grist et le secret de pseudonymisation. Un " +
        "seul import suffirait à les faire entrer dans le bundle servi au " +
        "navigateur. Passe par une route `/api`.",
    ).toEqual([]);
  });

  it("le serveur n'importe rien du front", () => {
    expect(
      franchissements(["server"], commencePar("front/")),
      "Le backend tourne sous Node sans DOM : importer du front y ferait " +
        "entrer du JSX et des API navigateur qui n'existent pas à " +
        "l'exécution. Ce qui doit être partagé va dans `shared/`.",
    ).toEqual([]);
  });

  it("le contrat partagé ne dépend d'aucune des deux racines", () => {
    expect(
      franchissements(
        ["shared"],
        (cible) => cible.startsWith("front/") || cible.startsWith("server/"),
      ),
      "`shared/` est chargé des deux côtés : il ne peut dépendre que de " +
        "lui-même. Ce qui a besoin du front ou du serveur n'est pas du contrat.",
    ).toEqual([]);
  });
});

describe("invariants métier", () => {
  it("le simulateur ignore qui prescrit", () => {
    expect(
      franchissements(
        ["front/simulateur"],
        commencePar("front/identification/"),
      ),
      "Le moteur d'éligibilité raisonne sur une situation médicale, jamais " +
        "sur une identité (docs/architecture/identification.md). L'analytics, " +
        "lui, est admis : il lit l'identité en session de son côté, sans la " +
        "faire transiter ici.",
    ).toEqual([]);
  });

  it("les outils produit se greffent sur le simulateur, jamais l'inverse", () => {
    // Une exception, assumée : `moteur.ts` consulte `labo/labo.ts` pour savoir
    // s'il doit charger des règles de test. Choisir quelles règles charger est
    // une affaire de moteur, et l'inverser demanderait de le sortir de son
    // singleton de module. Elle est nommée ici, donc elle ne peut pas s'étendre
    // en silence.
    const EXCEPTION =
      "front/simulateur/moteur.ts → front/outils-produit/labo/labo";
    expect(
      franchissements(
        ["front/simulateur"],
        commencePar("front/outils-produit/"),
      ),
      "La galerie rejoue des seeds dans le moteur, le labo remplace ses " +
        "règles, le CERFA lit une situation : les outils produit sont bâtis " +
        "**sur** le socle. Le socle, lui, n'a pas à les connaître — il reçoit " +
        "d'`App` du contenu déjà composé (`panneauOutilsProduit`, " +
        "`documentTelechargeable`). Fais de même plutôt que d'importer.",
    ).toEqual([EXCEPTION]);
  });

  it("le CERFA n'adresse jamais le backend", () => {
    const fautifs = sources("front/outils-produit/beta/cerfa").filter((f) =>
      texteDe(f).includes("/api"),
    );
    expect(
      fautifs,
      "Le prescripteur y complète des données de santé nominatives : elles ne " +
        "doivent pas quitter le navigateur. Le module ne charge qu'un gabarit " +
        "vierge, servi comme un asset — aucune route `/api` ne doit y apparaître.",
    ).toEqual([]);
  });

  it("les règles publicodes ne portent que de l'éligibilité", () => {
    const regles = texteDe("regles/regles.publicodes").toLowerCase();
    const interdits = [
      "prescripteur . nom",
      "prescripteur . prenom",
      "etablissement . id",
      "matomo",
      "analytics",
      "pseudonym",
    ].filter((terme) => regles.includes(terme));
    expect(
      interdits,
      "Ni identification, ni analytics dans `regles.publicodes` : le moteur " +
        "reste une transcription de la réglementation, rejouable hors de " +
        "l'application.",
    ).toEqual([]);
  });
});

// Biome porte les mêmes deux limites (`noExcessiveLinesPerFunction`,
// `noExcessiveLinesPerFile`), mais il compte des lignes **logiques** : un bloc
// de texte JSX ou une chaîne multiligne y vaut une seule ligne. Un composant de
// 450 lignes réelles n'en pèse que 178 pour lui. Biome reste utile — il signale
// dans l'éditeur, et tout ce qu'il refuse échoue aussi ici — mais c'est ce
// fichier qui fait foi, en lignes réelles.
describe("taille du code", () => {
  it("aucune fonction ne dépasse 30 lignes", () => {
    const trop = sources("front", "server", "shared", "scripts").flatMap(
      (fichier) =>
        fonctionsDe(fichier)
          .filter(({ lignes }) => lignes > 30)
          .map(({ ligne, lignes }) => `${fichier}:${ligne} (${lignes} lignes)`),
    );
    expect(
      trop,
      "Une fonction qu'on ne voit pas d'un écran fait plusieurs choses. La " +
        "limite *détecte* le problème, elle ne dit pas où couper : cherche la " +
        "jointure de sens (le plus souvent, un branchement sur des cas " +
        "métier), pas le fragment le moins cher à sortir. Les fichiers de " +
        "test sont exemptés : un bloc de cas n'est pas un traitement.",
    ).toEqual([]);
  });

  it("aucun fichier ne dépasse 300 lignes", () => {
    const EXEMPTES = ["front/outils-produit/seeds/catalogue.ts"];
    const trop = sources("front", "server", "shared", "scripts", "tests")
      .filter((fichier) => !EXEMPTES.includes(fichier))
      .map((fichier) => ({ fichier, lignes: lignesDe(fichier) }))
      .filter(({ lignes }) => lignes > 300)
      .map(({ fichier, lignes }) => `${fichier} (${lignes} lignes)`);
    expect(
      trop,
      "Passé cette taille, un fichier porte plusieurs intentions : sépare-le " +
        "par sujet, jamais en déplaçant le débordement ailleurs. Seule " +
        "exception : le catalogue de seeds, qui est une liste de données et " +
        "vaut d'être lu d'un seul tenant.",
    ).toEqual([]);
  });
});
