// La couleur des deux pages de résultat, telle que le modèle la décide.
//
// Elle se lisait dans le code : une table tenue à la main sur le Résultat 2, et
// des teintes « succès » ou « erreur » choisies au jugé sur le Résultat 1. La
// table avait dérivé — elle rendait un transport à la charge de l'établissement
// en orange quand le contrat le veut vert —, et le Résultat 1 disait par sa
// couleur un accord ou un refus qu'il ne tranche pas.
//
// La v9.7 porte les deux en cibles, et c'est tout l'objet de ce fichier : que
// l'écran n'en décide plus rien. Le Résultat 1 est toujours bleu ; le Résultat 2
// est vert quand un document est dû, bleu pour un accord préalable comme pour un
// refus.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { evaluerLeCas, type OptionsDuLivrable } from "./livrable-v9-7";
import { moteurDeTest } from "./moteur";

beforeEach(() => sessionStorage.clear());

/** Les sept cas finaux, et la situation qui mène à chacun. */
const CAS: ReadonlyArray<[casFinal: string, options: OptionsDuLivrable]> = [
  [
    "prescription médicale de transport",
    { reason: "Entrée en hospitalisation" },
  ],
  ["demande d’accord préalable", { distance: 2 }],
  ["prescription S3141", { reason: "Permission temporaire de sortie" }],
  ["transport à la charge de l’établissement", { transfer: true }],
  [
    "convocation ou avis d’audience",
    {
      reason: "Entrée en hospitalisation",
      overrides: {
        p2_convocation_ou_avis_type:
          "'Convocation du contrôle médical de l’Assurance Maladie.'",
      },
    },
  ],
  [
    "permission de sortie sans motif médical",
    {
      reason: "Permission temporaire de sortie",
      age: "20 ans ou plus",
      permissionCadre: "Demande du patient sans justification médicale",
    },
  ],
  ["non éligible à une prise en charge par l’Assurance Maladie", {}],
];

describe("la couleur du Résultat 2 vient du modèle", () => {
  it.each(CAS)("%s", (casFinal, options) => {
    const moteur = evaluerLeCas(options);
    expect(moteur.evaluate("cible_cas_final").nodeValue, "cas final").toBe(
      casFinal,
    );
    // Vert quand un document est dû, bleu sinon : c'est la règle du contrat, et
    // le seul endroit où elle est écrite.
    const documentDu =
      casFinal !== "demande d’accord préalable" &&
      !casFinal.startsWith("non éligible") &&
      !casFinal.startsWith("permission de sortie");
    expect(moteur.evaluate("cible_resultat_2_couleur").nodeValue).toBe(
      documentDu ? "vert" : "bleu",
    );
  });

  it("rend cette couleur à l’écran, sans table intermédiaire", () => {
    // Un transport à la charge de l'établissement : vert au contrat, et c'est le
    // cas que l'ancienne table rendait en orange.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p2_raison_principale:
            "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
          p2_transfert_en_cours: "oui",
          p2_nature_transfert: "'Définitif'",
        }}
      />,
    );

    const verdict = screen
      .getByRole("heading", {
        name: /relève du financement de l’établissement/i,
      })
      .closest(".fr-alert");
    expect(verdict).toHaveClass("fr-alert--success");
  });
});

describe("le Résultat 1 est toujours bleu", () => {
  it("le modèle ne lui laisse aucune autre couleur", () => {
    // Une seule valeur, et sans variation : le Résultat 1 ne tranche que le mode
    // médical, et une teinte verte ou rouge y ferait lire un accord ou un refus.
    const brut = moteurDeTest({}).getRule("cible_resultat_1_couleur").rawNode;
    expect((brut as { valeur?: unknown }).valeur).toBe("'bleu'");
  });
});
