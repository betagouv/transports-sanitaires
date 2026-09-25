// Le fait déjà connu de la mosaïque de convocation (CONV-AP) — contrat v9.7.1,
// précisé en v9.7.2 (`CONTRAT-RESULTATS-v9-7-2.md` § 4). Identifiants du
// livrable : `RETOURS972-FAIT-CONNU-LIBELLES-ET-FILTRE`,
// `RETOURS972-FAIT-INCONNU-AUCUNE-ORDINAIRE`,
// `INDEPENDANT972-FAIT-CONNU-AUCUNE-AUTRE-PRESERVE-AVION`,
// `INDEPENDANT972-AIR-INCONNU-CONSERVE-TROIS-CHOIX-SANS-DEFAULT`.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { evaluerLeCas } from "./livrable-v9-7-3";
import { allerAuGroupe, PARTIE_1_AMBULANCE, type Reponse } from "./parcours";
import { DAP } from "./situations-v9-7-3";

beforeEach(() => sessionStorage.clear());

const CARACTERISTIQUES = /caractéristiques suivantes/i;
const FAIT_CONNU =
  /le transport en avion ou bateau de ligne régulière est déjà déclaré/i;
const OPTION_AVION =
  /^un transport en avion ou en bateau de ligne régulière\.$/i;

const VIA_TRANSFERT_QUALIFIE: Reponse[] = [
  [/raison principale/i, /transfert d’un patient hospitalisé/i],
  [/transfert.*en cours/i, /^oui$/i],
];
const CONVOCATION: Reponse = [
  /cas réglementaires/i,
  /convocation du contrôle médical/i,
];
const AVION_DEJA_DECLARE: Reponse = [/^transport par avion ou par bateau\.$/i];

describe("RETOURS972-FAIT-CONNU — la mosaïque de convocation", () => {
  it("RETOURS972-FAIT-CONNU-LIBELLES-ET-FILTRE affiche le fait, masque l’option, renomme « aucune »", async () => {
    emettrePassation(PARTIE_1_AMBULANCE);
    const user = userEvent.setup({ delay: null });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await allerAuGroupe(user, CARACTERISTIQUES, [
      ...VIA_TRANSFERT_QUALIFIE,
      AVION_DEJA_DECLARE,
      CONVOCATION,
    ]);

    expect(screen.getByText(FAIT_CONNU)).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: OPTION_AVION }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /aucune autre de ces situations/i }),
    ).toBeInTheDocument();
  }, 40_000);

  it("RETOURS972-FAIT-INCONNU-AUCUNE-ORDINAIRE laisse les trois choix, sans fait ni renommage", async () => {
    emettrePassation(PARTIE_1_AMBULANCE);
    const user = userEvent.setup({ delay: null });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    // Sans transfert qualifié, la convocation s'atteint par le parcours
    // standard : `p2_exception_avion_bateau` n'est jamais applicable, donc
    // jamais connue.
    await allerAuGroupe(user, CARACTERISTIQUES, [CONVOCATION]);

    expect(screen.queryByText(FAIT_CONNU)).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: OPTION_AVION }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /^aucune de ces situations$/i }),
    ).toBeInTheDocument();
  }, 40_000);
});

describe("INDEPENDANT972-FAIT-CONNU-AUCUNE-AUTRE-PRESERVE-AVION — le moteur", () => {
  it("garde le fait aérien pour motif de DAP même quand « aucune autre » est cochée", () => {
    // Le fait n'est jamais écrit dans `p2_convocation_avion_bateau` (l'option
    // masquée) : c'est `p2_convocation_avion_bateau_effectif`, qui combine la
    // case et l'exception, qui le porte au moteur.
    const moteur = evaluerLeCas({
      overrides: {
        p2_convocation_ou_avis_type:
          "'Convocation du contrôle médical de l’Assurance Maladie.'",
      },
      reason:
        "Transfert d’un patient hospitalisé vers un autre établissement de santé",
      transfer: true,
      exceptions: { p2_exception_avion_bateau: "oui" },
      convocationCharacteristics: { p2_convocation_aucune: "oui" },
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
    expect(
      moteur.evaluate("p2_convocation_avion_bateau_effectif").nodeValue,
    ).toBe(true);
    expect(moteur.evaluate("cible_dap_motif_avion_bateau").nodeValue).toBe(
      true,
    );
  });
});
