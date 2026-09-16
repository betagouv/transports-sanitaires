// La convocation terrestre, part de la matrice de non-régression du livrable
// v9.7.1 (tmp/9.7.1/tests/convocation.mjs). Le volet aérien — celui qui bascule
// vers l'orientation caisse — est dans `convocation-aerienne-v9-7-2.test.ts`.
//
// La v9.7.1 pose, derrière toute convocation, une mosaïque de caractéristiques
// (CONV-AP) : plus de 150 km, avion ou bateau, ou aucune des deux. Ici, les cas
// où seule la distance entre en jeu — l'avion et le bateau restent au dossier
// aérien — et ceux où d'anciennes réponses (distance, série) ne doivent plus
// influer sur une convocation.
//
// Les identifiants sont ceux du livrable, préfixés `CONV971-` comme il le fait ;
// c'est sous ce nom qu'un désaccord se discute avec l'éditeur.

import { describe, expect, it } from "vitest";
import {
  evaluerLeCas,
  type OptionsDuLivrable,
  situationDuLivrable,
} from "./livrable-v9-7-2";
import { moteurDeTest } from "./moteur";
import { CONVOCATION, DAP } from "./situations-v9-7-2";

const TYPES_DE_CONVOCATION = [
  "Convocation du contrôle médical de l’Assurance Maladie.",
  "Convocation d’un médecin-expert ou consultant désigné par une juridiction.",
  "Audience devant une juridiction saisie d’un litige relevant de la Sécurité sociale, avec examen clinique du patient.",
  "Consultation d’un médecin expert désigné dans le cadre d’une contestation médicale avec un organisme de Sécurité sociale.",
  "Convocation de la Commission Médicale de Recours Amiable dans le cadre d’une contestation médicale (exemples : invalidité ou le taux d’incapacité après un AT/MP).",
  "Convocation d’un médecin désigné par la Commission Médicale de Recours Amiable pour réaliser un examen clinique ou une expertise.",
  "Déplacement chez un fournisseur d’appareillage agréé : prothèse oculaire ou faciale, chaussure orthopédique sur mesure, orthèse ou une prothèse externe.",
];

const convocation = (overrides?: Record<string, string>) =>
  ({
    overrides: {
      p2_convocation_ou_avis_type: `'${TYPES_DE_CONVOCATION[0]}'`,
      ...overrides,
    },
  }) satisfies OptionsDuLivrable;

const LONGUE_DISTANCE = { p2_convocation_plus_150km: "oui" };

describe("matrice v9.7.1 — la convocation terrestre", () => {
  it.each(TYPES_DE_CONVOCATION.map((type, i) => [i, type] as const))(
    "CONV971-TERRESTRE-MAX150-TYPE-%s",
    (_i, type) => {
      // Sans caractéristique cochée, une convocation reste sous 150 km et sans
      // accord préalable — quel que soit le cas réglementaire invoqué.
      const moteur = evaluerLeCas(
        convocation({
          p2_convocation_ou_avis_type: `'${type}'`,
        }),
      );
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(CONVOCATION);
      expect(
        moteur.evaluate("cible_tranche_distance_trajet_aller").nodeValue,
      ).toBe("150 km ou moins");
      expect(
        moteur.evaluate("cible_document_a_remettre_au_patient").nodeValue,
      ).toBe("Convocation ou avis d’audience");
    },
  );

  it.each([
    ["VP", { autonomy: 0 }],
    ["TC", { autonomy: 0, mode: "Transports en commun" }],
    ["PROCHE", { autonomy: 1 }],
    ["TAP", {}],
    ["TPMR", { criterion: "p1_critere_fauteuil_sans_transfert" }],
    ["AMBULANCE", { criterion: "p1_critere_brancardage_portage" }],
  ] as const)("CONV971-LONGUE-DISTANCE-MODE-%s", (_id, o) => {
    // Le mode retenu reste celui que la Partie 1 décide seule : la convocation
    // n'y change rien, distance ou non — d'où la comparaison à une DAP « normale »
    // qui atteint la même distance par la page dédiée.
    const reference = evaluerLeCas({ ...o, distance: 2 });
    const moteur = evaluerLeCas({
      ...convocation(),
      ...o,
      convocationCharacteristics: LONGUE_DISTANCE,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
    expect(
      moteur.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
    ).toBe(reference.evaluate("cible_transport_sanitaire_prescrit").nodeValue);
    expect(moteur.evaluate("cible_dap_motif_longue_distance").nodeValue).toBe(
      true,
    );
    expect(moteur.evaluate("cible_dap_motif_avion_bateau").nodeValue).not.toBe(
      true,
    );
    expect(
      moteur.evaluate("cible_tranche_distance_trajet_aller").nodeValue,
    ).toBe("Plus de 150 km");
  });

  it("CONV971-DAP-LONGUE-DISTANCE-NE-FABRIQUE-PAS-DE-SOUS-SITUATION", () => {
    // Une convocation longue distance n'ouvre aucune des sous-situations
    // aériennes : elle n'a pas le contexte qui les déclencherait.
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: LONGUE_DISTANCE,
    });
    expect(moteur.evaluate("cible_situation_hospitalisation").nodeValue).toBe(
      false,
    );
    expect(moteur.evaluate("cible_situation_at_mp").nodeValue).toBe(false);
  });

  it.each([
    // Le nombre de transports prévus n'en fait pas partie : sur une convocation,
    // il n'alimente que la série (déjà exclue) et n'engage aucune garde.
    "p2_depart_adresse",
    "p2_arrivee_adresse",
    "p2_justification_longue_distance",
    "p2_accident_cause_par_tiers",
  ])("CONV971-DAP-INCOMPLET-%s", (champ) => {
    // Une réponse qui manque à la DAP de convocation laisse le résultat
    // indécis, comme pour toute autre DAP.
    const situation = situationDuLivrable({
      ...convocation(),
      convocationCharacteristics: LONGUE_DISTANCE,
    });
    delete situation[champ];
    const moteur = moteurDeTest(situation);
    expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).not.toBe(
      true,
    );
  });

  it.each(["Appel au SAMU - Centre 15", "Autre urgence médicale attestée"])(
    "CONV971-URGENCE-%s",
    (urgency) => {
      const moteur = evaluerLeCas({
        ...convocation(),
        convocationCharacteristics: LONGUE_DISTANCE,
        urgency,
      });
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
      expect(
        moteur.evaluate("cible_attente_accord_prealable_requise").nodeValue,
      ).toBe(false);
    },
  );

  it("CONV971-NON-URGENT-ATTEND-ACCORD", () => {
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: LONGUE_DISTANCE,
    });
    expect(
      moteur.evaluate("cible_attente_accord_prealable_requise").nodeValue,
    ).toBe(true);
  });

  it("CONV971-PLUSIEURS-CONVOCATIONS-PAS-SERIE", () => {
    // Huit transports prévus n'engendrent pas de transport en série sur une
    // convocation : la v9.7.1 l'exclut explicitement.
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: LONGUE_DISTANCE,
      count: 8,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
    expect(moteur.evaluate("p2_transport_en_serie").nodeValue).toBe(false);
    expect(moteur.evaluate("cible_dap_motif_serie").nodeValue).not.toBe(true);
  });

  it("CONV971-ANCIENNES-DONNEES-SERIE-IGNOREES-CONVOCATION", () => {
    // D'anciennes réponses de distance et de série, laissées par un parcours
    // antérieur revenu sur ses pas, ne doivent pas ressurgir sur une convocation
    // qui ne les pose plus.
    const situation = situationDuLivrable(convocation());
    situation.p2_nombre_transports_prevus = "8";
    situation.p2_tranche_distance_trajet_aller =
      "'Plus de 50 km et jusqu’à 150 km inclus'";
    const moteur = moteurDeTest(situation);
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(CONVOCATION);
    expect(moteur.evaluate("p2_transport_en_serie").nodeValue).toBe(false);
  });

  it("CONV971-GARDES-DIRECTES-REPONSE-ABSENTE", () => {
    // Retirer la réponse à la mosaïque CONV-AP elle-même laisse le résultat
    // indécis — la garde ne se contourne pas en amputant la situation.
    const situation = situationDuLivrable({
      ...convocation(),
      convocationCharacteristics: LONGUE_DISTANCE,
    });
    delete situation.p2_convocation_plus_150km;
    const moteur = moteurDeTest(situation);
    expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).not.toBe(
      true,
    );
  });

  describe("INDEPENDANT971 — contrôles adverses transposés", () => {
    it("contradictory-state-none-plus150-cannot-finalize", () => {
      const situation = situationDuLivrable({
        ...convocation(),
        convocationCharacteristics: LONGUE_DISTANCE,
      });
      situation.p2_convocation_aucune = "oui";
      const moteur = moteurDeTest(situation);
      expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).not.toBe(
        true,
      );
    });

    it("old-distance-cannot-override-convocation-answer", () => {
      const situation = situationDuLivrable(convocation());
      situation.p2_tranche_distance_trajet_aller = "'Plus de 150 km'";
      situation.p2_nombre_transports_prevus = "8";
      const moteur = moteurDeTest(situation);
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(CONVOCATION);
      expect(moteur.evaluate("p2_transport_en_serie").nodeValue).toBe(false);
      expect(
        moteur.evaluate("cible_tranche_distance_trajet_aller").nodeValue,
      ).toBe("150 km ou moins");
    });

    it("third-party-date-mandatory-convocation-dap", () => {
      const situation = situationDuLivrable({
        ...convocation(),
        convocationCharacteristics: LONGUE_DISTANCE,
        third: true,
      });
      delete situation.p2_date_accident_cause_par_tiers;
      const moteur = moteurDeTest(situation);
      expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).not.toBe(
        true,
      );
    });

    // La v9.7.1 continue d'exiger une adresse renseignée sur une convocation
    // longue distance ; le format du code postal ou du pays, eux, sont validés
    // par la saisie (`entrees-calculees.ts`, `bornes-de-saisie.test.tsx`), pas
    // par cette garde du modèle.
    it.each(["p2_depart_adresse", "p2_arrivee_commune"])(
      "foreign-or-france-address-still-validated-convocation %s",
      (champ) => {
        const situation = situationDuLivrable({
          ...convocation(),
          convocationCharacteristics: LONGUE_DISTANCE,
          overrides: { [champ]: "''" },
        });
        const moteur = moteurDeTest(situation);
        expect(
          moteur.evaluate("cible_resultat_2_affichable").nodeValue,
        ).not.toBe(true);
      },
    );
  });
});
