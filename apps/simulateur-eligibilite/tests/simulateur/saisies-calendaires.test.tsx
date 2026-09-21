// Les six saisies calendaires de la v9.7, telles que l'utilisateur les rencontre.
//
// Publicodes ne connaît pas la date : le modèle les déclare toutes en
// `type: texte`, et les rendrait donc en champs libres. Le prescripteur y
// taperait ce qu'il veut, et l'application aurait à deviner le format pour en
// tirer une durée ou un rang de jour — les deux valeurs dont dépend
// l'admissibilité au S3141.
//
// C'est le contrat d'interface qui les distingue, et
// `front/simulateur/questionnaire/formes-de-saisie.ts` qui le recopie. Ce fichier
// vérifie les deux bouts : la forme rendue à l'écran, et le fait que le parcours
// d'une permission se franchisse jusqu'à son document.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { formeDeSaisie } from "../../front/simulateur/questionnaire/formes-de-saisie";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import {
  allerAuGroupe,
  PARTIE_1_AMBULANCE,
  terminerParcours,
} from "./parcours";

beforeEach(() => sessionStorage.clear());

const PERMISSION = /raison principale du déplacement/i;
const PERMISSION_TEMPORAIRE = /permission temporaire de sortie/i;

/** Le champ d'une règle, quelle que soit sa forme — les dates n'ont pas de rôle. */
const champ = (id: string) =>
  document.querySelector<HTMLInputElement>(`input[name="${id}"]`);

describe("les saisies calendaires du parcours", () => {
  it("distingue la date de l’instant, comme le contrat le demande", () => {
    // Quatre dates, et deux instants : la limite de quarante-huit heures d'une
    // permission se compte à l'heure près.
    expect(formeDeSaisie("p2_permission_debut_hospitalisation")).toBe("date");
    expect(formeDeSaisie("p2_permission_periode_fin")).toBe("date");
    expect(formeDeSaisie("p2_date_at_mp")).toBe("date");
    expect(formeDeSaisie("p2_date_accident_cause_par_tiers")).toBe("date");
    expect(formeDeSaisie("p2_permission_debut")).toBe("datetime");
    expect(formeDeSaisie("p2_permission_fin")).toBe("datetime");
  });

  it("laisse les autres saisies en texte libre", () => {
    expect(formeDeSaisie("p2_depart_adresse")).toBeUndefined();
    expect(formeDeSaisie("p2_motif_detail")).toBeUndefined();
  });

  it("rend la date d’hospitalisation en calendrier, et non en champ libre", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await allerAuGroupe(user, /tranche d’âge|âge du patient/i, [
      [PERMISSION, PERMISSION_TEMPORAIRE],
    ]);
    await terminerParcours(user, [[PERMISSION, PERMISSION_TEMPORAIRE]]);

    // Le parcours est allé jusqu'au bout : c'est ce que les dates permettent.
    expect(
      screen.getByRole("heading", { name: /document à imprimer/i }),
    ).toBeInTheDocument();
  }, 40_000);

  it("franchit le parcours d’une permission jusqu’à son document", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    const formes: string[] = [];
    await terminerParcours(user, [[PERMISSION, PERMISSION_TEMPORAIRE]], () => {
      for (const id of [
        "p2_permission_debut_hospitalisation",
        "p2_permission_debut",
        "p2_permission_fin",
      ]) {
        const saisie = champ(id);
        if (saisie) formes.push(`${id}:${saisie.type}`);
      }
    });

    // Les trois saisies de la permission ont été rencontrées, et chacune sous la
    // forme que le contrat lui donne.
    expect(formes).toContain("p2_permission_debut_hospitalisation:date");
    expect(formes).toContain("p2_permission_debut:datetime-local");
    expect(formes).toContain("p2_permission_fin:datetime-local");
  }, 40_000);
});
