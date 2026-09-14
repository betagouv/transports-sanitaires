// La pagination du parcours : une page par étape, dans l'ordre des étapes.
//
// Ce module ne décide plus rien — il applique ce que `etapes.ts` déclare. Il a
// longtemps décidé, faute de mieux : `@publicodes/forms` pagine avec
// `groupByNamespace`, qui regroupe les règles partageant le premier segment d'un
// nom pointé, et le modèle est plat (`p2_depart_adresse`, et non
// `départ . adresse`). Ce regroupement n'y trouvait donc rien à regrouper et
// rendait toutes les questions d'un coup ; ce qui les séparait en écrans était le
// front d'évaluation du moteur, qui ne réclame pas ce qui suit sa première
// condition non satisfaite. Les questions arrivaient par paquets — un par étape,
// par chance plus que par conception.
//
// Depuis la v9.7, le contrat d'interface nomme ses étapes et dit lesquelles vont
// ensemble. Les deux pages d'adresse en sont : une adresse est **une**
// information, et le livrable la veut d'un seul tenant, `page_adresse_depart`
// puis `page_adresse_arrivee`.

import type { FormPages } from "@publicodes/forms";
import type { CleDeRegle } from "../contrat-regles-publicodes";
import { etapeDe, rangDe } from "./etapes";

export function pagesDuParcours(champs: string[]): FormPages<string> {
  return [...parEtape(champs).entries()]
    .sort(([a], [b]) => rangDe(a) - rangDe(b))
    .map(([, elements]) => ({ elements }));
}

/**
 * La règle qui dit cette page complète, quand l'étape en porte une. Les
 * mosaïques et les deux pages d'adresse sont les seules : ailleurs, une page est
 * complète dès que chacune de ses questions a sa réponse.
 *
 * Cette distinction était naguère une liste de saisies facultatives tenue dans
 * `Secretariat.tsx` : l'application décidait de son côté que le complément
 * d'adresse et le pays n'étaient pas exigés. Le modèle le dit désormais lui-même,
 * et le contrat d'interface attache la règle à l'étape.
 */
export function regleDeComplétude(
  champs: readonly string[],
): CleDeRegle | undefined {
  const premier = champs[0];
  return premier === undefined ? undefined : etapeDe(premier)?.complet;
}

// ---- implémentation ----

// Les questions arrivent ici dans l'ordre où le moteur les réclame, qui n'est pas
// le nôtre : elles sont donc réunies par étape, et chaque page rend ses champs
// dans l'ordre où l'étape les présente — celui du formulaire papier, pour une
// adresse.
//
// Une règle qu'aucune étape ne porte ferait sa propre page, en queue de parcours.
// `tests/simulateur/etapes.test.ts` interdit ce cas plutôt que de le laisser
// passer en silence : une question hors étape n'a pas de rang, donc pas de place.
//
// Une étape qui porte une règle de complétude — mosaïque ou adresse — se pose en
// entier, et pas seulement ce qui manque : après un retour en arrière, une adresse
// déjà saisie ne manque plus, et la page ne rendait que le complément et le pays,
// sans moyen de revoir le reste.
function parEtape(champs: string[]): Map<string, string[]> {
  const attendus = new Set(champs);
  const pages = new Map<string, string[]>();
  for (const champ of champs) {
    const etape = etapeDe(champ);
    if (etape === undefined) {
      pages.set(champ, [champ]);
      continue;
    }
    pages.set(
      etape.id,
      etape.complet
        ? [...etape.champs]
        : etape.champs.filter((declare) => attendus.has(declare)),
    );
  }
  return pages;
}
