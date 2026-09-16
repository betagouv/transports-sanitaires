// La permission temporaire de sortie, sujet neuf de la v9.7.
//
// Elle n'existait pas comme parcours : la v9.5.1 la cochait en M0, sans autre
// suite qu'un refus. La v9.7 lui donne une raison principale, un âge, des dates,
// un cadre, et un formulaire à elle — le S3141, qui devient le septième cas final.
//
// Trois choses la décident, et ce sont elles que la matrice du livrable croise :
// l'âge du patient, le rang du jour de sortie dans l'hospitalisation, et la durée
// de la permission. Deux d'entre elles sont calculées par l'application
// (`entrees-calculees.ts`), et c'est pourquoi ce fichier passe par les mêmes
// dates que le livrable plutôt que par des valeurs directes.
//
// Les identifiants sont ceux du livrable : PERMISSION-S3141, PERMISSION-LONGUE,
// PERMISSION-SEUIL-*, PERMISSION-PATIENT.

import { describe, expect, it } from "vitest";
import { evaluerLeCas, type OptionsDuLivrable } from "./livrable-v9-7-2";
import { CHARGE_ETABLISSEMENT, DAP, S3141 } from "./situations-v9-7-2";

const PERMISSION: OptionsDuLivrable = {
  reason: "Permission temporaire de sortie",
};

describe("modèle v9.7 — la permission temporaire de sortie", () => {
  it("PERMISSION-S3141 — ouvre le droit sur son propre formulaire", () => {
    const moteur = evaluerLeCas(PERMISSION);
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(S3141);
    // Un aller-retour compte deux trajets : quatre par mois en font huit.
    expect(moteur.evaluate("cible_s3141_nombre_trajets_mois").nodeValue).toBe(
      8,
    );
  });

  it("PERMISSION-LONGUE — au-delà de 150 km, la DAP reprend la main", () => {
    const moteur = evaluerLeCas({ ...PERMISSION, distance: 2 });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
  });

  it("PERMISSION-PATIENT — sans justification médicale, elle reste à sa charge", () => {
    const moteur = evaluerLeCas({
      ...PERMISSION,
      age: "20 ans ou plus",
      permissionCadre: "Demande du patient sans justification médicale",
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      "permission de sortie sans motif médical",
    );
    expect(moteur.evaluate("cible_resultat_2_couleur").nodeValue).toBe("bleu");
  });
});

// PERMISSION-SEUIL : le rang du jour et l'âge, croisés.
//
// Le S3141 s'ouvre au quatorzième jour d'hospitalisation — convention que le
// livrable dit **provisoire**, R.322-10-8 parlant « à compter du quatorzième
// jour » quand le formulaire dit « plus de 14 jours ». L'éditeur attend une
// confirmation de la CNAM ; nous la portons dans `entrees-calculees.ts`, à un
// seul endroit.
//
// Vingt ans referme la branche : la permission redevient un transport à la charge
// de l'établissement, quel que soit le jour.
const SEUILS: ReadonlyArray<[age: string, jour: number, attendu: string]> = [
  ["Moins de 16 ans", 13, CHARGE_ETABLISSEMENT],
  ["Moins de 16 ans", 14, S3141],
  ["Moins de 16 ans", 15, S3141],
  ["De 16 à 19 ans", 13, CHARGE_ETABLISSEMENT],
  ["De 16 à 19 ans", 14, S3141],
  ["De 16 à 19 ans", 15, S3141],
  ["20 ans ou plus", 13, CHARGE_ETABLISSEMENT],
  ["20 ans ou plus", 14, CHARGE_ETABLISSEMENT],
  ["20 ans ou plus", 15, CHARGE_ETABLISSEMENT],
];

/** Le jour de sortie qui donne ce rang, l'hospitalisation ayant commencé le 1er août. */
function sortieAuRang(rang: number): string {
  const debut = new Date("2026-08-01T00:00:00Z");
  debut.setUTCDate(debut.getUTCDate() + rang - 1);
  return `${debut.toISOString().slice(0, 10)}T10:00:00+02:00`;
}

describe("PERMISSION-SEUIL — le quatorzième jour, et les vingt ans", () => {
  it.each(SEUILS)("%s, jour %i", (age, jour, attendu) => {
    const debut = sortieAuRang(jour);
    const moteur = evaluerLeCas({
      ...PERMISSION,
      age,
      hospital: "2026-08-01",
      permissionStart: debut,
      permissionEnd: debut.replace("T10:00", "T18:00"),
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(attendu);
  });
});
