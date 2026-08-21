// La phrase indicative d'une question — sa `description` dans le modèle — telle
// que l'utilisateur la lit : sous l'énoncé, dans la même légende, avant les
// réponses.
//
// Elle est portée par le modèle et rendue par l'interface ; rien ne la recopie.
// Longtemps, les cinq mosaïques la perdaient en route : `Mosaique.tsx` bâtissait
// sa légende à partir de la seule `question` de la règle parente, et « Sélectionnez
// toutes les réponses correspondant à la situation du patient » n'atteignait
// jamais l'écran. Ce fichier ferme la porte : une `description` ajoutée au modèle
// sans cas ici fait échouer la couverture.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import type { Reponse } from "./parcours";
import { allerAuGroupe, PARTIE_1_AMBULANCE } from "./parcours";

const Q1 = /^le patient/i;
const PROFESSIONNEL = /prise en charge spécifique/i;

type Cas = {
  spec: string;
  regle: string;
  depuis: "prescripteur" | "secretariat";
  // L'énoncé de la question, tel que le modèle le fixe.
  question: string;
  // La phrase indicative attendue sous cet énoncé.
  information: string;
  // Ce qu'il faut répondre en chemin pour que la branche s'ouvre.
  reponses: Reponse[];
};

const QUESTIONS: Cas[] = [
  {
    spec: "Q1.1",
    regle: "p1_criteres_transport",
    depuis: "prescripteur",
    question:
      "Quelles aides ou conditions particulières sont nécessaires pendant le transport ?",
    information:
      "Sélectionnez toutes les réponses correspondant à la situation du patient.",
    reponses: [[Q1, PROFESSIONNEL]],
  },
  {
    spec: "M0",
    regle: "p1_cas_particuliers_medicaux",
    depuis: "prescripteur",
    question:
      "Avant d’établir le mode de transport adéquat, sélectionnez tous les éventuels cas particuliers concernant le patient.",
    information:
      "Sélectionnez tous les cas concernés. Si la séance est liée à une ALD (Affection de Longue Durée) reconnue pour le patient, sélectionnez les deux réponses correspondantes.",
    reponses: [],
  },
  {
    spec: "M1.1",
    regle: "p2_contexte_administratif",
    depuis: "secretariat",
    question: "Dans quel contexte le déplacement est-il réalisé ?",
    information:
      "Plusieurs choix sont possibles. Sélectionnez toutes les réponses correspondant à la situation du patient.",
    reponses: [],
  },
  {
    spec: "A0.1",
    regle: "p2_patient_hospitalise",
    depuis: "secretariat",
    question:
      "Au moment exact du transport, le patient sera-t-il toujours hospitalisé, notamment dans le cadre d’un transfert vers un autre établissement ou d’un déplacement temporaire pour recevoir des soins ?",
    information:
      "Répondez « Non » si le patient quitte les urgences ou une consultation sans avoir été hospitalisé dans l’établissement de départ.",
    reponses: [],
  },
  {
    spec: "A0.2",
    regle: "p2_exceptions_assurance_maladie",
    depuis: "secretariat",
    question:
      "Le transport relève-t-il d’une ou plusieurs de ces exceptions restant prises en charge dans les conditions de l’Assurance Maladie ?",
    information:
      "Sélectionnez toutes les réponses correspondant à la situation du patient.",
    reponses: [[/toujours hospitalisé/i, /^oui$/i]],
  },
  {
    spec: "A2.1",
    regle: "p2_convocation_ou_avis",
    depuis: "secretariat",
    question:
      "Le déplacement est-il lié à une convocation réglementaire ou à un avis d’audience valant prescription médicale de transport ?",
    information:
      "Une convocation à une consultation médicale habituelle n’est pas concernée. Si vous répondez « Oui », vous devrez préciser le type de convocation ou d’avis.",
    // A0.1 répondue « Non » ouvre le parcours standard, et c'est la réponse par
    // défaut d'un oui/non : rien à cibler en chemin.
    reponses: [],
  },
  {
    spec: "A3.4",
    regle: "p2_situations_accord_prealable",
    depuis: "secretariat",
    question:
      "Le transport concerne-t-il une ou plusieurs des situations suivantes ?",
    information:
      "Sélectionnez toutes les réponses correspondant à la situation du patient.",
    reponses: [[/à l’origine du déplacement/i, /^oui$/i]],
  },
  {
    spec: "A4.3",
    regle: "p2_trajet_arrivee",
    depuis: "secretariat",
    question: "Quel est le lieu d’arrivée du trajet concerné ?",
    information:
      "Le lieu d’arrivée doit être différent du lieu de départ. Pour un aller-retour, renseignez les lieux du trajet aller.",
    reponses: [[/à l’origine du déplacement/i, /^oui$/i]],
  },
];

describe.each(QUESTIONS)("$spec — la phrase indicative", (cas) => {
  it("est celle que le modèle porte", () => {
    // Le modèle est la source : l'attendu écrit ici n'est pas une seconde
    // rédaction, il constate celle de la règle.
    expect(regles[cas.regle]?.description).toBe(cas.information);
  });

  // 20 s : atteindre A4.3 traverse tout le parcours administratif, et les 5 s
  // par défaut de vitest ne tiennent plus dès que la machine partage ses cœurs
  // entre fichiers de test.
  it("s’affiche immédiatement sous la question", async () => {
    await ouvrir(cas);
    const groupe = screen.getByRole("group", { name: motif(cas.question) });
    const indication = within(groupe).getByText(cas.information);
    expect(indication).toHaveClass("fr-hint-text");
    // Dans la légende, donc entre l'énoncé et les réponses — pas relégué
    // ailleurs dans le formulaire.
    expect(groupe.querySelector("legend")).toContainElement(indication);
  }, 20_000);
});

it("couvre toutes les questions à `description` du modèle", () => {
  // Une `description` ajoutée à une question posée doit passer par ce fichier :
  // sans cela, rien ne garantirait qu'elle atteint l'écran.
  const posees = Object.entries(regles)
    .filter(([, corps]) => corps?.question && corps?.description)
    .map(([nom]) => nom);
  const couvertes = QUESTIONS.map((cas) => cas.regle);
  expect(posees.filter((nom) => !couvertes.includes(nom))).toEqual([]);
});

// ---- implémentation ----

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, { question?: string; description?: string } | null>;

/** Le nom accessible du groupe contient l'énoncé — et, désormais, la phrase qui suit. */
const motif = (question: string) =>
  new RegExp(question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

/** Ouvre le parcours qui pose `cas`, et s'arrête sur sa page, question intacte. */
async function ouvrir(cas: Cas) {
  sessionStorage.clear();
  // `delay: null` : la temporisation par défaut de user-event s'ajouterait aux
  // 200 ms d'avancement automatique de chaque page à choix unique.
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
  await allerAuGroupe(user, motif(cas.question), cas.reponses);
  return user;
}
