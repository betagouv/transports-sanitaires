// La campagne v9.7.3 de l'éditeur sur les décisions de prise en charge
// (`tests/campagne-v973/decisions.mjs`), rejouée au moteur sous ses
// identifiants `DEC-*`, à son instant de référence (21 septembre 2026).
//
// Non transposé : ce que la campagne lit dans la session de référence. Les
// étapes vues (« sans réclamer une adresse ») relèvent du parcours. Le
// document et le récapitulatif (`observed.document`, `summary.cerfa`) se
// lisent ici par `cible_document_a_remettre_au_patient`. Les refus de saisie
// du nombre (`DEC-NOMBRE-INVALIDE-*`) se lisent comme un résultat bloqué.

import { describe, expect, it } from "vitest";
import { texte, vrai } from "../../front/simulateur/moteur";
import { evaluerLeCas, type OptionsDuLivrable } from "./livrable";

const RAISONS = [
  "Consultation médicale",
  "Examen médical",
  "Soin ou traitement autre qu’une séance de chimiothérapie, de radiothérapie ou de dialyse",
  "Entrée en hospitalisation",
  "Sortie d’hospitalisation",
  "Transfert d’un patient hospitalisé vers un autre établissement de santé",
  "Transport vers un service d’urgences",
  "Permission temporaire de sortie",
  "Autre examen ou soin",
];
const [CONSULT, EXAM, CARE, ENTRY, EXIT, , ER, , OTHER] = RAISONS;
const PMT = "prescription médicale de transport";
const DAP = "demande d’accord préalable";
const NON = "non éligible à une prise en charge par l’Assurance Maladie";
const ETABLISSEMENT = "transport à la charge de l’établissement";
const S3141 = "prescription S3141";
const CAISSE = "orientation vers la caisse pour accord préalable";
const CONVOCATION = "convocation ou avis d’audience";

describe("DEC, parcours de référence", () => {
  it.each(RAISONS.map((raison, rang) => [rang + 1, raison] as const))(
    "DEC-BASE-%i (%s)",
    (_rang, raison) => {
      const sortie = raison === EXIT;
      const transfert = raison.startsWith("Transfert");
      const moteur = cas({
        reason: raison,
        ...(sortie
          ? { depart: "Structure de soins", arrival: "Domicile" }
          : {}),
        ...(transfert ? { depart: "Structure de soins" } : {}),
      });
      expect(casFinal(moteur)).toBe(attenduDeBase(raison));
    },
  );
});

describe("DEC, distance et répétition", () => {
  const raisons = [CONSULT, EXAM, CARE, OTHER, ENTRY, EXIT];
  const combinaisons = raisons.flatMap((raison, rang) =>
    [0, 1, 2].flatMap((distance) =>
      [1, 3, 4].map((count) => [rang + 1, distance, count, raison] as const),
    ),
  );
  it.each(combinaisons)(
    "DEC-SEUIL-%i-D%i-N%i (%s)",
    (_rang, distance, count, raison) => {
      const hospitalisation = raison === ENTRY || raison === EXIT;
      const attendu =
        distance === 2 || (distance === 1 && count >= 4)
          ? DAP
          : hospitalisation
            ? PMT
            : NON;
      const moteur = cas({
        reason: raison,
        distance: distance as 0 | 1 | 2,
        count,
        organization: "trajets simples",
        ...(raison === EXIT
          ? { depart: "Structure de soins", arrival: "Domicile" }
          : {}),
      });
      expect(casFinal(moteur)).toBe(attendu);
      expect(vrai(moteur, "p2_transport_en_serie")).toBe(
        distance > 0 && count >= 4,
      );
      if (attendu === DAP)
        expect(vrai(moteur, "cible_attente_accord_prealable_requise")).toBe(
          true,
        );
    },
  );

  it.each([
    ["EXO", "Exonérante"],
    ["NONEXO", "Non exonérante"],
  ])("DEC-ALD-SERIE-%s", (_id, aldType) => {
    const moteur = cas({
      m0: { p1_m0_ald: "oui" },
      aldType,
      distance: 1,
      count: 4,
      organization: "trajets simples",
    });
    expect(casFinal(moteur)).toBe(PMT);
    expect(vrai(moteur, "cible_attente_accord_prealable_requise")).toBe(false);
  });
});

describe("DEC, urgence", () => {
  const urgences = [
    ["NON", "Non"],
    ["15", "Appel au SAMU - Centre 15"],
    ["AUTRE", "Autre urgence médicale attestée"],
  ];
  it.each(urgences)("DEC-DAP-URGENCE-%s", (_id, urgency) => {
    const dap = cas({ distance: 2, urgency });
    expect(casFinal(dap)).toBe(DAP);
    expect(vrai(dap, "cible_attente_accord_prealable_requise")).toBe(
      urgency === "Non",
    );
  });
  it.each(urgences)("DEC-URGENCE-PAS-HOSPITALISATION-%s", (_id, urgency) => {
    const sansAdmission = cas({ reason: ER, urgency });
    expect(casFinal(sansAdmission)).toBe(NON);
    expect(vrai(sansAdmission, "cible_situation_hospitalisation")).toBe(false);
  });
});

describe("DEC, convocations", () => {
  it.each(
    CONVOCATIONS.map((convocation, rang) => [rang + 1, convocation] as const),
  )("DEC-CONVOCATION-%i", (_rang, convocation) => {
    const moteur = cas({
      overrides: { p2_convocation_ou_avis_type: `'${convocation}'` },
    });
    expect(casFinal(moteur)).toBe(CONVOCATION);
  });

  const aerien = (urgency: string) =>
    cas({
      urgency,
      convocationCharacteristics: { p2_convocation_avion_bateau: "oui" },
      overrides: { p2_convocation_ou_avis_type: `'${CONVOCATIONS[0]}'` },
    });
  const urgencesAeriennes = [
    ["NON", "Non"],
    ["URGENT", "Autre urgence médicale attestée"],
  ];
  it.each(urgencesAeriennes)("DEC-CONV-AIR-%s", (_id, urgency) => {
    const moteur = aerien(urgency);
    expect(casFinal(moteur)).toBe(CAISSE);
    expect(vrai(moteur, "cible_attente_accord_prealable_requise")).toBe(
      urgency === "Non",
    );
  });
  it.each(urgencesAeriennes)("DEC-CONV-AIR-CIBLES-%s", (_id, urgency) => {
    const moteur = aerien(urgency);
    expect(casFinal(moteur)).toBe(CAISSE);
    for (const motif of MOTIFS_DAP) {
      expect(vrai(moteur, motif), motif).toBe(false);
      expect(
        Object.keys(moteur.evaluate(motif).missingVariables),
        motif,
      ).toEqual([]);
    }
  });
});

describe("DEC, avion ou bateau sans sous-situation (AUD-AIR-ORIENTATION)", () => {
  it.each(
    [CONSULT, EXAM, CARE, ER, OTHER].map(
      (raison, rang) => [rang + 1, raison] as const,
    ),
  )("DEC-AIR-SANS-SOUS-CAS-%i (%s)", (_rang, raison) => {
    const moteur = cas({
      reason: raison,
      criterion: "p1_critere_brancardage_portage",
      special: { p2_special_avion_bateau: "oui" },
    });
    expect(casFinal(moteur)).toBe(CAISSE);
    expect(vrai(moteur, "cible_situation_hospitalisation")).toBe(false);
  });
});

describe("DEC, nombre invalide", () => {
  it.each([
    ["0", 0],
    ["-1", -1],
    ["1_5", 1.5],
  ])("DEC-NOMBRE-INVALIDE-%s", (_id, count) => {
    const resultat = cas({ reason: ENTRY, count }).evaluate(
      "cible_resultat_2_affichable",
    );
    expect(resultat.nodeValue).toBe(false);
    expect(Object.keys(resultat.missingVariables)).toEqual([]);
  });
});

// ---- implémentation ----

const INSTANT = "2026-09-21T10:00:00Z";

const CONVOCATIONS = [
  "Convocation du contrôle médical de l’Assurance Maladie.",
  "Convocation d’un médecin-expert ou consultant désigné par une juridiction.",
  "Audience devant une juridiction saisie d’un litige relevant de la Sécurité sociale, avec examen clinique du patient.",
  "Consultation d’un médecin expert désigné dans le cadre d’une contestation médicale avec un organisme de Sécurité sociale.",
  "Convocation de la Commission Médicale de Recours Amiable dans le cadre d’une contestation médicale (exemples : invalidité ou le taux d’incapacité après un AT/MP).",
  "Convocation d’un médecin désigné par la Commission Médicale de Recours Amiable pour réaliser un examen clinique ou une expertise.",
  "Déplacement chez un fournisseur d’appareillage agréé : prothèse oculaire ou faciale, chaussure orthopédique sur mesure, orthèse ou une prothèse externe.",
];

const MOTIFS_DAP = [
  "cible_dap_motif_longue_distance",
  "cible_dap_motif_serie",
  "cible_dap_motif_avion_bateau",
  "cible_dap_motif_camsp_cmpp",
  "cible_dap_motif_samsah",
  "cible_dap_motif_engagement_maternite",
] as const;

function cas(options: OptionsDuLivrable) {
  return evaluerLeCas({ instant: INSTANT, ...options });
}

function casFinal(moteur: ReturnType<typeof cas>): string {
  return texte(moteur, "cible_cas_final");
}

function attenduDeBase(raison: string): string {
  if (raison === ENTRY || raison === EXIT) return PMT;
  if (raison.startsWith("Transfert")) return ETABLISSEMENT;
  if (raison.startsWith("Permission")) return S3141;
  return NON;
}
