// Comment on répond à un champ, dans les tests d'interface : la réponse qu'un
// test désigne, et celle qu'on donne par défaut à ce qu'il ne désigne pas.
//
// Ce module ne sait rien du parcours — il ne connaît que les cinq formes de champ
// que le modèle emploie, et ce que « répondre » veut dire pour chacune. C'est
// `parcours.ts` qui décide quand les appeler, et jusqu'où avancer.

import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;
type Portee = typeof screen | ReturnType<typeof within>;

// Une réponse ciblée. Sans `valeur`, `question` nomme directement l'option, ce qui
// est le cas d'une mosaïque, dont les cases portent l'énoncé complet. Avec
// `valeur`, la recherche est restreinte au groupe que `question` nomme.
export async function repondre(
  user: User,
  question: RegExp,
  valeur?: string | RegExp,
) {
  if (valeur === undefined) return cliquerOption(user, screen, question);
  const groupe = screen.queryByRole("group", { name: question });
  if (groupe) return cliquerOption(user, within(groupe), valeur);
  const liste = screen.queryByRole("combobox", { name: question });
  if (liste) return choisirDansListe(user, liste as HTMLSelectElement, valeur);
  // Une saisie chiffrée se cible comme le reste : la valeur y est tapée. C'est
  // le nombre de transports prévus qui ouvre la question de leur organisation.
  const nombre = screen.queryByRole("spinbutton", { name: question });
  if (nombre && typeof valeur === "string") {
    await user.clear(nombre);
    await user.type(nombre, valeur);
  }
}

// Une réponse ciblée dans une liste déroulante : l'option dont le libellé
// correspond, désignée comme elle le serait parmi des boutons radio.
async function choisirDansListe(
  user: User,
  liste: HTMLSelectElement,
  valeur: string | RegExp,
) {
  const correspond = (texte: string) =>
    typeof valeur === "string" ? texte === valeur : valeur.test(texte);
  const option = [...liste.options].find((o) =>
    correspond(o.textContent ?? ""),
  );
  if (option) await user.selectOptions(liste, option.value);
}

async function cliquerOption(user: User, dans: Portee, nom: string | RegExp) {
  const option =
    dans.queryByRole("radio", { name: nom }) ??
    dans.queryByRole("checkbox", { name: nom });
  if (option) await user.click(option);
}

// Une liste déroulante non répondue reçoit sa réponse la plus neutre : la sortie
// « Aucun… » quand elle en offre une, sa première possibilité sinon. La première
// entrée d'un `<select>` DSFR est l'invite « Sélectionnez une option », qui n'est
// pas une réponse : on l'écarte.
export async function completerListe(user: User, liste: HTMLSelectElement) {
  if (liste.value !== "") return;
  const possibles = [...liste.options].filter((option) => option.value !== "");
  const neutre =
    possibles.find((option) => /^aucun/i.test(option.textContent ?? "")) ??
    possibles[0];
  if (neutre) await user.selectOptions(liste, neutre.value);
}

// Un groupe resté sans réponse en reçoit une, la plus neutre de sa forme.
//
// Une exception, et c'est le piège que la v9.7 a rendu vivant : le type du lieu
// d'arrivée offre « Domicile » en premier, comme celui du départ. Les deux
// réponses par défaut feraient donc un trajet du domicile au domicile, que le
// contrat interdit — le parcours s'arrêtait là, sans distance ni document.
export async function completerGroupe(user: User, groupe: HTMLElement) {
  const dedans = within(groupe);
  if (/type de lieu d’arrivée/i.test(groupe.textContent ?? "")) {
    const structure = dedans.queryByRole("radio", {
      name: /^structure de soins$/i,
    });
    if (structure && !(structure as HTMLInputElement).checked)
      return user.click(structure);
  }
  const cases = dedans.queryAllByRole("checkbox");
  if (cases.length > 0) return completerMosaique(user, dedans, cases);
  if (dedans.queryByRole("radio", { checked: true })) return;
  const radios = dedans.queryAllByRole("radio");
  // « Aucun… » vaut pour un choix unique ce que l'option exclusive vaut pour une
  // mosaïque : la réponse qui n'engage rien et laisse le parcours continuer. A2.1,
  // née en v9.5.0 de la fusion de deux écrans, en fait sa huitième réponse — sans
  // quoi la première, une convocation, conclurait le parcours sur-le-champ.
  const neutre =
    dedans.queryByRole("radio", { name: /^non$/i }) ??
    dedans.queryByRole("radio", { name: /^aucun/i });
  if (neutre) await user.click(neutre);
  else if (radios[0]) await user.click(radios[0]);
}

// Une mosaïque est répondue par son option exclusive, « Aucun… » ou « Aucune… »,
// sauf si une case est déjà cochée. Les huit mosaïques de la v9.7 en portent une,
// Q1.1 comprise : la v9.5.1 l'en avait privée — le modèle y exigeait au moins un
// critère —, la v9.7 la lui rend. Le repli sur la première case ne sert donc plus
// qu'à une mosaïque qui perdrait sa sortie neutre.
async function completerMosaique(
  user: User,
  dans: Portee,
  cases: HTMLElement[],
) {
  if (cases.some((c) => (c as HTMLInputElement).checked)) return;
  const neutre = dans.queryByRole("checkbox", { name: /^aucun/i }) ?? cases[0];
  if (neutre) await user.click(neutre);
}

/**
 * Ce qu'on tape dans une saisie libre qu'aucun test ne cible. « x » suffisait
 * jusqu'ici : le modèle ne vérifiait aucun format.
 *
 * La v9.7 confie ces contrôles à l'application (`p2_*_format_valide`), qui exige
 * cinq chiffres d'un code postal français. Un « x » y rend l'adresse invalide,
 * la page d'adresse jamais complète, et le parcours s'arrête avant la distance.
 * La valeur par défaut suit donc l'énoncé du champ.
 */
export function valeurParDefaut(champ: HTMLInputElement): string {
  const enonce = champ.labels?.[0]?.textContent ?? "";
  // Les deux lieux d'un trajet ne peuvent pas être la même adresse : le modèle
  // le refuse, et l'application le lui dit (`p2_adresses_strictement_identiques`).
  // Les valeurs par défaut se distinguent donc d'un lieu à l'autre, ce que seul
  // l'identifiant du champ — le nom de la règle — permet de savoir.
  const arrivee = champ.id.startsWith("p2_arrivee_");
  if (/code postal/i.test(enonce)) return arrivee ? "75002" : "75001";
  if (/^ville$|commune/i.test(enonce)) return arrivee ? "Lyon" : "Paris";
  if (/voie|adresse/i.test(enonce))
    return arrivee ? "2 rue de l’Arrivée" : "1 rue du Départ";
  if (/nom du lieu/i.test(enonce))
    return arrivee ? "Centre hospitalier" : "Cabinet médical";
  return "x";
}
