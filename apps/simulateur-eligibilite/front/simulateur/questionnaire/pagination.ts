// La pagination du parcours : une étape par page, les adresses d'un seul tenant.
//
// `@publicodes/forms` pagine avec `groupByNamespace`, qui regroupe les règles
// partageant le premier segment d'un nom pointé. Le modèle est plat
// (`p2_depart_adresse`, et non `départ . adresse`) : ce regroupement n'y trouve
// rien à regrouper, et rendait toutes les questions d'un coup. Ce qui les
// séparait en écrans n'était donc pas lui, mais le front d'évaluation du
// moteur — publicodes ne réclame pas ce qui suit sa première condition non
// satisfaite, si bien que les questions arrivaient par paquets, un par étape.
// Un découpage juste, mais que personne n'avait décidé.
//
// C'est `etapes.ts` qui le décide désormais : les questions sont réunies par
// l'étape que le modèle leur donne, et les pages se suivent dans l'ordre déclaré
// là-bas. Le flux voulu reste le même — une question, un écran — partout sauf
// pour les douze saisies d'adresse : une adresse est **une** information, et le
// livrable la veut d'un seul tenant. Un lieu par page, le départ puis l'arrivée.

import type { FormPages } from "@publicodes/forms";
import type { CleDeRegle } from "../contrat-regles-publicodes";
import { etapeDe, rangDe } from "./etapes";

/**
 * Les douze saisies d'adresse (D1-D12), par lieu et dans l'ordre du formulaire
 * papier. C'est l'ordre dans lequel chaque page les présente. Chaque lieu porte
 * aussi la règle par laquelle le modèle dit sa page complète : le complément
 * d'adresse et le pays sont offerts, pas exigés, et c'est elle qui le sait.
 */
const LIEUX: ReadonlyArray<{
  readonly complet: CleDeRegle;
  readonly saisies: readonly CleDeRegle[];
}> = [
  {
    complet: "p2_adresse_depart_obligatoire_complete",
    saisies: [
      "p2_depart_nom_lieu",
      "p2_depart_adresse",
      "p2_depart_complement_adresse",
      "p2_depart_code_postal",
      "p2_depart_commune",
      "p2_depart_pays",
    ],
  },
  {
    complet: "p2_adresse_arrivee_obligatoire_complete",
    saisies: [
      "p2_arrivee_nom_lieu",
      "p2_arrivee_adresse",
      "p2_arrivee_complement_adresse",
      "p2_arrivee_code_postal",
      "p2_arrivee_commune",
      "p2_arrivee_pays",
    ],
  },
];

export function pagesDuParcours(champs: string[]): FormPages<string> {
  return adressesParLieu(pagesParEtape(champs));
}

/**
 * La règle qui dit cette page complète, quand le modèle en porte une. Les deux
 * pages d'adresse sont les seules : ailleurs, une page est complète dès que
 * chacune de ses questions a sa réponse.
 */
export function regleDeComplétude(
  champs: readonly string[],
): CleDeRegle | undefined {
  return lieuxDe(champs)[0]?.complet;
}

// ---- implémentation ----

// Une page par étape, les étapes dans l'ordre déclaré. Les questions arrivent
// ici dans l'ordre où le moteur les réclame — un classement par nombre de
// dépendances, que `etapes.ts` remplace par le nôtre.
//
// Une règle que le modèle ne rattache à aucune étape ferait sa propre page, en
// queue de parcours. `tests/simulateur/etapes.test.ts` interdit ce cas plutôt
// que de le laisser passer en silence : une question sans étape n'a pas de rang,
// donc pas de place.
function pagesParEtape(champs: string[]): FormPages<string> {
  const parEtape = new Map<string, string[]>();
  for (const champ of champs) {
    const etape = etapeDe(champ) ?? champ;
    parEtape.set(etape, [...(parEtape.get(etape) ?? []), champ]);
  }
  return [...parEtape.entries()]
    .sort(([a], [b]) => rangDe(a) - rangDe(b))
    .map(([, elements]) => ({ elements }));
}

// Les douze saisies d'adresse quittent leurs pages pour en former deux, une par
// lieu, **à la place de la première d'entre elles**. C'est le second geste de ce
// module : le premier a réuni les questions par étape, celui-ci réunit les six
// étapes d'un lieu.
//
// Il en décidait une seconde. Jusqu'à la v9.4.0, les deux pages étaient renvoyées
// **en queue** : D1 — le nom du lieu de départ — devenait applicable une question
// plus tôt que ses cinq voisines, et serait partie devant, seule sur un écran.
// La v9.4.1 harmonise D1 avec D2-D6 et fait attendre D7-D12 la complétude de la
// page de départ ; les six saisies d'un lieu arrivent donc ensemble, et il n'y a
// plus d'ordre à corriger. La séquence contractuelle A4.2, A4.3, départ, arrivée,
// A4.6 est vérifiée par `tests/simulateur/adresses-du-trajet.test.tsx`.
function adressesParLieu(pages: FormPages<string>): FormPages<string> {
  const présentes = new Set(pages.flatMap((page) => page.elements));
  const posés = new Set<string>();
  const groupées: FormPages<string> = [];
  for (const page of pages) {
    const autres = page.elements.filter((champ) => !lieuDe(champ));
    if (autres.length > 0) groupées.push({ ...page, elements: autres });
    for (const lieu of lieuxDe(page.elements)) {
      if (posés.has(lieu.complet)) continue;
      posés.add(lieu.complet);
      groupées.push({ elements: lieu.saisies.filter((c) => présentes.has(c)) });
    }
  }
  return groupées;
}

type Lieu = (typeof LIEUX)[number];

function lieuDe(champ: string): Lieu | undefined {
  return LIEUX.find((lieu) => lieu.saisies.includes(champ as CleDeRegle));
}

function lieuxDe(champs: readonly string[]): Lieu[] {
  return LIEUX.filter((lieu) =>
    champs.some((champ) => lieu.saisies.includes(champ as CleDeRegle)),
  );
}
