// Le contrat coche/décoche des questions à choix multiple — les cinq mosaïques du
// modèle, et pas seulement les deux qu'on croise en ouvrant le simulateur.
//
// Une mosaïque n'est pas une question publicodes : c'est N règles booléennes
// indépendantes, le plus souvent accompagnées d'une option exclusive, recollées
// par l'interface (cf. `front/simulateur/questionnaire/mosaique.ts`). Le moteur
// ne garantit donc rien de leur exclusivité — elle est écrite dans
// `ChampsDePage`, et c'est ici qu'elle est vérifiée, groupe par groupe, telle
// que l'utilisateur la manipule.
//
// Q1.1 fait bande à part : le modèle y exige au moins un critère, elle n'a donc
// aucune sortie de secours à offrir. Ce qu'elle partage avec les autres est
// vérifié pour toutes ; l'exclusivité ne l'est que pour celles qui en ont une.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import yaml from "js-yaml";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import type { Reponse } from "./parcours";
import { allerAuGroupe, PARTIE_1_AMBULANCE, repondrePage } from "./parcours";

beforeEach(() => sessionStorage.clear());

const Q1 = /^le patient/i;
const PROFESSIONNEL = /prise en charge spécifique/i;

type Cas = {
  spec: string;
  // La règle parente, celle qui porte la métadonnée `mosaique`.
  parent: string;
  depuis: "prescripteur" | "secretariat";
  // L'intitulé exact du livrable — celui qui nomme le groupe dans la page.
  intitule: string;
  // L'intitulé exact de l'option exclusive, tel que le livrable le fixe.
  // Absent pour Q1.1, seule mosaïque à n'offrir aucune sortie de secours.
  exclusive?: RegExp;
  // Ce qu'il faut répondre en chemin pour que la branche s'ouvre ; le reste du
  // parcours est réglé par défaut.
  reponses: Reponse[];
};

const MOSAIQUES: Cas[] = [
  {
    spec: "Q1.1",
    parent: "p1_criteres_transport",
    depuis: "prescripteur",
    intitule:
      "Quelles aides ou conditions particulières sont nécessaires pendant le transport ?",
    reponses: [[Q1, PROFESSIONNEL]],
  },
  {
    spec: "M0",
    parent: "p1_cas_particuliers_medicaux",
    depuis: "prescripteur",
    intitule:
      "Avant d’établir le mode de transport adéquat, sélectionnez tous les éventuels cas particuliers concernant le patient.",
    exclusive: /aucun de ces cas médicaux/i,
    reponses: [],
  },
  {
    spec: "M1.1",
    parent: "p2_contexte_administratif",
    depuis: "secretariat",
    intitule: "Dans quel contexte le déplacement est-il réalisé ?",
    exclusive:
      /aucun de ces contextes ne correspond à la situation du patient/i,
    reponses: [],
  },
  {
    spec: "A0.2",
    parent: "p2_exceptions_assurance_maladie",
    depuis: "secretariat",
    intitule:
      "Le transport relève-t-il d’une ou plusieurs de ces exceptions restant prises en charge dans les conditions de l’Assurance Maladie ?",
    exclusive: /aucune de ces exceptions ne s’applique au transport/i,
    // A0.2 ne se pose qu'au patient encore hospitalisé au moment du transport.
    reponses: [[/toujours hospitalisé/i, /^oui$/i]],
  },
  {
    spec: "A3.4",
    parent: "p2_situations_accord_prealable",
    depuis: "secretariat",
    intitule:
      "Le transport concerne-t-il une ou plusieurs des situations suivantes ?",
    exclusive: /aucune de ces situations ne concerne le transport/i,
    // A3.4 est en aval de l'accord préalable, que seule une prestation prise en
    // charge par l'Assurance Maladie fait qualifier.
    reponses: [[/à l’origine du déplacement/i, /^oui$/i]],
  },
];

/** Les quatre mosaïques qui offrent une sortie de secours — toutes sauf Q1.1. */
type CasAvecSortie = Cas & { exclusive: RegExp };
const AVEC_SORTIE = MOSAIQUES.filter(
  (cas): cas is CasAvecSortie => cas.exclusive !== undefined,
);

describe.each(MOSAIQUES)("$spec — coche et décoche", (cas) => {
  it("est un vrai choix multiple dans le modèle", () => {
    // Ce que l'interface rend en cases à cocher, le modèle doit le déclarer en
    // mosaïque : sans elle, la même question tomberait en N oui/non successifs.
    const regle = regles[cas.parent];
    expect(regle?.question).toBe(cas.intitule);
    expect(regle?.mosaique).toMatchObject({ type: "selection" });
  });

  it("garde plusieurs options cochées à la fois", async () => {
    const user = await ouvrir(cas);
    const [premiere, seconde] = options(cas);
    if (!premiere || !seconde) throw new Error("mosaïque à moins de 2 options");

    // Choix multiple : les autres options ne se désactivent pas une fois
    // l'agrégat OU satisfait.
    await user.click(premiere);
    await user.click(seconde);
    expect(premiere).toBeChecked();
    expect(seconde).toBeChecked();
  });

  it("rebloque l'avancement quand plus rien n'est coché", async () => {
    const user = await ouvrir(cas);
    // Le reste de la page répondu : seul l'état de la mosaïque décide désormais
    // du bouton de validation.
    await repondrePage(user, cas.reponses);
    expect(validation()).toBeEnabled();

    // Une option cochée seule vaut réponse — que la page ait été complétée par
    // la sortie de secours, qu'il faut alors chasser, ou par cette option même,
    // ce que fait Q1.1 faute d'en avoir une.
    const premiere = options(cas)[0];
    if (!premiere) throw new Error("mosaïque sans option");
    if (!(premiere as HTMLInputElement).checked) await user.click(premiere);
    expect(premiere).toBeChecked();
    expect(validation()).toBeEnabled();

    // La mosaïque fige toutes ses options dans la situation à chaque clic : une
    // fois « répondues » au sens de @publicodes/forms, un coche→décoche laisse le
    // groupe visuellement vide MAIS sans « aucun » explicite. Aucune sélection
    // n'est pas une réponse.
    await user.click(premiere);
    expect(premiere).not.toBeChecked();
    expect(validation()).toBeDisabled();
  });
});

describe.each(AVEC_SORTIE)("$spec — la sortie de secours", (cas) => {
  it("est l'option exclusive du livrable, en dernière position", async () => {
    await ouvrir(cas);
    // Sa position n'est pas cosmétique : l'utilisateur lit la sortie de secours
    // en dernier, après les cas qu'elle dit tous écarter.
    expect(cases(cas).at(-1)).toHaveAccessibleName(cas.exclusive);
  });

  it("chasse les options cochées", async () => {
    const user = await ouvrir(cas);
    const [premiere, seconde] = options(cas);
    if (!premiere || !seconde) throw new Error("mosaïque à moins de 2 options");
    await user.click(premiere);
    await user.click(seconde);
    expect(exclusive(cas)).not.toBeChecked();

    await user.click(exclusive(cas));
    expect(exclusive(cas)).toBeChecked();
    for (const option of options(cas)) expect(option).not.toBeChecked();
  });

  it("se décoche dès qu'une option est cochée", async () => {
    const user = await ouvrir(cas);
    await user.click(exclusive(cas));
    const premiere = options(cas)[0];
    if (!premiere) throw new Error("mosaïque sans option");
    await user.click(premiere);
    expect(premiere).toBeChecked();
    expect(exclusive(cas)).not.toBeChecked();
  });
});

it("Q1.1 est la seule mosaïque sans sortie de secours", async () => {
  // Le modèle exige au moins un critère dès que Q1.1 est posée : l'écran ne
  // doit donc offrir aucune case permettant de la traverser sans en cocher un,
  // et c'est la seule mosaïque dans ce cas.
  const q1_1 = MOSAIQUES.find((cas) => cas.spec === "Q1.1");
  if (!q1_1) throw new Error("Q1.1 absente du tableau des mosaïques");
  expect(MOSAIQUES.filter((cas) => cas.exclusive === undefined)).toEqual([
    q1_1,
  ]);

  await ouvrir(q1_1);
  for (const option of cases(q1_1))
    expect(option).not.toHaveAccessibleName(/^aucun/i);
});

it("couvre toutes les mosaïques du modèle", () => {
  // Une mosaïque ajoutée en amont n'a aucune raison d'hériter de l'exclusivité :
  // elle doit passer par ce fichier.
  const declarees = Object.entries(regles)
    .filter(([, corps]) => corps && "mosaique" in corps)
    .map(([nom]) => nom);
  const couvertes = MOSAIQUES.map((cas) => cas.parent);
  expect(declarees.filter((nom) => !couvertes.includes(nom))).toEqual([]);
});

// ---- implémentation ----

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, Record<string, unknown> | null>;

/** Ouvre le parcours qui pose `cas`, et s'arrête sur sa page, question intacte. */
async function ouvrir(cas: Cas) {
  // `delay: null` : la temporisation par défaut de user-event s'ajouterait aux
  // 200 ms d'avancement automatique de chaque page à choix unique, et les
  // parcours administratifs les plus longs ne tiendraient plus dans un test.
  const user = userEvent.setup({ delay: null });
  if (cas.depuis === "prescripteur")
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />,
    );
  else {
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
  }
  await allerAuGroupe(user, enonce(cas), cas.reponses);
  return user;
}

/** L'intitulé du livrable, en motif : le nom accessible du groupe le contient. */
const enonce = (cas: Cas) =>
  new RegExp(cas.intitule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const groupe = (cas: Cas) => screen.getByRole("group", { name: enonce(cas) });
const cases = (cas: Cas) => within(groupe(cas)).getAllByRole("checkbox");
const options = (cas: Cas) =>
  cas.exclusive ? cases(cas).slice(0, -1) : cases(cas);
const exclusive = (cas: CasAvecSortie) =>
  within(groupe(cas)).getByRole("checkbox", { name: cas.exclusive });

/** Le bouton qui fait sortir de la page — « Suivant », ou celui de fin. */
const validation = () =>
  screen.getByRole("button", { name: /^suivant$|^voir |^compléter/i });
