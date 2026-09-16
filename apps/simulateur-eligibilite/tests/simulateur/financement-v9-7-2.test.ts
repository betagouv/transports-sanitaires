// Le financement d'une convocation, part de la matrice de non-régression du
// livrable v9.7.1 (tmp/9.7.1/tests/financement.mjs). Ce que l'anomalie
// convocation-lieu faisait échouer avant la v9.7.1 est ici sa propre matrice :
// sept cas réglementaires croisés avec six modes de transport, plus les
// variantes de lieu de départ qui l'avaient révélée.
//
// Ce qui laisse le financement indécis est dans
// `financement-incomplet-v9-7-2.test.ts`.

import { describe, expect, it } from "vitest";
import { attendFinancementComplet } from "./financement-v9-7-2";
import { evaluerLeCas, situationDuLivrable } from "./livrable-v9-7-2";
import { moteurDeTest } from "./moteur";
import { CONVOCATION } from "./situations-v9-7-2";

const TYPES_DE_CONVOCATION = [
  "Convocation du contrôle médical de l’Assurance Maladie.",
  "Convocation d’un médecin-expert ou consultant désigné par une juridiction.",
  "Audience devant une juridiction saisie d’un litige relevant de la Sécurité sociale, avec examen clinique du patient.",
  "Consultation d’un médecin expert désigné dans le cadre d’une contestation médicale avec un organisme de Sécurité sociale.",
  "Convocation de la Commission Médicale de Recours Amiable dans le cadre d’une contestation médicale (exemples : invalidité ou le taux d’incapacité après un AT/MP).",
  "Convocation d’un médecin désigné par la Commission Médicale de Recours Amiable pour réaliser un examen clinique ou une expertise.",
  "Déplacement chez un fournisseur d’appareillage agréé : prothèse oculaire ou faciale, chaussure orthopédique sur mesure, orthèse ou une prothèse externe.",
];

const MODES = [
  { autonomy: 0 as const },
  { autonomy: 0 as const, mode: "Transports en commun" },
  { autonomy: 1 as const },
  { criterion: "p1_critere_risque_effets_secondaires" },
  { criterion: "p1_critere_fauteuil_sans_transfert" },
  { criterion: "p1_critere_oxygene" },
];

const grille = TYPES_DE_CONVOCATION.flatMap((type, i) =>
  MODES.map((mode, j) => [`${i}-${j}`, type, mode] as const),
);

describe("matrice v9.7.1 — le financement d’une convocation", () => {
  it.each(grille)("FINANCEMENT-CONVOCATION-%s", (_id, type, mode) => {
    const moteur = evaluerLeCas({
      ...mode,
      overrides: { p2_convocation_ou_avis_type: `'${type}'` },
    });
    attendFinancementComplet(moteur);
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(CONVOCATION);
    expect(
      moteur.evaluate("cible_document_a_remettre_au_patient").nodeValue,
    ).toBe("Convocation ou avis d’audience");
    expect(moteur.evaluate("cible_resultat_2_couleur").nodeValue).toBe("vert");
  });

  // L'anomalie convocation-lieu (v9.7, corrigée en v9.7.1) : le régime se
  // décidait juste, mais le modèle réclamait encore le nom d'un lieu de départ
  // que la convocation ne collecte pas. Quatre variantes de ce lieu, toutes
  // sans effet sur la décision depuis la v9.7.1.
  it("FINANCEMENT-DOMICILE", () => {
    const situation = situationDuLivrable({
      autonomy: 0,
      overrides: {
        p2_convocation_ou_avis_type: `'${TYPES_DE_CONVOCATION[0]}'`,
        p2_trajet_depart: "'Domicile'",
      },
    });
    attendFinancementComplet(moteurDeTest(situation));
  });

  it("FINANCEMENT-NOM_ABSENT", () => {
    const situation = situationDuLivrable({
      autonomy: 0,
      overrides: {
        p2_convocation_ou_avis_type: `'${TYPES_DE_CONVOCATION[0]}'`,
        p2_trajet_depart: "'Domicile'",
        p2_depart_adresse: "'12 rue des Lilas'",
        p2_depart_code_postal: "'01000'",
        p2_depart_commune: "'Bourg en Bresse'",
      },
    });
    attendFinancementComplet(moteurDeTest(situation));
  });

  it("FINANCEMENT-NOM_FACTICE", () => {
    // Le nom factice que la seed `secretariat-convocation` posait avant la
    // v9.7.1 (cf. `catalogue.ts`) n'est plus nécessaire, mais rester présent ne
    // change rien à la décision non plus.
    const situation = situationDuLivrable({
      autonomy: 0,
      overrides: {
        p2_convocation_ou_avis_type: `'${TYPES_DE_CONVOCATION[0]}'`,
        p2_depart_nom_lieu: "'Valeur de contournement'",
      },
    });
    attendFinancementComplet(moteurDeTest(situation));
  });

  it("FINANCEMENT-ANCIEN_TRAJET", () => {
    // D'anciennes réponses de trajet, laissées par un parcours antérieur non
    // convocation, ne doivent pas empêcher la convocation de trancher.
    const ancien = situationDuLivrable({ reason: "Entrée en hospitalisation" });
    const convocation = situationDuLivrable({
      autonomy: 0,
      overrides: {
        p2_convocation_ou_avis_type: `'${TYPES_DE_CONVOCATION[0]}'`,
      },
    });
    attendFinancementComplet(moteurDeTest({ ...ancien, ...convocation }));
  });

  it("FINANCEMENT-ETABLISSEMENT", () => {
    attendFinancementComplet(evaluerLeCas({ transfer: true }));
  });

  it("FINANCEMENT-PATIENT", () => {
    attendFinancementComplet(
      evaluerLeCas({
        reason: "Permission temporaire de sortie",
        age: "20 ans ou plus",
        permissionCadre: "Demande du patient sans justification médicale",
      }),
    );
  });
});
