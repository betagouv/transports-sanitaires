// Les invariants d'architecture, rendus exécutables.
//
// AGENTS.md et `docs/knowledge/adr/` énoncent des règles. Ce fichier les vérifie.
//
// Chaque règle donne son pourquoi dans son message d'échec, le second argument
// d'`expect`. Un commentaire ne s'affiche pas quand le test rougit.

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

// Ce qui pose les questions : le parcours et le moteur de questionnaire.
const PARCOURS = ["front/socle/simulateur", "front/socle/questionnaire-engine"];

// Ce que le modèle a le droit d'importer du socle, en plus de son point
// d'entrée : le type d'une seed, que le catalogue lit à la source, et le moteur
// de décision, qui amènerait publicodes dans le chunk d'entrée s'il passait par
// le point d'entrée.
const OUVERT_AU_MODELE = [
  "front/socle",
  "front/socle/seeds/seed",
  "front/socle/decision-engine/publicodes",
];

// Le seul fichier par lequel les tests du socle prennent leur modèle, et le
// dossier où ce modèle est écrit.
const MODELE_DE_TEST = "tests/socle/modele-de-test.ts";
const MODELE_FACTICE = "tests/socle/fixtures/modele-factice";

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

describe("le socle et le modèle", () => {
  it("le socle n'importe rien du modèle", () => {
    expect(
      franchissements(["front/socle"], commencePar("front/model")),
      "Le socle ne dépend d'aucune version du modèle : il reçoit le sien en " +
        "prop, depuis `front/Main.tsx`. Un import direct lierait le parcours, " +
        "les seeds ou les developer tools au questionnaire du moment, et " +
        "livrer un nouveau modèle obligerait à toucher au socle.",
    ).toEqual([]);
  });

  it("le modèle n'importe du socle que son point d'entrée", () => {
    expect(
      franchissements(
        ["front/model"],
        (cible) =>
          cible.startsWith("front/socle") && !OUVERT_AU_MODELE.includes(cible),
      ),
      "`front/socle/index.ts` dit ce que le socle promet au modèle. Un import " +
        "plus profond lie le modèle à un détail du socle, qui ne peut plus " +
        "changer sans le casser. S'il manque quelque chose, ajoute-le au " +
        "point d'entrée.",
    ).toEqual([]);
  });
});

describe("les tests et le modèle", () => {
  it("seuls les tests du modèle importent le modèle livré", () => {
    const autres = franchissements(
      ["tests"],
      commencePar("front/model"),
    ).filter((couple) => !couple.startsWith("tests/model/"));
    expect(
      autres,
      "Les tests du socle tournent sur un modèle factice, écrit pour eux : " +
        "ils ne changent pas quand l'éditeur livre une version. Ce qui " +
        "vérifie le modèle livré va dans `tests/model/`.",
    ).toEqual([]);
  });

  it("les tests du socle ne prennent leur modèle que par un seul fichier", () => {
    const autres = franchissements(
      ["tests"],
      commencePar(MODELE_FACTICE),
    ).filter(
      (couple) =>
        !couple.startsWith(`${MODELE_DE_TEST} →`) &&
        !couple.startsWith(`${MODELE_FACTICE}/`),
    );
    expect(
      autres,
      `Les tests du socle prennent tous leur modèle dans \`${MODELE_DE_TEST}\` : ` +
        "changer de modèle de test ne touche alors qu'un fichier.",
    ).toEqual([]);
  });
});

describe("invariants métier", () => {
  it("le simulateur ignore qui prescrit", () => {
    expect(
      franchissements(
        [...PARCOURS, "front/model"],
        commencePar("front/socle/rattachement/"),
      ),
      "Le moteur d'éligibilité raisonne sur une situation médicale, jamais " +
        "sur une identité (docs/knowledge/adr/identification.md). L'analytics, " +
        "lui, est admis : il lit le rattachement en session de son côté, sans " +
        "le faire transiter ici.",
    ).toEqual([]);
  });

  it("les seeds et les developer tools se greffent sur le simulateur, jamais l'inverse", () => {
    expect(
      franchissements(
        PARCOURS,
        (cible) =>
          cible.startsWith("front/socle/developerTools/") ||
          cible.startsWith("front/socle/seeds/"),
      ),
      "L'écran des seeds rejoue des seeds dans la décision du simulateur : les " +
        "seeds et les developer tools sont bâtis **sur** le socle. Le socle, " +
        "lui, n'a pas à les connaître : il reçoit d'`App` du contenu déjà " +
        "composé (`developerToolsPanel`). Fais de même plutôt que d'importer.",
    ).toEqual([]);
  });

  it("seul le moteur de décision importe publicodes", () => {
    const fautifs = sources("front").filter(
      (f) =>
        !f.startsWith("front/socle/decision-engine/") &&
        /^import (?!type ).*from "publicodes";$/m.test(texteDe(f)),
    );
    expect(
      fautifs,
      "publicodes est l'outil du socle pour décider, derrière un seul " +
        "fichier : `front/socle/decision-engine/publicodes.ts`. Le reste du " +
        "socle et le modèle passent par lui. Un autre import lie du code au " +
        "moteur, et rend son remplacement plus cher.",
    ).toEqual([]);
  });

  it("le CERFA n'adresse jamais le backend", () => {
    const fautifs = sources("front/socle/cerfa").filter((f) =>
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
      "Ni identification, ni analytics dans `front/model/rules/*.publicodes` : le moteur " +
        "reste une transcription de la réglementation, rejouable hors de " +
        "l'application.",
    ).toEqual([]);
  });
});

// Biome a les mêmes deux limites, mais il compte des lignes logiques : un bloc
// JSX ou une chaîne multiligne y vaut une seule ligne. Il reste utile dans
// l'éditeur. Ce fichier fait foi, en lignes réelles.
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
    const EXEMPTES = ["front/model/seeds-catalogue.ts"];
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

// Le texte de toutes les règles livrées. Vide quand `front/model/rules/` n'existe pas.
function reglesPubliees(): string {
  const dossier = join(racine, "front", "model", "rules");
  if (!existsSync(dossier)) return "";
  return readdirSync(dossier)
    .filter((fichier) => fichier.endsWith(".publicodes"))
    .map((fichier) => texteDe(`front/model/rules/${fichier}`))
    .join("\n");
}
