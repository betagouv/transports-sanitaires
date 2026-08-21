// La pagination du parcours : une question par page, sauf les adresses.
//
// `@publicodes/forms` pagine avec `groupByNamespace`, qui regroupe les règles
// partageant le premier segment d'un nom pointé. Le modèle est plat
// (`p2_depart_adresse`, et non `départ . adresse`) : chaque question fait donc sa
// propre page. C'est le flux voulu — une question, un écran — partout sauf pour
// les douze saisies d'adresse : une adresse est **une** information, et le
// livrable la veut d'un seul tenant. Un lieu par page, le départ puis l'arrivée.

import type { FormPages } from "@publicodes/forms";
import { groupByNamespace } from "@publicodes/forms";
import type { CleDeRegle } from "../contrat-regles-publicodes";

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
  return adressesParLieu(groupByNamespace(champs));
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

// Les douze saisies d'adresse quittent leurs pages pour en former deux, une par
// lieu, **à la place de la première d'entre elles**. Le reste du parcours garde
// la pagination de la bibliothèque, et l'ordre reste celui du modèle : le
// regroupement est la seule chose que ce module décide.
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
