// Le parcours factice : trois questions sans rapport avec le transport
// sanitaire, le temps que le modèle d'éligibilité suivant soit intégré.
//
// Il ne décide rien. Il tient en vie ce que le parcours réel reprendra tel
// quel : l'avancement automatique, le retour en arrière, le brouillon d'une
// page, l'invalidation des réponses dépendantes et le verrou.

import type { Page, Reponses } from "./questionnaire/question";

/** Ce qu'une décision rend : des sorties nommées, à afficher et à comparer. */
export type Sorties = Readonly<Record<string, string>>;

export const NOMBRE_DE_PARTIES = 2;

/** Modifiables tant que le résultat n'est pas verrouillé. */
export const PAGES_AVANT_VERROU: readonly Page[] = [
  {
    id: "boisson",
    partie: 1,
    questions: [
      {
        id: "boisson",
        forme: "choix unique",
        libelle: "Quelle boisson souhaitez-vous ?",
        options: [
          { valeur: "the", libelle: "Un thé" },
          { valeur: "cafe", libelle: "Un café" },
          { valeur: "rien", libelle: "Rien" },
        ],
      },
    ],
  },
  {
    id: "accompagnements",
    partie: 1,
    questions: [
      {
        id: "accompagnements",
        forme: "choix multiple",
        libelle: "Avec quoi ?",
        poseeSi: (reponses) =>
          reponses.boisson !== undefined && reponses.boisson !== "rien",
        dependDe: ["boisson"],
        options: [
          { valeur: "lait", libelle: "Du lait" },
          { valeur: "sucre", libelle: "Du sucre" },
        ],
        aucun: { valeur: "aucun", libelle: "Rien de plus" },
      },
    ],
  },
];

/** Posées après le verrou : elles complètent, elles ne décident plus. */
export const PAGES_APRES_VERROU: readonly Page[] = [
  {
    id: "quantite",
    partie: 2,
    questions: [
      {
        id: "quantite",
        forme: "nombre",
        libelle: "Combien de tasses ?",
        min: 1,
        unite: "tasses",
      },
    ],
  },
];

/** La décision factice : la commande, lue dans les réponses. */
export function decider(reponses: Reponses): Sorties {
  const boisson = LIBELLES[String(reponses.boisson)];
  if (!boisson || reponses.boisson === "rien") return { commande: "aucune" };
  const avec = accompagnementsDe(reponses);
  return {
    commande: avec.length > 0 ? `${boisson}, ${avec.join(" et ")}` : boisson,
  };
}

// ---- implémentation ----

const LIBELLES: Record<string, string> = {
  the: "thé",
  cafe: "café",
  lait: "lait",
  sucre: "sucre",
};

function accompagnementsDe(reponses: Reponses): string[] {
  const coches = Array.isArray(reponses.accompagnements)
    ? (reponses.accompagnements as readonly string[])
    : [];
  return coches.flatMap((coche) => LIBELLES[coche] ?? []);
}
