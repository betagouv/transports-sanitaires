// Conduite d'un parcours de questions dans les tests d'interface : répondre à une
// page, aller jusqu'au bout. Ce fichier est partagé par les tests du prescripteur
// et du secrétariat, qui traversent le même questionnaire.
//
// Le modèle mêle quatre formes de question sur une même page : des choix uniques
// (Q1, A4.1-A4.3…), des oui/non, des mosaïques à choix multiple et des saisies
// libres. Répondre « par défaut » n'a donc pas un seul sens. C'est « Non » pour
// un oui/non, l'option exclusive pour une mosaïque, ou sa première case quand
// elle n'en a pas, la sortie « Aucun… » pour un choix unique qui en offre une et
// sa première possibilité sinon, et un texte quelconque pour une saisie libre.

import { screen, waitFor } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import {
  completerDate,
  completerGroupe,
  repondre,
  saisiesCalendaires,
  valeurParDefaut,
} from "./reponses-de-page";

type User = ReturnType<typeof userEvent.setup>;

/**
 * Une Partie 1 seule, et rien d'autre : passée au secrétariat, elle laisse la
 * Partie 2 entière à poser. Reprendre la base neutre complète répondrait aussi aux
 * questions administratives, et il n'y aurait plus de parcours à conduire.
 */
export const PARTIE_1_AMBULANCE: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(BASE_NEUTRE).filter(([cle]) => cle.startsWith("p1_")),
  ),
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
  p1_critere_oxygene: "oui",
  // Q1.1 a gagné une option exclusive en v9.7 : cocher un critère suppose de la
  // décocher, sans quoi la mosaïque reste incomplète et la Partie 1 ne conclut pas.
  p1_critere_aucun: "non",
};

/**
 * La même chose, mais sans motif ouvrant droit : l'hygiène ne compte pas parmi
 * les critères d'ambulance, seuls à valoir motif à eux seuls. C'est le seul
 * chemin vers les questions que le modèle ne pose qu'à défaut d'autre motif —
 * A2.4, la qualification précoce du dispositif Engagement maternité.
 */
export const PARTIE_1_SANS_MOTIF: Record<string, string> = {
  ...PARTIE_1_AMBULANCE,
  p1_critere_oxygene: "non",
  p1_critere_hygiene_desinfection: "oui",
  p1_critere_aucun: "non",
};

/**
 * Ce qu'un test veut voir coché. Il y a deux formes, selon la question :
 *   - `[question, valeur]` pour un choix unique ou un oui/non, le groupe étant
 *     nommé par `question` et l'option par `valeur` ;
 *   - `[option]` pour une case de mosaïque, que son libellé identifie à lui seul.
 */
export type Reponse = [RegExp, (string | RegExp)?];

/** Répond aux questions ciblées, puis complète le reste de la page par défaut. */
export async function repondrePage(user: User, reponses: Reponse[]) {
  const memePage = pageEnCours();
  for (const [question, valeur] of reponses)
    await repondre(user, question, valeur);
  for (const groupe of screen.queryAllByRole("group")) {
    if (!memePage()) return;
    await completerGroupe(user, groupe);
  }
  for (const champ of screen.queryAllByRole("textbox")) {
    if (!memePage()) return;
    if ((champ as HTMLInputElement).value === "")
      await user.type(champ, valeurParDefaut(champ as HTMLInputElement));
  }
  for (const champ of screen.queryAllByRole("spinbutton")) {
    if (!memePage()) return;
    if ((champ as HTMLInputElement).value === "") await user.type(champ, "1");
  }
  for (const champ of saisiesCalendaires()) {
    if (!memePage()) return;
    await completerDate(user, champ);
  }
}

/**
 * Remplit le parcours page par page jusqu'à sa conclusion. `surLaPage` est appelé
 * sur chaque page avant qu'on y réponde, de quoi inspecter ce que le parcours
 * affiche, page après page, sans le conduire soi-même.
 */
export async function terminerParcours(
  user: User,
  reponses: Reponse[],
  surLaPage: () => void = () => {},
) {
  for (let i = 0; i < 40; i++) {
    surLaPage();
    if (!(await avancerDUnePage(user, reponses))) return;
  }
  throw new Error("parcours non terminé après 40 pages");
}

/**
 * Traverse le parcours jusqu'à la page qui pose `groupe`, sans y répondre : au
 * retour, la question est affichée et intacte. Les autres questions rencontrées
 * en chemin sont réglées par `reponses`, ou par défaut.
 */
export async function allerAuGroupe(
  user: User,
  groupe: RegExp,
  reponses: Reponse[] = [],
) {
  await allerJusqua(
    user,
    () => screen.queryByRole("group", { name: groupe }) !== null,
    reponses,
    `question jamais posée : ${groupe}`,
  );
}

/**
 * Traverse le parcours jusqu'à la première page qui porte une saisie libre, c'est-
 * à-dire les douze adresses du trajet, seul endroit du questionnaire où l'on tape.
 */
export async function allerAuChampTexte(user: User, reponses: Reponse[] = []) {
  await allerJusqua(
    user,
    () => screen.queryAllByRole("textbox").length > 0,
    reponses,
    "aucune saisie libre dans le parcours",
  );
}

/**
 * Traverse le parcours jusqu'à la première page qui porte une saisie chiffrée,
 * A3.2, le nombre de transports prévus, seule question du modèle à en demander une.
 */
export async function allerAuChampNombre(user: User, reponses: Reponse[] = []) {
  await allerJusqua(
    user,
    () => screen.queryAllByRole("spinbutton").length > 0,
    reponses,
    "aucune saisie chiffrée dans le parcours",
  );
}

// ---- implémentation ----

// Avance page par page tant que la page cherchée n'est pas là, sans jamais
// répondre à celle-ci : au retour, elle est affichée et intacte.
async function allerJusqua(
  user: User,
  atteinte: () => boolean,
  reponses: Reponse[],
  echec: string,
) {
  for (let i = 0; i < 40; i++) {
    if (atteinte()) return;
    if (!(await avancerDUnePage(user, reponses))) break;
  }
  throw new Error(echec);
}

/**
 * Répond à la page courante et en sort. Il y a trois façons d'en sortir, selon la
 * page : cliquer « Suivant », cliquer le bouton de fin, ou attendre qu'elle avance
 * d'elle-même sur une page à choix unique. La fonction rend `false` quand le
 * parcours est conclu, et `true` quand une page de plus a pris la main.
 */
async function avancerDUnePage(
  user: User,
  reponses: Reponse[],
): Promise<boolean> {
  const etapeAvant = etape();
  await repondrePage(user, reponses);

  const suivant = screen.queryByRole("button", { name: /^suivant$/i });
  if (suivant) {
    await user.click(suivant);
    return true;
  }
  const fin = screen.queryByRole("button", { name: /^voir|^compléter/i });
  if (fin) {
    await user.click(fin);
    return false;
  }
  // Avancement automatique : il n'y a aucun bouton, et la page part seule au bout
  // de 200 ms, vers la suivante ou vers le résultat si c'était la dernière.
  await waitFor(() => {
    if (etape() === etapeAvant) throw new Error("la page n'a pas avancé");
  });
  return etape() !== null;
}

/**
 * De quoi savoir, entre deux gestes, si la page est toujours celle qu'on remplit.
 *
 * Compléter une page prend plusieurs `await`, et une page à choix unique part
 * d'elle-même 200 ms après avoir reçu sa réponse. Sur une machine chargée, elle
 * peut donc s'en aller au milieu du remplissage. La suite des gestes atterrit alors
 * sur la page suivante, la remplit, et le clic sur « Suivant » lui fait sauter un
 * écran. Le test échoue plus loin, sur une page qu'il n'attendait pas, et rien ne
 * dit d'où vient le décalage. C'est ce qu'a montré la recette des adresses,
 * arrêtée sur le lieu d'arrivée alors qu'elle attendait le départ.
 */
function pageEnCours(): () => boolean {
  const depart = etape();
  return () => etape() === depart;
}

// Le rang de l'étape affichée par l'étapeur, ou `null` s'il n'y en a plus. Le
// parcours est alors conclu, et une page de résultat a pris sa place.
//
// On lit le rang seul, jamais l'intitulé entier, parce que le total bouge sous la
// page courante : chaque réponse rend applicables des questions que l'étapeur ne
// connaissait pas encore. « Étape 2 sur 2 » devient « Étape 2 sur 3 » sans qu'on ait
// changé d'écran, et prendre cela pour un passage à la page suivante ferait compter
// deux fois la même page, ou abandonner un remplissage en cours de route.
function etape(): string | null {
  const titre = screen.queryByRole("heading", {
    name: /^étape \d+ sur \d+$/i,
  })?.textContent;
  return /^étape (\d+)/i.exec(titre ?? "")?.[1] ?? null;
}
