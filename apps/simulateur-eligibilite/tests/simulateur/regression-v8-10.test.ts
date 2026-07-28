import { describe, it, expect } from "vitest";
import { BASE_NEUTRE, makeEngine } from "./engine";

// Portage de la matrice de non-régression du livrable
// (tmp/8.10/transports-sanitaires.tests.v8-10.yaml → scenario_tests).
// Chaque cas fournit des entrées `given` (surchargées sur la base neutre) et vérifie
// des `expect` sur des règles Publicodes. Les assertions purement UI de la matrice
// (next, next_after_m21, forbid_ui_variant, forbidden_content) sont couvertes par le
// schéma ui.yaml / le validateur du livrable, pas ici — elles sont ignorées.

// Formate une valeur `given` au format situation publicodes : booléens `oui`/`non`
// et nombres tels quels, énumérés (texte) entre quotes simples.
function fmt(v: string | number): string {
  const s = String(v);
  if (s === "oui" || s === "non") return s;
  if (/^\d+$/.test(s)) return s;
  return `'${s}'`;
}

// Clés d'`expect` qui ne sont pas des règles Publicodes (assertions UI) : ignorées.
const CLES_UI = new Set(["next", "next_after_m21", "forbid_ui_variant", "forbidden_content"]);

// Compare la valeur évaluée d'une règle à la valeur attendue de la matrice.
// Mappe `oui`/`non` → booléens, `non applicable` → valeur nulle.
function verifie(rule: string, attendu: string | number, id: string): void {
  const engine = makeEngine({
    ...BASE_NEUTRE,
    ...Object.fromEntries(Object.entries(given).map(([k, v]) => [k, fmt(v)])),
  });
  const nodeValue = engine.evaluate(rule).nodeValue;
  if (attendu === "non applicable") {
    expect(nodeValue, `${id} — ${rule}`).toBeNull();
    return;
  }
  const cible =
    attendu === "oui" ? true : attendu === "non" ? false : attendu;
  expect(nodeValue, `${id} — ${rule}`).toBe(cible);
}

// Rendu accessible à `verifie` via une variable de portée de test (réassignée par cas).
let given: Record<string, string | number> = {};

type Cas = {
  id: string;
  given: Record<string, string | number>;
  expect: Record<string, string | number>;
};

const matrice: Cas[] = [
  {
    id: "ALD-SEANCE-DEDUITE",
    given: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_motif_seance_chimio_radio_hemodialyse: "oui",
    },
    expect: {
      p1_ald_seance_specifique_validee: "oui",
      p1_ald_seance_specifique: "non applicable",
    },
  },
  {
    id: "ALD-M23-CALCULEE",
    given: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_ald_seance_specifique: "non",
      p1_autonomie:
        "Peut se déplacer avec un proche accompagnant, pour aider à son déplacement et/ou à la transmission d’informations à l’équipe soignante.",
      p1_critere_aucune_situation_encadree: "oui",
    },
    expect: {
      p1_ald_incapacite_ou_deficience: "oui",
      p1_ald_validee: "oui",
    },
  },
  {
    id: "SERIE-CALCULEE-DAP",
    given: {
      p2_distance_aller_superieure_150km: "non",
      p2_nombre_transports_prevus: 4,
      p2_chaque_trajet_aller_superieur_50km: "oui",
      p1_ald_validee: "non",
    },
    expect: {
      p2_transport_en_serie: "oui",
      p2_transport_serie_declenche_dap: "oui",
    },
  },
  {
    id: "SERIE-ALD-SANS-DAP-SEULE",
    given: {
      p2_distance_aller_superieure_150km: "non",
      p2_nombre_transports_prevus: 4,
      p2_chaque_trajet_aller_superieur_50km: "oui",
      p1_ald_validee: "oui",
    },
    expect: {
      p2_transport_en_serie: "oui",
      p2_transport_serie_declenche_dap: "non",
    },
  },
  {
    id: "PRESTATION-NON",
    given: {
      p2_prestation_prise_en_charge_applicable: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
      cible_transport_sanitaire_prescrit: "ambulance",
    },
    expect: {
      cible_cas_final: "prestation non prise en charge par assurance maladie",
      cible_document_a_remettre_au_patient: "aucun document",
      p2_informations_trajet_requises: "non",
    },
  },
  {
    id: "ARTICLE80-PRO",
    given: {
      cible_cas_final: "transport charge établissement",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_article_80_situation_specifique: "non",
    },
    expect: {
      cible_article_80_mode: "transport professionnel",
    },
  },
  {
    id: "ARTICLE80-PERSO",
    given: {
      cible_cas_final: "transport charge établissement",
      cible_transport_sanitaire_prescrit: "véhicule personnel ou transport en commun",
      cible_article_80_situation_specifique: "non",
    },
    expect: {
      cible_article_80_mode: "véhicule personnel ou transports en commun",
    },
  },
  {
    id: "ARTICLE80-SPECIFIQUE",
    given: {
      // Contexte détenu ouvrant la branche UHSA/UHSI (la question A1.3 n'est
      // applicable qu'après une Partie 1 favorable rendant la Partie 2 requise,
      // patient hospitalisé + exception restant Assurance Maladie).
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_type: "Retour en HAD (Hospitalisation À Domicile).",
      p2_detenu_hospitalise: "oui",
      p2_detenu_inter_etablissements: "non",
      p2_detenu_uhsa_uhsi: "oui",
    },
    expect: {
      cible_article_80_situation_specifique: "oui",
    },
  },
];

describe("v8.10 — matrice de non-régression du livrable", () => {
  for (const cas of matrice) {
    it(cas.id, () => {
      given = cas.given;
      for (const [rule, attendu] of Object.entries(cas.expect)) {
        if (CLES_UI.has(rule)) continue;
        verifie(rule, attendu, cas.id);
      }
    });
  }
});
