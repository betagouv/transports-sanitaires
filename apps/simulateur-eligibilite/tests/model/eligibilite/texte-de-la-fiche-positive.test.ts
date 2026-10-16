// Le texte de la fiche patient positive (#135), pour `ISSUE_PMT` et
// `ISSUE_S3141` : titres, cartes et badges. Des traces écrites à la main : rien
// n'y est prouvé, sauf ce que le test pose. Les attendus sont recopiés du
// catalogue de l'éditeur, que l'on ne relit pas ici.

import { describe, expect, it } from "vitest";
import {
  CIBLES_ENUMEREES,
  type Cibles,
} from "../../../front/models/eligibilite/declarations/cibles";
import {
  AMBULANCE,
  badges,
  carteDuCatalogue,
  carteRetenue,
  fiche,
  NON_PARTAGE,
  PARTAGE,
  pmt,
  TAP,
  TPMR,
} from "./fiches-du-test";

describe("un titre et un modus pour chaque mode que les règles donnent", () => {
  const variantes: Partial<Cibles>[] = [
    { cible_mode_id: "VEHICULE_PERSONNEL" },
    { cible_mode_id: "VEHICULE_PERSONNEL", cible_personne_accompagnante: true },
    { cible_mode_id: "TRANSPORT_COMMUN" },
    { cible_mode_id: "TRANSPORT_COMMUN", cible_personne_accompagnante: true },
    ...[NON_PARTAGE, PARTAGE, {}].flatMap((partage) => [
      { ...TAP, ...partage },
      { ...TPMR, ...partage },
    ]),
    ...[false, true].flatMap((fauteuil) =>
      [false, true].map((bari) => ({
        ...AMBULANCE,
        cible_fauteuil_roulant: fauteuil,
        cible_ambulance_equipement_bariatrique: bari,
      })),
    ),
  ];

  it("couvre toutes les valeurs de cible_mode_id", () => {
    const modes = new Set(variantes.map(({ cible_mode_id }) => cible_mode_id));
    expect([...modes].sort()).toEqual(
      [...CIBLES_ENUMEREES.cible_mode_id].sort(),
    );
  });

  it.each(["ISSUE_PMT", "ISSUE_S3141"] as const)(
    "%s : chaque variante a sa fiche, sans emplacement resté vide",
    (issue) => {
      for (const cibles of variantes) {
        const texte = fiche(cibles, { permissionRepeated: false }, issue);
        const tout = JSON.stringify(texte);
        expect(texte?.titreDuPatient, JSON.stringify(cibles)).toBeTruthy();
        expect(texte?.consignes.etapes.length).toBeGreaterThan(0);
        expect(tout).not.toMatch(
          /\[motif_Administratif\]|\[badges\]|\{[a-z_]+\}/,
        );
      }
    },
  );

  it("n'écrit rien quand les règles n'ont pas donné de mode", () => {
    expect(fiche({})).toBeUndefined();
  });
});

describe("les titres", () => {
  it("PMT : un transport sanitaire, ou la prise en charge du proche", () => {
    expect(fiche(TAP)?.titreDuPatient).toBe(
      "Vous êtes éligible à un transport sanitaire",
    );
    expect(fiche(TAP)?.titreDuPrescripteur).toBe(
      "Votre patient est éligible à un transport sanitaire",
    );
    expect(fiche({ cible_mode_id: "VEHICULE_PERSONNEL" })?.titreDuPatient).toBe(
      "Vous êtes éligible à une prise en charge de votre transport",
    );
  });

  it("S3141 : le titre dit la permission de sortie", () => {
    expect(
      fiche(TAP, { permissionRepeated: false }, "ISSUE_S3141"),
    ).toMatchObject({
      titreDuPatient:
        "Vous êtes éligible à un transport sanitaire pour une permission de sortie",
      titreDuPrescripteur:
        "Votre patient est éligible à un transport sanitaire pour une permission de sortie",
    });
    expect(
      fiche(
        { cible_mode_id: "VEHICULE_PERSONNEL" },
        { permissionRepeated: false },
        "ISSUE_S3141",
      )?.titreDuPatient,
    ).toBe(
      "Vous êtes éligible à une prise en charge de votre transport pour une permission de sortie",
    );
  });
});

describe("la carte de la situation du patient", () => {
  it("TAP non partagé, critères 1 et 5 : la carte détaillée remplace la fixe", () => {
    const texte = fiche({ ...TAP, ...NON_PARTAGE }, { criteres: [1, 5] });
    expect(texte?.cartes.map(({ retenue }) => retenue)).toEqual([
      false,
      true,
      false,
    ]);
    expect(carteRetenue(texte)?.texte).toBe(
      carteDuCatalogue("C-TAP-NONPARTAGE-15"),
    );
  });

  it("TAP partageable, critère 1 : la carte du partage", () => {
    expect(
      carteRetenue(fiche({ ...TAP, ...PARTAGE }, { criteres: [1] }))?.texte,
    ).toBe(carteDuCatalogue("C-TAP-PARTAGE-1"));
  });

  it("TAP dont le partage n'est pas prouvé : la carte fixe, qui n'en dit rien", () => {
    expect(carteRetenue(fiche(TAP, { criteres: [1] }))?.texte).toBe(
      pmt.fixedCards[1]?.text,
    );
  });

  it("TPMR : le fauteuil s'ajoute aux critères de la carte", () => {
    expect(
      carteRetenue(fiche({ ...TPMR, ...NON_PARTAGE }, { criteres: [1] }))
        ?.texte,
    ).toBe(carteDuCatalogue("C-TPMR-NONPARTAGE-1"));
  });

  it("ambulance avec fauteuil : la carte du fauteuil", () => {
    const texte = fiche(
      { ...AMBULANCE, cible_fauteuil_roulant: true },
      { criteres: [8] },
    );
    expect(carteRetenue(texte)?.texte).toBe(
      carteDuCatalogue("C-AMB-FAUTEUIL-8"),
    );
  });

  it("ambulance bariatrique : la carte de la corpulence", () => {
    const texte = fiche(
      { ...AMBULANCE, cible_ambulance_equipement_bariatrique: true },
      { criteres: [7, 9] },
    );
    expect(carteRetenue(texte)?.texte).toBe(
      carteDuCatalogue("C-AMB-CORPULENCE-7-9"),
    );
  });

  it("ambulance : les critères 1 à 5 de Q1.2 ne comptent pas", () => {
    expect(carteRetenue(fiche(AMBULANCE, { criteres: [1, 5, 7] }))?.texte).toBe(
      carteDuCatalogue("C-AMB-7"),
    );
  });

  it("ambulance dont la carte n'existe pas : la carte fixe", () => {
    const sans = fiche(AMBULANCE, { criteres: [] });
    expect(carteRetenue(sans)?.texte).toBe(pmt.fixedCards[2]?.text);
  });

  it("véhicule personnel ou proche : la carte fixe du premier rang", () => {
    const texte = fiche({
      cible_mode_id: "VEHICULE_PERSONNEL",
      cible_personne_accompagnante: true,
    });
    expect(texte?.cartes.map(({ retenue }) => retenue)).toEqual([
      true,
      false,
      false,
    ]);
    expect(carteRetenue(texte)?.titre).toBe(
      "Véhicule personnel ou transports en commun",
    );
  });
});

describe("les badges des besoins à signaler", () => {
  it("TAP non partagé, critères 1 et 5", () => {
    expect(
      badges(fiche({ ...TAP, ...NON_PARTAGE }, { criteres: [1, 5] })),
    ).toEqual([
      "Transport non partagé",
      "Aide professionnelle pour se déplacer",
      "Risque de malaise ou de complications pendant le trajet",
    ]);
  });

  it("n'écrit pas « non partagé » quand le partage n'est pas prouvé", () => {
    expect(badges(fiche({ ...TAP, ...PARTAGE }, { criteres: [1] }))).toEqual([
      "Aide professionnelle pour se déplacer",
    ]);
    expect(badges(fiche(TAP, { criteres: [1] }))).toEqual([
      "Aide professionnelle pour se déplacer",
    ]);
  });

  it("TPMR : le fauteuil d'abord, sans transfert ; le critère 2 sans le fauteuil", () => {
    expect(
      badges(fiche({ ...TPMR, ...NON_PARTAGE }, { criteres: [1, 2] })),
    ).toEqual([
      "Transport non partagé",
      "Transport en fauteuil roulant, sans transfert",
      "Aide professionnelle pour se déplacer",
      "Assistance pour monter ou descendre du véhicule",
    ]);
  });

  it("ambulance avec fauteuil et corpulence, critères 7 et 8", () => {
    expect(
      badges(
        fiche(
          {
            ...AMBULANCE,
            cible_fauteuil_roulant: true,
            cible_ambulance_equipement_bariatrique: true,
          },
          { criteres: [7, 8] },
        ),
      ),
    ).toEqual([
      "Utilisation d’un fauteuil roulant",
      "Transport bariatrique",
      "Position allongée ou demi-assise nécessaire",
      "Brancardage ou portage nécessaire",
    ]);
  });

  it("ambulance : le non-partage et les critères 1 à 5 n'y sont pas", () => {
    expect(
      badges(fiche({ ...AMBULANCE, ...NON_PARTAGE }, { criteres: [1, 5, 7] })),
    ).toEqual(["Position allongée ou demi-assise nécessaire"]);
  });

  it("véhicule personnel : aucun badge, et la puce des besoins disparaît", () => {
    const texte = fiche(
      { cible_mode_id: "VEHICULE_PERSONNEL" },
      { criteres: [1] },
    );
    expect(badges(texte)).toEqual([]);
    expect(JSON.stringify(texte)).not.toContain("besoins particuliers");
  });

  it("sans critère, la puce des besoins du TAP disparaît", () => {
    expect(JSON.stringify(fiche(TAP))).not.toContain("besoins particuliers");
  });

  it("l'ALD et le mineur ne créent pas de badge", () => {
    const texte = fiche({
      ...TAP,
      cible_ald_juridiquement_qualifiante_3_ou_4_degres: true,
      cible_mineur_ald_non_exonerante_reconnue: true,
    });
    expect(badges(texte)).toEqual([]);
  });
});
