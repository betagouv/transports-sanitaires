// Les invariants d'architecture, rendus exécutables.
//
// AGENTS.md et `docs/knowledge/adr/` énoncent des règles que rien ne vérifiait :
// « les secrets restent au serveur », « le CERFA n'atteint jamais le backend »,
// « l'identification reste hors du moteur d'éligibilité ». Une prose ne bloque
// personne — ce fichier, si.
//
// Chaque règle porte son *pourquoi* dans son message d'échec : qui la casse doit
// apprendre ici ce qu'elle protège, sans avoir à relire la documentation. C'est
// le second argument d'`expect`, pas un commentaire — un commentaire ne s'affiche
// pas quand le test rougit.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fonctionsDe,
  franchissements,
  lignesDe,
  racine,
  sources,
  texteDe,
} from "./inspection-des-sources";

const commencePar = (prefixe: string) => (cible: string) =>
  cible.startsWith(prefixe);

describe("frontières de runtime", () => {
  it("le front n'importe rien du serveur", () => {
    expect(
      franchissements(["front"], commencePar("server/")),
      "Le serveur détient la clé Grist. Un seul import suffirait à la " +
        "faire entrer dans le bundle servi au navigateur. Passe par une " +
        "route `/api`.",
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
      franchissements(["front/simulateur"], commencePar("front/rattachement/")),
      "Le moteur d'éligibilité raisonne sur une situation médicale, jamais " +
        "sur une identité (docs/knowledge/adr/identification.md). L'analytics, " +
        "lui, est admis : il lit le rattachement en session de son côté, sans " +
        "le faire transiter ici.",
    ).toEqual([]);
  });

  it("les outils produit se greffent sur le simulateur, jamais l'inverse", () => {
    expect(
      franchissements(
        ["front/simulateur"],
        commencePar("front/outils-produit/"),
      ),
      "La galerie rejoue des seeds dans la décision du simulateur : les " +
        "outils produit sont bâtis **sur** le socle. Le socle, lui, n'a pas à " +
        "les connaître : il reçoit d'`App` du contenu déjà composé " +
        "(`panneauOutilsProduit`). Fais de même plutôt que d'importer.",
    ).toEqual([]);
  });

  it("le CERFA n'adresse jamais le backend", () => {
    const fautifs = sources("front/cerfa").filter((f) =>
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
    const regles = reglesPubliees().toLowerCase();
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
      "Ni identification, ni analytics dans `regles/*.publicodes` : le moteur " +
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

describe("chaîne d'outillage", () => {
  it("pnpm lance les scripts pre et post", () => {
    const workspace = readFileSync(
      join(racine, "..", "..", "pnpm-workspace.yaml"),
      "utf-8",
    );
    expect(
      /^enablePrePostScripts:\s*true\s*$/m.test(workspace),
      "npm lance `prebuild` et `postbuild` autour de `build` ; pnpm ne le " +
        "fait que si `enablePrePostScripts` est vrai dans le " +
        "`pnpm-workspace.yaml` de la racine. Sans lui, `prebuild` " +
        "(régénération des icônes DSFR) et `postbuild` " +
        "(`scripts/verifier-bundle.ts`) disparaissent **sans rien dire** : le " +
        "`verifier` reste vert en ayant sauté une porte, et le bundle part en " +
        "production sans avoir été vérifié.",
    ).toBe(true);
  });
});

// Le texte de toutes les règles livrées. Vide tant que `regles/` l'est : la
// garde attend le modèle suivant, elle ne disparaît pas avec le précédent.
function reglesPubliees(): string {
  const dossier = join(racine, "regles");
  if (!existsSync(dossier)) return "";
  return readdirSync(dossier)
    .filter((fichier) => fichier.endsWith(".publicodes"))
    .map((fichier) => texteDe(`regles/${fichier}`))
    .join("\n");
}
