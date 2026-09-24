// Rend les champs d'une page de parcours : un `ChampDeFormulaire` par question simple,
// une `Mosaique` par groupe de règles booléennes.

import type { Situation } from "publicodes";
import { moteur, texte, vrai } from "../moteur";
import { precisionMedicale } from "../precision-medicale";
import { ChampDeFormulaire } from "./ChampDeFormulaire";
import { faitsConnusDe } from "./faits-connus";
import { lieuArriveeDeduit, lieuDepartDeduit } from "./lieu-deduit";
import { Mosaique } from "./Mosaique";
import type { Mosaique as MosaiqueDesc } from "./mosaique";
import { mosaiqueDe, valeurBool } from "./mosaique";
import type { Champ, Reponses } from "./passation";
import { saisieACorriger } from "./saisie-a-corriger";
import { optionsVisiblesDe } from "./visibilite-des-options";

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

  return (
    <>
      <FaitLieuDeduit champs={champs} situation={situation} />
      {champs.map((champ) =>
        rendreChamp(champ, {
          parId,
          groupesVus,
          situation,
          onReponse,
          onReponses,
        }),
      )}
    </>
  );
}

// ---- implémentation ----

type ContexteDeRendu = {
  parId: Map<string, Champ>;
  groupesVus: Set<string>;
  situation: Situation<string>;
  onReponse: (id: string, valeur: unknown) => void;
  onReponses: (reponses: Reponses) => void;
};

// Une question simple rend son propre `ChampDeFormulaire` ; une option de
// mosaïque ne rend le groupe qu'une fois, à sa première option rencontrée.
function rendreChamp(champ: Champ, ctx: ContexteDeRendu) {
  const { parId, groupesVus, situation, onReponse, onReponses } = ctx;
  const groupe = mosaiqueDe(champ.id);
  if (!groupe)
    return (
      <ChampDeFormulaire
        key={champ.id}
        champ={champLibelleAdapte(champFiltre(champ, situation), situation)}
        onChange={(valeur) => onReponse(champ.id, valeur)}
        erreur={saisieACorriger(champ.id, situation)}
        precision={precisionMedicale(champ.id, situation)}
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
}

// TS973-11 : quand le type de lieu de la page (départ ou arrivée) est déduit
// du parcours plutôt que répondu, `p2_trajet_depart`/`p2_trajet_arrivee`
// devient inapplicable et cette page s'ouvre directement sur l'adresse. Sans
// ce fait, rien ne dirait au prescripteur d'où vient le lieu qu'il complète.
// Repéré par la présence de la saisie d'adresse plutôt que d'un identifiant
// d'étape : `ChampsDePage` ne connaît que ses champs, pas `etapes.ts`.
function FaitLieuDeduit({
  champs,
  situation,
}: {
  champs: readonly Champ[];
  situation: Situation<string>;
}) {
  const surPageDepart = champs.some(
    (champ) => champ.id === "p2_depart_adresse",
  );
  const surPageArrivee = champs.some(
    (champ) => champ.id === "p2_arrivee_adresse",
  );
  if (!surPageDepart && !surPageArrivee) return null;
  const moteurPositionne = moteur.setSituation(situation);
  const fait = surPageDepart
    ? lieuDepartDeduit(moteurPositionne)
    : lieuArriveeDeduit(moteurPositionne);
  if (!fait) return null;
  return (
    <p className="fr-text--bold">
      Lieu {surPageDepart ? "de départ" : "d’arrivée"} : {fait.valeur} (déduit{" "}
      {fait.origine}).
    </p>
  );
}

// Le modèle ne sait pas exclure une option d'une autre, ni en cacher une sous
// condition — les possibilités du modèle sont des chaînes littérales, jamais
// des règles qu'on pourrait rendre non applicables —, donc c'est ici, à
// l'affichage, que deux filtres retirent des options : celles du contrat
// d'interface (`visibilite-des-options.ts`), et « Domicile » à l'arrivée dès que
// le départ l'a déjà pris (la seule combinaison de lieux qu'un trajet ne peut
// jamais faire). `p2_types_lieux_valides` (entrees-calculees.ts) reste le
// garde-fou pour toute entrée qui ne passe pas par cet écran (rejeu d'une
// seed, saisie du secrétariat).
function champFiltre(champ: Champ, situation: Situation<string>): Champ {
  if (!("options" in champ)) return champ;
  const masquees = optionsAMasquer(champ, situation);
  if (masquees.size === 0) return champ;
  return {
    ...champ,
    options: champ.options.filter((option) => !masquees.has(option.value)),
  };
}

// Le contrat d'interface v9.7.1 fait porter à une convocation son propre
// énoncé sur deux questions qu'elle partage avec le reste du parcours
// (`label_when`) : le nombre de transports devient celui que couvre la DAP de
// la convocation, la justification de la distance celle de la convocation elle-
// même. Les autres champs gardent l'énoncé que le modèle porte.
const LIBELLES_SELON_CONVOCATION: Record<string, string> = {
  p2_nombre_transports_prevus:
    "Combien de trajets sont couverts par cette demande d’accord préalable liée à la convocation ?",
  p2_justification_longue_distance:
    "Pourquoi cette convocation nécessite-t-elle un déplacement à plus de 150 km ?",
};

function champLibelleAdapte(champ: Champ, situation: Situation<string>): Champ {
  const precise = precisionMedicale(champ.id, situation)?.libelle;
  if (precise) return { ...champ, label: precise };
  const libelle = LIBELLES_SELON_CONVOCATION[champ.id];
  if (!libelle) return champ;
  if (!vrai(moteur.setSituation(situation), "p2_convocation")) return champ;
  return { ...champ, label: libelle };
}

function optionsAMasquer(
  champ: Champ & { options: unknown[] },
  situation: Situation<string>,
): Set<unknown> {
  const moteurPositionne = moteur.setSituation(situation);
  const masquees = new Set<unknown>();
  if (
    champ.id === "p2_trajet_arrivee" &&
    texte(moteurPositionne, "p2_trajet_depart") === "Domicile"
  )
    masquees.add("Domicile");
  for (const [libelle, regle] of Object.entries(
    optionsVisiblesDe(champ.id) ?? {},
  ))
    if (!vrai(moteurPositionne, regle)) masquees.add(libelle);
  return masquees;
}

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
  const { libelles: faitsConnus, libelleAucun } = faitsConnusEtLibelleAucun(
    groupe.parentId,
    situation,
    aucun?.libelle,
  );
  const aucunProp = aucunPourMosaique(aucun, libelleAucun, situation, parId);

  return (
    <Mosaique
      question={groupe.question}
      information={groupe.information}
      faitsConnus={faitsConnus}
      options={options}
      aucun={aucunProp}
      onToggleOption={(id, coche) =>
        onReponses(apresBasculeOption(options, aucun?.id, id, coche))
      }
      onToggleAucun={(coche) =>
        onReponses(apresBasculeAucun(options, aucun?.id, coche))
      }
    />
  );
}

// L'option « aucun » d'une mosaïque : son libellé (par défaut, ou celui d'un
// fait connu) et son état, lu sur SA règle — pas dérivé des autres options,
// car cette règle peut porter de la logique métier (ex.
// p1_critere_aucune_situation_encadree).
function aucunPourMosaique(
  aucun: MosaiqueDesc["aucun"],
  libelle: string | undefined,
  situation: Situation<string>,
  parId: Map<string, Champ>,
): { libelle: string; coche: boolean } | undefined {
  if (!aucun || !libelle) return undefined;
  return {
    libelle,
    coche: valeurRegle(aucun.id, situation, parId.get(aucun.id)),
  };
}

// Les faits déjà connus de cette mosaïque, et le libellé que prend son option
// « aucun » quand l'un d'eux s'applique (`faits-connus.ts`).
function faitsConnusEtLibelleAucun(
  parentId: string,
  situation: Situation<string>,
  libelleAucunParDefaut: string | undefined,
): { libelles: string[]; libelleAucun: string | undefined } {
  const faits = faitsConnusDe(parentId);
  const moteurPositionne = moteur.setSituation(situation);
  const retenus = (faits?.faits ?? []).filter((fait) =>
    vrai(moteurPositionne, fait.condition),
  );
  return {
    libelles: retenus.map((fait) => fait.libelle),
    libelleAucun:
      retenus.length && faits
        ? faits.libelleAucunSiFaitConnu
        : libelleAucunParDefaut,
  };
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
