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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import type { Reponse } from "./parcours";
import {
  allerAuChampNombre,
  allerAuGroupe,
  PARTIE_1_AMBULANCE,
  PARTIE_1_SANS_MOTIF,
} from "./parcours";

const Q1 = /^concernant son déplacement, le patient/i;
const PROFESSIONNEL = /prise en charge spécifique/i;

// Sans cette réponse, A2.3 se règle par défaut sur « Non » et le parcours conclut
// à une prestation non prise en charge : il n'atteint ni A4.5 ni A3.2.
const PRESTATION_PRISE_EN_CHARGE: Reponse = [
  /à l’origine du déplacement/i,
  /^oui$/i,
];

type Cas = {
  spec: string;
  regle: string;
  depuis: "prescripteur" | "secretariat";
  // La forme du champ : un groupe de réponses — le cas courant — ou une saisie,
  // qui n'a pas de `fieldset` et porte sa phrase indicative dans son étiquette.
  forme?: "groupe" | "saisie";
  // L'énoncé de la question, tel que le modèle le fixe.
  question: string;
  // La phrase indicative attendue sous cet énoncé.
  information: string;
  // Ce qu'il faut répondre en chemin pour que la branche s'ouvre.
  reponses: Reponse[];
  // La Partie 1 à passer au secrétariat, quand l'ambulance par défaut ferme la
  // branche : A2.4 ne se pose qu'à défaut d'un motif ouvrant droit.
  partie1?: Record<string, string>;
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
      "Sélectionnez tous les cas concernés. Le seul fait que le patient bénéficie d’une ALD (Affection de Longue Durée) ne suffit pas : les soins ou examens à l’origine du déplacement doivent concerner son traitement, son suivi ou ses conséquences. Si une séance est liée à cette ALD (Affection de Longue Durée), sélectionnez les deux réponses correspondantes.",
    reponses: [],
  },
  {
    spec: "M1.1",
    regle: "p2_contexte_administratif",
    depuis: "secretariat",
    question: "Dans quel contexte le déplacement est-il réalisé ?",
    information:
      "Plusieurs choix sont possibles. Sélectionnez toutes les réponses correspondant à la situation du patient. Une consultation externe ou un rendez-vous de soins, même réalisé dans un établissement de santé, ne constitue pas une hospitalisation.",
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
    regle: "p2_convocation_ou_avis_type",
    depuis: "secretariat",
    question:
      "Le déplacement est-il lié à l’un des cas réglementaires suivants ?",
    information:
      "Dans ces situations, la convocation ou l’avis tient lieu de prescription médicale de transport. Une convocation à une consultation médicale ou à un rendez-vous de soins habituel dans un établissement de santé n’est pas concernée.",
    // A0.1 répondue « Non » ouvre le parcours standard, et c'est la réponse par
    // défaut d'un oui/non : rien à cibler en chemin.
    reponses: [],
  },
  {
    spec: "A2.3",
    regle: "p2_prestation_prise_en_charge_assurance_maladie",
    depuis: "secretariat",
    question:
      "La consultation, le soin, l’examen ou la prestation à l’origine du déplacement est-il pris en charge par l’Assurance Maladie dans le cadre concerné ?",
    information:
      "Seuls les consultations, soins, examens ou prestations tarifés et pris en charge par l’Assurance Maladie peuvent ouvrir droit à la prise en charge du transport. Le fait que le déplacement soit lié à une ALD (Affection de Longue Durée) ou réalisé dans un établissement de santé ne suffit pas.",
    reponses: [],
  },
  {
    // La v9.5.1 ajoute la définition validée du dispositif, au même mot que
    // celle d'A3.4 : le prescripteur doit la lire là où la question se pose,
    // qu'elle vienne tôt ou tard dans le parcours.
    spec: "A2.4",
    regle: "p2_engagement_maternite_entree",
    depuis: "secretariat",
    partie1: PARTIE_1_SANS_MOTIF,
    question:
      "Le déplacement relève-t-il du dispositif Engagement maternité pour une patiente domiciliée à plus de 45 minutes de la maternité adaptée recommandée par l’équipe soignante ?",
    information:
      "Le dispositif Engagement maternité concerne les femmes enceintes résidant à plus de 45 minutes de la maternité la plus proche adaptée à leur situation. Il peut permettre la prise en charge d’un hébergement temporaire à proximité de cette maternité et des transports correspondants.",
    reponses: [PRESTATION_PRISE_EN_CHARGE],
  },
  {
    spec: "A4.5",
    regle: "p2_transport_urgence",
    depuis: "secretariat",
    question:
      "En dehors d’un transport par une équipe SMUR (Structure Mobile d’Urgence et de Réanimation), le transport doit-il être réalisé en urgence pour un motif médical attesté par le médecin prescripteur ?",
    information:
      "Un délai administratif insuffisant pour obtenir l’accord préalable ne constitue pas une urgence médicale.",
    reponses: [PRESTATION_PRISE_EN_CHARGE],
  },
  {
    spec: "A3.2",
    regle: "p2_nombre_transports_prevus",
    depuis: "secretariat",
    // Seule saisie chiffrée du questionnaire : elle n'a pas de `fieldset`, et sa
    // phrase indicative se lit dans l'étiquette du champ.
    forme: "saisie",
    question:
      "Combien de transports sont prévus au cours des 2 prochains mois pour ce même traitement ?",
    information:
      "Comptez séparément chaque aller et chaque retour. Par exemple, deux allers-retours correspondent à quatre transports.",
    reponses: [PRESTATION_PRISE_EN_CHARGE],
  },
  {
    spec: "A3.4",
    regle: "p2_situations_accord_prealable",
    depuis: "secretariat",
    question:
      "Le transport concerne-t-il une ou plusieurs des situations suivantes ?",
    information:
      "Le dispositif Engagement maternité concerne les femmes enceintes résidant à plus de 45 minutes de la maternité la plus proche adaptée à leur situation. Il peut permettre la prise en charge d’un hébergement temporaire à proximité de cette maternité et des transports correspondants. Sélectionnez toutes les réponses correspondant à la situation du patient.",
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
    const indication = screen.getByText(cas.information);
    expect(indication).toHaveClass("fr-hint-text");
    // Entre l'énoncé et la réponse, jamais relégué ailleurs dans le formulaire :
    // dans la légende du groupe, ou dans l'étiquette de la saisie.
    if (cas.forme === "saisie") {
      const champ = screen.getByLabelText(motif(cas.question));
      expect(indication.closest("label")).toHaveAttribute("for", champ.id);
    } else {
      const groupe = screen.getByRole("group", { name: motif(cas.question) });
      expect(groupe.querySelector("legend")).toContainElement(indication);
    }
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
    emettrePassation(cas.partie1 ?? PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
  }
  if (cas.forme === "saisie") await allerAuChampNombre(user, cas.reponses);
  else await allerAuGroupe(user, motif(cas.question), cas.reponses);
  return user;
}
