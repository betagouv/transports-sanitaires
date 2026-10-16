// Le modèle de l'éditeur déroulé dans le formulaire du socle, comme à l'écran.
//
// Les autres tests du modèle appellent le moteur du questionnaire sans écran,
// et ceux du socle éprouvent chaque mécanisme sur des pages écrites pour eux.
// Ceux-ci vérifient l'assemblage : les conditions du modèle, lues par le
// formulaire, avec son brouillon, son avance automatique et ses blocages. Ils
// sont peu nombreux à dessein : un parcours par mécanisme de P2.

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { model } from "../../../front/models/eligibilite";
import { QuestionnaireForm } from "../../../front/socle/questionnaire-engine/QuestionnaireForm";

const Q11 = /^Concernant son déplacement/;
const Q13 = /^Avant d’établir le mode de transport/;
const Q21 = /^Quelle situation médicale ou quel événement/;
const Q21F = /^Les séances sélectionnées motivent-elles/;
const Q21G = /^S’agit-il d’une entrée dans un établissement/;
const Q221 = /^L’une de ces situations correspond-elle aussi/;
const Q221B = /^Laquelle ou lesquelles de ces situations/;
const Q231 = /^Quelle distance parcourra le patient/;
const Q25 = /^S’agit-il d’un transfert entre établissements/;
const Q26A = /^Le transfert est-il définitif ou provisoire/;
const Q26 = /^Quelle situation précise et quelles exceptions/;
const Q27 = /^Dans quelle tranche d’âge se situe le patient/;
const Q284 = /^Cette permission a-t-elle été autorisée/;
const Q284A = /^Quel est le cadre de cette permission/;
const Q285 = /^La prescription couvre-t-elle plusieurs permissions/;
const Q286B = /^Le patient restera-t-il âgé de moins de 20 ans/;
const Q210 = /^Quelle convocation, quel avis d’audience/;
const Q210A = /^Le fournisseur est-il agréé/;
const Q210B = /^Quel appareillage est concerné/;
const HOSPITALISE = /^Le patient est déjà hospitalisé pendant ce trajet/;

function afficherLeQuestionnaire(onComplete: () => void = () => {}) {
  render(
    <QuestionnaireForm
      parts={model.transportAndEligibility.parts}
      partCount={3}
      endLabel="Voir le résultat"
      tracked={false}
      onComplete={onComplete}
    />,
  );
  return userEvent.setup();
}

const page = (question: RegExp) =>
  screen.findByRole("group", { name: question });
const choisir = (user: ReturnType<typeof userEvent.setup>, reponse: RegExp) =>
  user.click(screen.getByRole("radio", { name: reponse }));
const cocher = (user: ReturnType<typeof userEvent.setup>, reponse: RegExp) =>
  user.click(screen.getByRole("checkbox", { name: reponse }));
const champ = (libelle: RegExp) => screen.getByLabelText(libelle);
const choisirDans = (
  user: ReturnType<typeof userEvent.setup>,
  question: RegExp,
  reponse: RegExp,
) =>
  user.click(
    within(screen.getByRole("group", { name: question })).getByRole("radio", {
      name: reponse,
    }),
  );
const suivant = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Suivant" }));

// Q0.1, puis Q1.1 avec un professionnel, Q1.2 avec ces critères.
async function avecUnProfessionnel(
  user: ReturnType<typeof userEvent.setup>,
  criteres: readonly RegExp[],
) {
  await choisir(user, /^Vérifier une éligibilité/);
  await page(Q11);
  await choisir(user, /^Nécessite l’intervention d’un professionnel/);
  await page(/^Quelles aides ou conditions particulières/);
  for (const critere of criteres) await cocher(user, critere);
  await suivant(user);
  await page(Q13);
}

// Le parcours du mineur remplit une vingtaine de champs : sous la charge de la
// suite entière, il dépasse les 5 s par défaut.
const PARCOURS_LONG = 15_000;

describe("le modèle de l'éditeur, déroulé dans le formulaire", () => {
  it("révèle Q2.1.g sur la page de Q2.1, puis passe aux situations particulières", async () => {
    const user = afficherLeQuestionnaire();
    await choisir(user, /^Vérifier une éligibilité/);
    await page(Q11);
    await choisir(user, /^Peut se déplacer seul/);
    await page(Q13);
    await cocher(user, /^Aucune de ces situations/);
    await suivant(user);
    await page(/^Le patient pouvant réaliser le trajet/);
    await choisir(user, /^Véhicule personnel/);
    await page(Q21);

    await choisir(user, /^Entrée ou sortie d’hospitalisation/);
    expect(await page(Q21G)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: Q21 })).toBeInTheDocument();

    await choisir(user, /^Une entrée dans un établissement de santé/);
    expect(await page(Q221)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: HOSPITALISE })).toBeNull();
  });

  it("saute Q2.1 quand le brancard prouve le motif", async () => {
    const user = afficherLeQuestionnaire();
    await avecUnProfessionnel(user, [/^Nécessite un brancardage/]);
    await cocher(user, /^Aucune de ces situations/);
    await suivant(user);

    expect(await page(Q221)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: Q21 })).toBeNull();
  });

  it("précise l'autre situation sur la page de Q2.2.1, avant le trajet", async () => {
    const user = afficherLeQuestionnaire();
    await avecUnProfessionnel(user, [/^Nécessite un brancardage/]);
    await cocher(user, /^Aucune de ces situations/);
    await suivant(user);
    await page(Q221);

    await cocher(user, /^Une autre situation particulière/);
    expect(await page(Q221B)).toBeInTheDocument();
    await suivant(user);
    expect(screen.queryByRole("group", { name: Q231 })).toBeNull();

    await cocher(user, /^À un accident du travail/);
    await suivant(user);
    expect(await page(Q231)).toBeInTheDocument();
  });

  it("bloque sur Q2.1.f quand les séances ne sont pas le même déplacement", async () => {
    const user = afficherLeQuestionnaire();
    await avecUnProfessionnel(user, [
      /^Ne peut pas se déplacer de manière autonome/,
    ]);
    await cocher(user, /séance de chimiothérapie/);
    await cocher(user, /séance de radiothérapie/);
    await suivant(user);
    await page(Q21F);
    expect(screen.queryByRole("group", { name: Q21 })).toBeNull();

    await choisir(user, /^Non, il s’agit de déplacements/);
    expect(
      await screen.findByText(/une simulation par déplacement/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: Q231 })).toBeNull();

    await choisir(user, /^Oui, il s’agit du même déplacement/);
    expect(await page(Q221)).toBeInTheDocument();
  });

  it("pose le type du transfert, puis ses exceptions, après le trajet", async () => {
    const user = afficherLeQuestionnaire();
    await choisir(user, /^Vérifier une éligibilité/);
    await page(Q11);
    await choisir(user, /^Peut se déplacer seul/);
    await page(Q13);
    await cocher(user, /^Aucune de ces situations/);
    await suivant(user);
    await page(/^Le patient pouvant réaliser le trajet/);
    await choisir(user, /^Véhicule personnel/);
    await page(Q21);
    await choisir(user, /^Transfert entre établissements/);
    await page(Q221);
    await cocher(user, /^Aucune de ces situations/);
    await suivant(user);
    await page(Q231);
    await choisir(user, /^50 km ou moins/);
    await suivant(user);

    await page(Q25);
    await choisir(user, /^Oui, il s’agit d’un transfert/);
    expect(await page(Q26A)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: Q26 })).toBeNull();

    await choisir(user, /^Définitif/);
    expect(await page(Q26)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /^Admission dans le nouvel/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /^Transfert <48/ }),
    ).toBeNull();

    await cocher(user, /^Aucune de ces exceptions/);
    expect(
      await screen.findByRole("button", { name: "Voir le résultat" }),
    ).toBeEnabled();
  });
  it(
    "pose la permission du mineur sur une page, et révèle la période quand il y en a plusieurs",
    async () => {
      const user = afficherLeQuestionnaire();
      await choisir(user, /^Vérifier une éligibilité/);
      await page(Q11);
      await choisir(user, /^Peut se déplacer seul/);
      await page(Q13);
      await cocher(user, /^Aucune de ces situations/);
      await suivant(user);
      await page(/^Le patient pouvant réaliser le trajet/);
      await choisir(user, /^Véhicule personnel/);
      await page(Q21);
      await choisir(user, /^Permission temporaire pendant l’hospitalisation/);
      await page(Q221);
      await cocher(user, /^Aucune autre situation/);
      await suivant(user);
      await page(Q231);
      await choisir(user, /^50 km ou moins/);
      await suivant(user);

      await page(Q27);
      await choisir(user, /^Moins de 16 ans/);
      await page(Q284);
      expect(
        screen.queryByLabelText(/^Quand se termine la période/),
      ).toBeNull();

      await user.type(champ(/^Depuis quelle date/), "2026-10-01");
      await user.type(champ(/^Quand commence la première/), "2026-10-14T09:00");
      await user.type(
        champ(/^Quand se termine cette première/),
        "2026-10-15T09:00",
      );
      await choisirDans(user, Q284, /^Oui\./);
      await choisirDans(user, Q284A, /^Elle est liée aux soins/);
      await choisirDans(user, Q285, /^Oui\./);

      expect(champ(/^Quand se termine la période/)).toBeInTheDocument();
      expect(champ(/^Une permission aller-retour/)).toBeInTheDocument();
      expect(screen.getByRole("group", { name: Q286B })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();

      await user.type(champ(/^Quand se termine la période/), "2026-12-01");
      await user.type(champ(/^Une permission aller-retour/), "2");
      await choisirDans(user, Q286B, /^Non\./);
      expect(
        await screen.findByText(
          /La période doit se terminer avant le vingtième/,
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();

      await choisirDans(user, Q286B, /^Oui\./);
      expect(
        await screen.findByRole("button", { name: "Voir le résultat" }),
      ).toBeEnabled();
    },
    PARCOURS_LONG,
  );

  it("pose la convocation après le trajet, et révèle l'agrément et l'appareillage sous l'option 6", async () => {
    const terminer = vi.fn();
    const user = afficherLeQuestionnaire(terminer);
    await choisir(user, /^Vérifier une éligibilité/);
    await page(Q11);
    await choisir(user, /^Peut se déplacer seul/);
    await page(Q13);
    await cocher(user, /^Aucune de ces situations/);
    await suivant(user);
    await page(/^Le patient pouvant réaliser le trajet/);
    await choisir(user, /^Véhicule personnel/);
    await page(Q21);
    await choisir(user, /^Convocation, expertise, audience/);
    await page(Q221);
    await cocher(user, /^Aucune autre situation/);
    await suivant(user);
    await page(Q231);
    await choisir(user, /^50 km ou moins/);
    await suivant(user);

    await page(Q210);
    expect(screen.queryByRole("group", { name: Q210A })).toBeNull();
    await choisir(user, /^Déplacement chez un fournisseur d’appareillage/);
    expect(await page(Q210A)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: Q210B })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Voir le résultat" }),
    ).toBeNull();

    await choisirDans(user, Q210A, /^Oui$/);
    await choisirDans(user, Q210B, /^Podo-orthèse$/);
    // Une page de choix uniques avance d'elle-même : c'est la dernière.
    await waitFor(() => expect(terminer).toHaveBeenCalledOnce());
  });
});
