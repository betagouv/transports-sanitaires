// Conduite d'un parcours de questions dans les tests d'interface : répondre à une
// page, aller jusqu'au bout. Partagé par les tests du prescripteur et du
// secrétariat, qui traversent le même questionnaire.
//
// Le modèle mêle quatre formes de question sur une même page : des choix uniques
// (Q1, A4.1-A4.3…), des oui/non, des mosaïques à choix multiple (Q1.1, M0, A0.2,
// A3.4, M1.1) et douze saisies libres d'adresse. Répondre « par défaut » n'a
// donc pas un seul sens : c'est « Non » pour un oui/non, l'option exclusive pour
// une mosaïque — ou sa première case quand elle n'en a pas —, la première
// possibilité pour un choix unique, et un texte quelconque pour une saisie
// libre.

import { screen, waitFor, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";

type User = ReturnType<typeof userEvent.setup>;

/**
 * Une Partie 1 seule — et rien d'autre : passée au secrétariat, elle laisse la
 * Partie 2 entière à poser. Reprendre la base neutre complète répondrait aussi
 * aux questions administratives, et il n'y aurait plus de parcours à conduire.
 */
export const PARTIE_1_AMBULANCE: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(BASE_NEUTRE).filter(([cle]) => cle.startsWith("p1_")),
  ),
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'",
  p1_critere_oxygene: "oui",
};

/**
 * Ce qu'un test veut voir coché. Deux formes, selon la question :
 *   - `[question, valeur]` — un choix unique ou un oui/non : le groupe est nommé
 *     par `question`, l'option par `valeur` ;
 *   - `[option]` — une case de mosaïque, que son libellé identifie à lui seul.
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
    if ((champ as HTMLInputElement).value === "") await user.type(champ, "x");
  }
  for (const champ of screen.queryAllByRole("spinbutton")) {
    if (!memePage()) return;
    if ((champ as HTMLInputElement).value === "") await user.type(champ, "1");
  }
}

/**
 * Remplit le parcours page par page jusqu'à sa conclusion. `surLaPage` est
 * appelé sur chaque page **avant** qu'on y réponde — de quoi inspecter ce que
 * le parcours affiche, page après page, sans le conduire soi-même.
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
 * Traverse le parcours jusqu'à la première page qui porte une saisie libre —
 * les douze adresses du trajet, seul endroit du questionnaire où l'on tape.
 */
export async function allerAuChampTexte(user: User, reponses: Reponse[] = []) {
  await allerJusqua(
    user,
    () => screen.queryAllByRole("textbox").length > 0,
    reponses,
    "aucune saisie libre dans le parcours",
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
 * Répond à la page courante et en sort. Trois façons d'en sortir, selon la
 * page : cliquer « Suivant », cliquer le bouton de fin, ou — sur une page à
 * choix unique — attendre qu'elle avance d'elle-même. Rend `false` quand le
 * parcours est conclu, `true` quand une page de plus a pris la main.
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
  // Avancement automatique : aucun bouton, la page part seule au bout de
  // 200 ms — vers la suivante, ou vers le résultat si c'était la dernière.
  await waitFor(() => {
    if (etape() === etapeAvant) throw new Error("la page n'a pas avancé");
  });
  return etape() !== null;
}

/**
 * De quoi savoir, entre deux gestes, si la page est toujours celle qu'on remplit.
 *
 * Compléter une page prend plusieurs `await`, et une page à choix unique part
 * d'elle-même 200 ms après avoir reçu sa réponse : sur une machine chargée, elle
 * peut donc s'en aller au milieu du remplissage. La suite des gestes atterrit
 * alors sur la page **suivante**, la remplit, et le clic sur « Suivant » lui fait
 * sauter un écran — le test échoue plus loin, sur une page qu'il n'attendait pas,
 * et rien ne dit d'où vient le décalage. C'est ce qu'a montré la recette des
 * adresses, arrêtée sur le lieu d'arrivée alors qu'elle attendait le départ.
 */
function pageEnCours(): () => boolean {
  const depart = etape();
  return () => etape() === depart;
}

// Une réponse ciblée. Sans `valeur`, `question` nomme directement l'option — le
// cas d'une mosaïque, dont les cases portent l'énoncé complet. Avec `valeur`, la
// recherche est restreinte au groupe que `question` nomme.
async function repondre(
  user: User,
  question: RegExp,
  valeur?: string | RegExp,
) {
  if (valeur === undefined) return cliquerOption(user, screen, question);
  const groupe = screen.queryByRole("group", { name: question });
  if (groupe) await cliquerOption(user, within(groupe), valeur);
}

type Portee = typeof screen | ReturnType<typeof within>;

async function cliquerOption(user: User, dans: Portee, nom: string | RegExp) {
  const option =
    dans.queryByRole("radio", { name: nom }) ??
    dans.queryByRole("checkbox", { name: nom });
  if (option) await user.click(option);
}

// Un groupe resté sans réponse en reçoit une, la plus neutre de sa forme.
async function completerGroupe(user: User, groupe: HTMLElement) {
  const dedans = within(groupe);
  const cases = dedans.queryAllByRole("checkbox");
  if (cases.length > 0) return completerMosaique(user, dedans, cases);
  if (dedans.queryByRole("radio", { checked: true })) return;
  const radios = dedans.queryAllByRole("radio");
  const non = dedans.queryByRole("radio", { name: /^non$/i });
  if (non) await user.click(non);
  else if (radios[0]) await user.click(radios[0]);
}

// Une mosaïque est répondue par son option exclusive — « Aucun… » / « Aucune… » —
// sauf si une case est déjà cochée. Q1.1 n'en a plus : le modèle y exige au
// moins un critère, et la réponse la plus neutre devient sa première case, celle
// qui ne fait pas escalader le mode au-delà du VSL.
async function completerMosaique(
  user: User,
  dans: Portee,
  cases: HTMLElement[],
) {
  if (cases.some((c) => (c as HTMLInputElement).checked)) return;
  const neutre = dans.queryByRole("checkbox", { name: /^aucun/i }) ?? cases[0];
  if (neutre) await user.click(neutre);
}

// L'étape affichée par l'étapeur, ou `null` s'il n'y en a plus — le parcours est
// alors conclu et une page de résultat a pris sa place.
function etape(): string | null {
  return (
    screen.queryByRole("heading", { name: /^étape \d+ sur \d+$/i })
      ?.textContent ?? null
  );
}
