// La charge de l'établissement, part de la matrice de non-régression du livrable
// v9.5.1 (tmp/9.5.1/…/transports-sanitaires.tests.v9-5-1.yaml).
//
// L'Article 80 et le régime pénitentiaire ont ceci de commun qu'ils déplacent la
// charge du transport : l'Assurance Maladie n'en est plus le payeur, et le
// patient ne repart avec aucun document. Le reste de la matrice est dans
// `regression-v9-5-1.test.ts` et `accord-prealable-v9-5-1.test.ts`.

import { describe } from "vitest";
import { type Cas, rejouerLaMatrice } from "./matrice";
import {
  CHARGE_ETABLISSEMENT,
  HOSPITALISATION,
  PMT,
  PRO,
} from "./situations-v9-5-1";

const matrice: Cas[] = [
  {
    id: "ARTICLE80-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_patient_hospitalise: "oui",
    },
    expect: {
      p2_transport_charge_etablissement: true,
      p2_article_80_situation_specifique: false,
      cible_cas_final: CHARGE_ETABLISSEMENT,
    },
  },
  {
    id: "ARTICLE80-002",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_patient_hospitalise: "oui",
      p2_exception_admission_had: "oui",
      p2_exception_aucune: "non",
      p2_detenu_hospitalise: "oui",
      p2_detenu_inter_etablissements: "oui",
    },
    expect: {
      p2_article_80_situation_specifique: true,
      cible_cas_final: CHARGE_ETABLISSEMENT,
    },
  },
  {
    id: "ARTICLE80-003",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_patient_hospitalise: "oui",
      p2_exception_admission_had: "oui",
      p2_exception_aucune: "non",
      p2_detenu_hospitalise: "oui",
      p2_detenu_uhsa_uhsi: "oui",
    },
    expect: {
      p2_article_80_situation_specifique: true,
      cible_cas_final: CHARGE_ETABLISSEMENT,
    },
  },
  {
    id: "PENITENTIAIRE-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      p2_contexte_retour_penitentiaire: "oui",
      p2_contexte_aucun: "non",
      p2_patient_hospitalise: "oui",
    },
    expect: {
      p2_transport_charge_etablissement: false,
      cible_cas_final: PMT,
      cible_regime_financement: "Assurance Maladie",
    },
  },
];

describe("modèle v9.5.1 — la charge de l’établissement", () => {
  rejouerLaMatrice(matrice);
});
