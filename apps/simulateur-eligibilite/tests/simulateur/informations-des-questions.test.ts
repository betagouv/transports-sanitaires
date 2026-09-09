// La phrase indicative d'une question — sa `description` dans le modèle — telle
// que l'utilisateur la lit : sous l'énoncé, dans la même légende, avant les
// réponses.
//
// Elle est portée par le modèle et rendue par l'interface ; rien ne la recopie.
// Longtemps, les cinq mosaïques la perdaient en route : `Mosaique.tsx` bâtissait
// sa légende à partir de la seule `question` de la règle parente, et « Sélectionnez
// toutes les réponses correspondant à la situation du patient » n'atteignait
// jamais l'écran. Ce fichier fermait la porte, treize questions à la fois.
//
// **La v9.7 n'en porte plus aucune.** Les treize `description` que la v9.5.1
// attachait à ses questions ont disparu du livrable, sans que le journal des
// évolutions le mentionne. Il n'y a donc plus de phrase indicative à vérifier à
// l'écran, et les cas de ce fichier n'auraient plus de texte à chercher.
//
// Ce qui reste, et qui vaut d'être gardé : le jour où le modèle en réintroduit
// une, personne ne s'apercevrait qu'elle n'atteint pas l'écran. Ce fichier
// constate donc l'absence, et redeviendra rouge à la première `description`
// recouvrée — avec, dans son message, ce qu'il faut alors réécrire.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { expect, it } from "vitest";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, { question?: string; description?: string } | null>;

// Les entrées que l'application calcule portent toutes la même note technique en
// `description`. Ce ne sont pas des questions — le modèle ne leur donne pas
// d'énoncé —, et elles n'atteignent aucun écran.
const NOTE_TECHNIQUE = "Donnée technique calculée par le module de référence";

it("aucune question du modèle ne porte de phrase indicative", () => {
  const avecPhrase = Object.entries(regles)
    .filter(([, corps]) => corps?.question !== undefined)
    .filter(([, corps]) => corps?.description !== undefined)
    .filter(([, corps]) => !corps?.description?.startsWith(NOTE_TECHNIQUE))
    .map(([nom]) => nom);

  expect(
    avecPhrase,
    "Le modèle a retrouvé des phrases indicatives, que la v9.7 avait toutes " +
      "retirées. Rien ne garantit qu'elles atteignent l'écran : rétablis ici " +
      "les cas qui les traquaient — l'historique de ce fichier en porte la " +
      "forme, un cas par question, vérifiant que la phrase s'affiche en " +
      "`fr-hint-text` dans la légende du groupe ou l'étiquette de la saisie.",
  ).toEqual([]);
});
