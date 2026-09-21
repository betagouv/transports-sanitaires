// `saisiesDepuisSituation` : ce que le modèle permet de déduire du CERFA, et
// ce qu'il se garde d'inventer. Chaque cas part d'une situation complète et
// relit le PDF produit, plutôt que d'inspecter les saisies intermédiaires.

import { describe, expect, it } from "vitest";
import { CerfaNonApplicable } from "../../front/outils-produit/beta/cerfa/cerfa-non-applicable.ts";
import { saisiesDepuisSituation } from "../../front/outils-produit/beta/cerfa/pmt/depuis-simulateur.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { dateDePrescription } from "../../front/simulateur/secretariat/date-de-prescription.ts";
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
        p1_critere_aucun: "non",
        ...HOSPITALISATION,
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      "entré sortie hosp": "/NON", // état d'export, pas « non »
      "position allongée ou demiassise": "/On",
      "brancardage ou dun portage": "/On",
    });
    // Justifications non retenues par le moteur : jamais cochées.
    expect(lu).not.toHaveProperty("dadministration doxygène");
    expect(lu).not.toHaveProperty("aseptie rigoureuse");
    // Le caractère exonérant de l'ALD n'est pas modélisé : la case reste vierge.
    expect(lu).not.toHaveProperty("ALD exo");
  });

  it("coche le transport assis et le fauteuil roulant pour un TPMR", async () => {
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situation({
        p1_autonomie: AIDE_PROFESSIONNEL,
        p1_critere_fauteuil_sans_transfert: "oui",
        p1_critere_aucun: "non",
        ...HOSPITALISATION,
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      "transport assis professionnalisé VSL taxi conventionné": "/On",
      "un transport pour patient à mobilité réduite dans son fauteuil roulant est adapté cochez la case":
        "/On",
    });
  });

  it("coche l'accompagnant pour un transport en véhicule personnel", async () => {
    // La case suit `cible_accompagnant_necessaire`, réintroduite en v9.2.1 :
    // avant elle, l'application dérivait la valeur de Q1 pour son compte.
    //
    // La v9.5.0 avait fermé ce chemin — l'accompagnement y valait motif de DAP,
    // et une DAP n'a pas de case pour lui —, au point que ce test constatait
    // l'impasse plutôt que le remplissage. Nous l'avions remontée à l'éditeur ;
    // la v9.5.1 la rouvre, et l'assertion d'origine est rétablie.
    const accompagné = saisiesDepuisSituation(
      moteurDeTest(),
      situation({ p1_autonomie: PROCHE_ACCOMPAGNANT, ...HOSPITALISATION }),
    );
    expect(await relire(await remplirCerfa(GABARIT, accompagné))).toMatchObject(
      {
        "dans ce cas si létat du patient nécessite une personne accompagnante cochez la case":
          "/On",
      },
    );
  });

  it("reporte le trajet, l'urgence et l'accident issus de la Partie 2", async () => {
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situation({
        p1_autonomie: AIDE_PROFESSIONNEL,
        p1_critere_brancardage_portage: "oui",
        p1_critere_aucun: "non",
        ...HOSPITALISATION,
        p2_organisation_transports: "'aller-retour identique'",
        p2_trajet_depart: "'Domicile'",
        p2_trajet_arrivee: "'Structure de soins'",
        p2_arrivee_nom_lieu: "'CH de Vannes'",
        p2_transport_urgence: "'Appel au SAMU - Centre 15'",
        p2_nombre_transports_prevus: "3",
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      "transp aller-retour": "/On",
      domicile: "/On",
      "nbr transp": "3",
      "Urg SAMU centre 15": "/On",
      non: "/NON",
    });
    // L'arrivée est une structure de soins : on ne coche pas « domicile », et la
    // v9.1 permet d'écrire le lieu détaillé — nom, adresse, code postal, commune
    // aplatis sur l'unique ligne du formulaire.
    expect(lu).not.toHaveProperty("domicile_2");
    expect(lu["arrivée struct soins"]).toBe(
      "CH de Vannes, 2 rue de l’Arrivée, 75002, Paris",
    );
  });

  it("coche l'autre urgence pour une exception d'aide médicale urgente", async () => {
    // A4.5 répond « Non », et pourtant l'urgence est attestée : le modèle range
    // l'exception d'aide médicale urgente (A0.2) parmi les urgences depuis la
    // v9.5.1, et c'est `cible_type_urgence` — non la réponse brute d'A4.5 — que
    // le formulaire lit. La case reviendrait décochée si l'application
    // reconstruisait l'urgence depuis les réponses.
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situation({
        p1_autonomie: AIDE_PROFESSIONNEL,
        p1_critere_brancardage_portage: "oui",
        p1_critere_aucun: "non",
        // Les exceptions ne se posent que derrière un transfert qualifié, que
        // la v9.7 demande positivement — raison, puis nature.
        p2_raison_principale:
          "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
        p2_transfert_en_cours: "oui",
        p2_nature_transfert: "'Définitif'",
        // Un transfert relie deux structures de soins : le contrat le contraint,
        // et le lieu de départ porte alors un nom.
        p2_trajet_depart: "'Structure de soins'",
        p2_depart_nom_lieu: "'CH de Lorient'",
        p2_trajet_arrivee: "'Structure de soins'",
        p2_exception_aide_medicale_urgente: "oui",
        p2_exception_aucune: "non",
        // v9.7.3 : l'exception qualifie désormais l'urgence elle-même
        // (`p2_urgence_autre`), qui réclame sa précision comme tout « Autre
        // urgence médicale attestée » répondu directement.
        p2_urgence_autre_precision: "'Aide médicale urgente déclenchée'",
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu.autres).toBe("/On");
    expect(lu).not.toHaveProperty("Urg SAMU centre 15");
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
        p1_critere_aucun: "non",
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

    expect(lu["arrivée struct soins"]).toBe(
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
      p1_critere_aucun: "non",
      p1_m0_ald: "oui",
      p1_m0_seance_chimiotherapie: "oui",
      p1_m0_aucun: "non",
      p2_nombre_transports_prevus: "4",
      p2_tranche_distance_trajet_aller:
        "'Plus de 50 km et jusqu’à 150 km inclus'",
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
    expect(lu).not.toHaveProperty("nbr transp");
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
      // Deux contextes administratifs cumulés, chacun avec sa date.
      "entré sortie hosp": "/NON", // état d'export
      "transport lié à un accident du travail ou une maladie professionnelle":
        "/On",
      "date accid ATMP": "12012026",
      // Les cinq justifications d'ambulance.
      "position allongée ou demiassise": "/On",
      "brancardage ou dun portage": "/On",
      "surveillance par une personne qualifiée": "/On",
      "dadministration doxygène": "/On",
      "aseptie rigoureuse": "/On",
      // Trajet, urgence, accident, volumétrie.
      "transp aller-retour": "/On",
      domicile: "/On",
      "nbr transp": "3",
      "Urg SAMU centre 15": "/On",
      oui: "/OUI",
      "date accident": "12012026",
      // Ni l'exonération du ticket modérateur ni la pension militaire ne sont
      // demandées par cette seed : les deux mosaïques par défaut valent non.
      oui1: "/NON",
      oui2: "/NON",
      // Posée par l'application, hors mapping (`date-de-prescription.ts`).
      date: dateDePrescription().replaceAll("/", ""),
      // Composée selon EM-1 (spec 0005) : l'hospitalisation et les cinq
      // critères d'ambulance débordent la zone d'une seule ligne, le champ
      // porte donc le renvoi à l'annexe plutôt que le texte entier.
      "comm évent": "Éléments médicaux : voir l’annexe jointe.",
    });
    expect(saisies).toHaveLength(19);
  });

  it("refuse de produire ce CERFA quand le cas final relève d'un autre document", () => {
    // Transport en série : le simulateur conclut à une demande d'accord préalable
    // (formulaire S3139), pas à cette prescription.
    const accordPréalable = situation({
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_brancardage_portage: "oui",
      p1_critere_aucun: "non",
      ...HOSPITALISATION,
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",

      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
    });

    expect(() =>
      saisiesDepuisSituation(moteurDeTest(), accordPréalable),
    ).toThrow(CerfaNonApplicable);
  });
});
