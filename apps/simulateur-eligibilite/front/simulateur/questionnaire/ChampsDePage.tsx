// Rend les champs d'une page de parcours : un `ChampDeFormulaire` par question simple,
// une `Mosaique` par groupe de règles booléennes.

import type { Situation } from "publicodes";
import { moteur } from "../moteur";
import { ChampDeFormulaire } from "./ChampDeFormulaire";
import { Mosaique } from "./Mosaique";
import type { Mosaique as MosaiqueDesc } from "./mosaique";
import { mosaiqueDe, valeurBool } from "./mosaique";
import type { Champ, Reponses } from "./passation";

type Props = {
  champs: readonly Champ[];
  situation: Situation<string>;
  onReponse: (id: string, valeur: unknown) => void;
  onReponses: (reponses: Reponses) => void;
};

export function ChampsDePage({
  champs,
  situation,
  onReponse,
  onReponses,
}: Props) {
  const parId = new Map(champs.map((champ) => [champ.id, champ] as const));
  const groupesVus = new Set<string>();

  return champs.map((champ) => {
    const groupe = mosaiqueDe(champ.id);
    if (!groupe)
      return (
        <ChampDeFormulaire
          key={champ.id}
          champ={champ}
          onChange={(valeur) => onReponse(champ.id, valeur)}
        />
      );
    if (groupesVus.has(groupe.parentId)) return null;
    groupesVus.add(groupe.parentId);
    return (
      <GroupeMosaique
        key={groupe.parentId}
        groupe={groupe}
        parId={parId}
        situation={situation}
        onReponses={onReponses}
      />
    );
  });
}

// ---- implémentation ----

type GroupeProps = {
  groupe: MosaiqueDesc;
  parId: Map<string, Champ>;
  situation: Situation<string>;
  onReponses: (reponses: Reponses) => void;
};

function GroupeMosaique({ groupe, parId, situation, onReponses }: GroupeProps) {
  const options = groupe.optionIds
    .map((id) => parId.get(id))
    .filter((champ): champ is Champ => Boolean(champ));
  const aucun = groupe.aucun;
  // État de « aucun » lu sur SA règle (champ de page si présent, sinon
  // évaluation) — pas dérivé des autres options, car cette règle peut porter
  // de la logique métier (ex. p1_critere_aucune_situation_encadree).
  const aucunCoche = aucun
    ? valeurRegle(aucun.id, situation, parId.get(aucun.id))
    : false;

  return (
    <Mosaique
      question={groupe.question}
      options={options}
      aucun={aucun ? { libelle: aucun.libelle, coche: aucunCoche } : undefined}
      onToggleOption={(id, coche) =>
        onReponses(apresBasculeOption(options, aucun?.id, id, coche))
      }
      onToggleAucun={(coche) =>
        onReponses(apresBasculeAucun(options, aucun?.id, coche))
      }
    />
  );
}

// Bascule d'une option : la règle touchée prend la nouvelle valeur, les autres
// options du groupe sont figées à leur valeur courante, et « aucun » est
// décoché — cocher une option l'exclut.
function apresBasculeOption(
  options: readonly Champ[],
  aucunId: string | undefined,
  id: string,
  coche: boolean,
): Reponses {
  const reponses = options.map((option): [string, boolean | undefined] =>
    option.id === id
      ? [option.id, coche]
      : [option.id, valeurBool(option) === true],
  );
  return aucunId ? [...reponses, [aucunId, false]] : reponses;
}

// Bascule de « aucun » : toutes les options passent à `false`, et la règle
// « aucun » prend la nouvelle valeur.
function apresBasculeAucun(
  options: readonly Champ[],
  aucunId: string | undefined,
  coche: boolean,
): Reponses {
  const reponses = options.map((option): [string, boolean | undefined] => [
    option.id,
    false,
  ]);
  return aucunId ? [...reponses, [aucunId, coche]] : reponses;
}

// Valeur booléenne courante d'une règle : depuis son champ de page s'il est
// présent, sinon par évaluation (cas d'une règle « aucun » inerte, hors page).
function valeurRegle(
  id: string,
  situation: Situation<string>,
  champ?: Champ,
): boolean {
  if (champ) return valeurBool(champ) === true;
  return moteur.setSituation(situation).evaluate(id).nodeValue === true;
}
