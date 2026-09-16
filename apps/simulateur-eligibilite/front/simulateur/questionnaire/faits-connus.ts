// Les faits déjà connus d'une mosaïque, et le libellé que prend son option
// « aucun » quand l'un d'eux s'applique — `known_facts` et
// `none_label_when_known_fact` du contrat d'interface (posés en v9.7.1,
// précisés en v9.7.2 : `CONTRAT-RESULTATS-v9-7-2.md` § 4). Le `*.ui.yaml`
// n'est pas chargé : cette table en est la recopie manuelle, sur le modèle de
// `visibilite-des-options.ts`.
//
// Un fait connu ne présélectionne rien et ne masque son option que parce que
// la règle elle-même porte déjà cette condition dans son `applicable si`
// (`p2_convocation_avion_bateau`) : ce module n'ajoute que le texte informatif
// et le changement de libellé, jamais une écriture dans la situation.

import type { CleDeRegle } from "../contrat-regles-publicodes";

type FaitConnu = { condition: CleDeRegle; libelle: string };

type FaitsConnusDeLaMosaique = {
  faits: readonly FaitConnu[];
  libelleAucunSiFaitConnu: string;
};

/** Les faits connus de cette mosaïque, si le contrat en déclare. */
export function faitsConnusDe(
  parentId: string,
): FaitsConnusDeLaMosaique | undefined {
  return TABLE[parentId];
}

// ---- implémentation ----
//
// Indexée par l'identifiant brut de la règle parente de mosaïque (`mosaique.ts`
// le lit hors contrat, sur les règles brutes) : pas par `CleDeRegle`, que
// `p2_convocation_caracteristiques` — une règle inerte, jamais lue par
// `texte()`/`vrai()` — n'a pas de raison de rejoindre.
const TABLE: Record<string, FaitsConnusDeLaMosaique> = {
  p2_convocation_caracteristiques: {
    faits: [
      {
        condition: "p2_exception_avion_bateau",
        libelle:
          "Le transport en avion ou bateau de ligne régulière est déjà déclaré.",
      },
    ],
    libelleAucunSiFaitConnu: "Aucune autre de ces situations",
  },
};
