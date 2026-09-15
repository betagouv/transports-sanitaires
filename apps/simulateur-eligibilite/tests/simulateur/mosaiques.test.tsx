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
// La v9.7 en porte huit, contre cinq en v9.5.1, et leur donne à toutes une sortie
// exclusive — Q1.1 comprise, qui en était privée parce que le modèle y exigeait
// alors au moins un critère. La v9.7.1 en ajoute une neuvième, CONV-AP, derrière
// la convocation. Toutes nomment leur sortie du même libellé, « Aucune de ces
// situations ».
//
// Trois d'entre elles — les listes d'exonération du ticket modérateur, une par
// document — ne sont pas encore atteignables à l'écran : elles s'ouvrent en aval
// de la détermination du document, et celle du S3141 attend les durées que
// l'application ne calcule pas encore. Leur contrat est donc vérifié sur le
// modèle, et leur rendu le sera quand le parcours y mènera.

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

const Q1 = /^concernant son déplacement, le patient/i;
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

const EXCLUSIVE = /aucune de ces situations/i;

// Ce qu'il faut répondre pour qu'un document soit déterminé, et sa liste
// d'exonération posée. Trois routes distinctes, dont deux seulement sont
// atteignables tant que l'application ne calcule pas les durées de permission.
const MOSAIQUES: Cas[] = [
  {
    spec: "Q1.1",
    parent: "p1_criteres_transport",
    depuis: "prescripteur",
    intitule:
      "Quelles aides ou conditions particulières sont nécessaires pendant le transport ?",
    exclusive: EXCLUSIVE,
    reponses: [[Q1, PROFESSIONNEL]],
  },
  {
    spec: "M0",
    parent: "p1_cas_particuliers_medicaux",
    depuis: "prescripteur",
    intitule:
      "Avant d’établir le mode de transport adéquat, sélectionnez tous les éventuels cas particuliers concernant le patient.",
    exclusive: EXCLUSIVE,
    reponses: [],
  },
  {
    spec: "M1.2",
    parent: "p2_contextes_complementaires",
    depuis: "secretariat",
    intitule:
      "Le déplacement est-il également réalisé dans l’un des contextes suivants ?",
    exclusive: EXCLUSIVE,
    reponses: [],
  },
  {
    spec: "A0.2",
    parent: "p2_exceptions_assurance_maladie",
    depuis: "secretariat",
    intitule:
      "Le transport relève-t-il d’une exception restant prise en charge dans les conditions de l’Assurance Maladie ?",
    exclusive: EXCLUSIVE,
    // A0.2 ne se pose que derrière un transfert qualifié, que la v9.7 demande
    // positivement là où la v9.5.1 le déduisait de l'hospitalisation.
    reponses: [
      [/raison principale/i, /transfert d’un patient hospitalisé/i],
      [/transfert.*en cours/i, /^oui$/i],
    ],
  },
  {
    spec: "CONV-AP",
    parent: "p2_convocation_caracteristiques",
    depuis: "secretariat",
    intitule:
      "Le déplacement lié à cette convocation présente-t-il l’une des caractéristiques suivantes ?",
    exclusive: EXCLUSIVE,
    // La mosaïque ne s'ouvre que derrière une convocation déclarée : la v9.7.1
    // demande d'abord laquelle, une seule réponse hors « Aucun de ces cas. »
    // suffisant à l'ouvrir.
    reponses: [[/cas réglementaires/i, /convocation du contrôle médical/i]],
  },
  {
    spec: "A3.1",
    parent: "p2_situations_speciales",
    depuis: "secretariat",
    intitule: "Le transport relève-t-il de l’une des situations suivantes ?",
    exclusive: EXCLUSIVE,
    reponses: [],
  },
];

// Les trois listes d'exonération du ticket modérateur, vérifiées sur le modèle
// seul : le parcours n'y mène pas encore à l'écran.
const TICKET_MODERATEUR = ["p2_tm_pmt", "p2_tm_dap", "p2_tm_s3141"] as const;

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

it("donne à chaque mosaïque du modèle la même sortie de secours", () => {
  // La v9.5.1 privait Q1.1 de sortie : le modèle y exigeait au moins un critère.
  // La v9.7 la lui rend, et unifie le libellé des huit — c'est ce qui permet à
  // l'interface de les traiter d'une seule façon.
  const sansSortie = Object.entries(regles)
    .filter(([, corps]) => corps && "mosaique" in corps)
    .filter(([, corps]) => {
      const mosaique = corps?.mosaique as { "option aucun"?: string };
      return mosaique["option aucun"] === undefined;
    })
    .map(([nom]) => nom);
  expect(sansSortie).toEqual([]);
});

it.each(TICKET_MODERATEUR)(
  "%s déclare une mosaïque, que le parcours n’atteint pas encore",
  (parent) => {
    // Ces trois-là s'ouvrent derrière la détermination du document. Leur rendu
    // n'est donc pas vérifié ici ; leur déclaration l'est, pour qu'une liste
    // ajoutée ou retirée en amont ne passe pas inaperçue.
    const corps = regles[parent];
    expect(corps?.mosaique).toMatchObject({ type: "selection" });
    expect(corps?.question).toBe(
      "L’un des cas particuliers d’exonération du ticket modérateur suivants s’applique-t-il ?",
    );
  },
);

it("couvre toutes les mosaïques du modèle", () => {
  // Une mosaïque ajoutée en amont n'a aucune raison d'hériter de l'exclusivité :
  // elle doit passer par ce fichier.
  const declarees = Object.entries(regles)
    .filter(([, corps]) => corps && "mosaique" in corps)
    .map(([nom]) => nom);
  const couvertes = [
    ...MOSAIQUES.map((cas) => cas.parent),
    ...TICKET_MODERATEUR,
  ];
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
