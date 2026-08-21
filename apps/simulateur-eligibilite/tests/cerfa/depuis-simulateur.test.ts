// `saisiesDepuisSituation` : ce que le modèle permet de déduire du CERFA, et
// ce qu'il se garde d'inventer. Chaque cas part d'une situation complète et
// relit le PDF produit, plutôt que d'inspecter les saisies intermédiaires.

import { describe, expect, it } from "vitest";
import {
  MODE_TRANSPORT,
  PRESCRIPTION,
  SITUATION,
  TRAJET,
} from "../../front/outils-produit/beta/cerfa/pmt/champs-cerfa.ts";
import {
  CerfaNonApplicable,
  saisiesDepuisSituation,
} from "../../front/outils-produit/beta/cerfa/pmt/depuis-simulateur.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/pmt/remplir-cerfa.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import {
  AIDE_PROFESSIONNEL,
  GABARIT,
  HOSPITALISATION,
  PROCHE_ACCOMPAGNANT,
  relire,
  situation,
} from "./gabarit.ts";

describe("saisiesDepuisSituation", () => {
  it("coche l'ambulance et ses justifications, sans rien inventer d'autre", async () => {
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situation({
        p1_autonomie: AIDE_PROFESSIONNEL,
        p1_critere_position_allongee_demi_assise: "oui",
        p1_critere_brancardage_portage: "oui",
        ...HOSPITALISATION,
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      [SITUATION.entréeSortieHospitalisation.nom]: "/NON", // état d'export, pas « non »
      [MODE_TRANSPORT.positionAllongéeDemiAssise.nom]: "/On",
      [MODE_TRANSPORT.brancardagePortage.nom]: "/On",
    });
    // Justifications non retenues par le moteur : jamais cochées.
    expect(lu).not.toHaveProperty(MODE_TRANSPORT.oxygène.nom);
    expect(lu).not.toHaveProperty(MODE_TRANSPORT.asepsieRigoureuse.nom);
    // Le caractère exonérant de l'ALD n'est pas modélisé : la case reste vierge.
    expect(lu).not.toHaveProperty("ALD exo");
  });

  it("coche le transport assis et le fauteuil roulant pour un TPMR", async () => {
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situation({
        p1_autonomie: AIDE_PROFESSIONNEL,
        p1_critere_fauteuil_sans_transfert: "oui",
        ...HOSPITALISATION,
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      [MODE_TRANSPORT.assisProfessionnalisé.nom]: "/On",
      [MODE_TRANSPORT.fauteuilRoulantTPMR.nom]: "/On",
    });
  });

  it("coche l'accompagnant pour un transport en véhicule personnel", async () => {
    // La case suit `cible_accompagnant_necessaire`, réintroduite en v9.2.1 :
    // avant elle, l'application dérivait la valeur de Q1 pour son compte.
    const accompagné = saisiesDepuisSituation(
      moteurDeTest(),
      situation({ p1_autonomie: PROCHE_ACCOMPAGNANT, ...HOSPITALISATION }),
    );
    expect(await relire(await remplirCerfa(GABARIT, accompagné))).toMatchObject(
      { [MODE_TRANSPORT.accompagnantNécessaire.nom]: "/On" },
    );
  });

  it("reporte le trajet, l'urgence et l'accident issus de la Partie 2", async () => {
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situation({
        p1_autonomie: AIDE_PROFESSIONNEL,
        p1_critere_brancardage_portage: "oui",
        ...HOSPITALISATION,
        p2_trajet_aller_retour: "'aller-retour identique'",
        p2_trajet_depart: "'Domicile'",
        p2_trajet_arrivee:
          "'Une structure de soins différente du lieu de départ.'",
        p2_arrivee_nom_lieu: "'CH de Vannes'",
        p2_transport_urgence:
          "'Appel au SAMU (Service d’Aide Médicale Urgente) - Centre 15'",
        p2_nombre_transports_prevus: "3",
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      [TRAJET.allerRetour.nom]: "/On",
      [TRAJET.départDomicile.nom]: "/On",
      [TRAJET.nombreTransportsItératifs]: "3",
      [PRESCRIPTION.urgenceSamu.nom]: "/On",
      [SITUATION.accidentTiersNon.nom]: "/NON",
    });
    // L'arrivée est une structure de soins : on ne coche pas « domicile », et la
    // v9.1 permet d'écrire le lieu détaillé — nom, adresse, code postal, commune
    // aplatis sur l'unique ligne du formulaire.
    expect(lu).not.toHaveProperty(TRAJET.arrivéeDomicile.nom);
    expect(lu[TRAJET.arrivéeStructureSoins]).toBe(
      "CH de Vannes, 2 rue de l’Arrivée, 75002, Paris",
    );
  });

  it("aplatit le complément d'adresse et le pays sur la ligne du lieu", async () => {
    // Ces deux saisies sont facultatives et longtemps restées inatteignables :
    // aucune cible ne les portait, donc le questionnaire ne les posait pas. Elles
    // le sont depuis que le secrétariat cible les sorties document.
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situation({
        p1_autonomie: AIDE_PROFESSIONNEL,
        p1_critere_brancardage_portage: "oui",
        ...HOSPITALISATION,
        p2_arrivee_nom_lieu: "'Clinique Saint-Roch'",
        p2_arrivee_adresse: "'12 avenue des Thermes'",
        p2_arrivee_complement_adresse: "'Bâtiment B, 3e étage'",
        p2_arrivee_code_postal: "'1201'",
        p2_arrivee_commune: "'Genève'",
        p2_arrivee_pays: "'Suisse'",
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu[TRAJET.arrivéeStructureSoins]).toBe(
      "Clinique Saint-Roch, 12 avenue des Thermes, Bâtiment B, 3e étage, " +
        "1201, Genève, Suisse",
    );
  });

  it("laisse « transports itératifs » vide pour un transport en série", async () => {
    // La notice réserve cette rubrique aux transports répétés **ne correspondant
    // pas** à la définition du transport en série (≥ 4 sur deux mois, chacun à
    // plus de 50 km). Une série n'exige un accord préalable que si l'ALD n'est pas
    // validée : sous ALD validée elle reste une prescription, et arrive donc ici.
    const série = situation({
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_position_allongee_demi_assise: "oui",
      p1_m0_ald: "oui",
      p1_m0_seance: "oui",
      p1_m0_aucun: "non",
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    });

    // Le garde `CerfaNonApplicable` ne l'écarte pas : c'est bien une prescription.
    const moteur = moteurDeTest();
    expect(
      moteur.setSituation(série).evaluate("p2_transport_en_serie").nodeValue,
    ).toBe(true);

    const lu = await relire(
      await remplirCerfa(
        GABARIT,
        saisiesDepuisSituation(moteurDeTest(), série),
      ),
    );
    expect(lu).not.toHaveProperty(TRAJET.nombreTransportsItératifs);
  });

  it("produit un CERFA fourni depuis la seed « secretariat-prescription »", async () => {
    // Cette seed sert à voir le pré-remplissage : un document presque vide
    // n'apprendrait rien. On verrouille donc ce que sa situation doit couvrir.
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situationDe(seedParId("secretariat-prescription")),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      // Deux contextes administratifs cumulés.
      [SITUATION.entréeSortieHospitalisation.nom]: "/NON", // état d'export
      [SITUATION.accidentTravailMaladiePro.nom]: "/On",
      // Les cinq justifications d'ambulance.
      [MODE_TRANSPORT.positionAllongéeDemiAssise.nom]: "/On",
      [MODE_TRANSPORT.brancardagePortage.nom]: "/On",
      [MODE_TRANSPORT.surveillancePersonneQualifiée.nom]: "/On",
      [MODE_TRANSPORT.oxygène.nom]: "/On",
      [MODE_TRANSPORT.asepsieRigoureuse.nom]: "/On",
      // Trajet, urgence, accident, volumétrie.
      [TRAJET.allerRetour.nom]: "/On",
      [TRAJET.départDomicile.nom]: "/On",
      [TRAJET.nombreTransportsItératifs]: "3",
      [PRESCRIPTION.urgenceSamu.nom]: "/On",
      [SITUATION.accidentTiersOui.nom]: "/OUI",
    });
    expect(saisies).toHaveLength(13);
  });

  it("refuse de produire ce CERFA quand le cas final relève d'un autre document", () => {
    // Transport en série : le simulateur conclut à une demande d'accord préalable
    // (formulaire S3139), pas à cette prescription.
    const accordPréalable = situation({
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_brancardage_portage: "oui",
      ...HOSPITALISATION,
      p2_distance_aller_superieure_150km: "oui",
    });

    expect(() =>
      saisiesDepuisSituation(moteurDeTest(), accordPréalable),
    ).toThrow(CerfaNonApplicable);
  });
});
