// Les contrôles neufs de la v9.7.2, hors matrice YAML : les deux suites
// `.mjs` du paquet (`tmp/9.7.2/tests/retours-v972.mjs` et `revue-v972.mjs`),
// qui répondent aux trois anomalies remontées sur la v9.7.1. Identifiants
// préfixés `RETOURS972-` ou `INDEPENDANT972-` comme le livrable.
//
// Ce fichier ne porte que ce qui se rejoue au moteur seul. Trois familles en
// sont volontairement absentes :
// - `CAISSE-CONTRAT-TEXTES-VALIDES`, `CAISSE-RENDU-ET-SYNTHESE-*` et
//   `CAISSE-CONSIGNE-ET-SYNTHESE-*` comparent des textes rendus : elles
//   accompagnent la recopie des contenus dans `orientation-caisse.test.tsx`.
// - `FAIT-CONNU-*`, `FAIT-INCONNU-*` et `AIR-*-RENDER-ET-CALCUL` portent sur
//   `groupPresentation` (faits connus de la mosaïque) : elles accompagnent
//   `faits-connus.ts` dans `faits-connus.test.tsx`.
// - `CAISSE-RETOUR-ARRIERE-RECALCULE-ATTENTE` rejoue une navigation arrière de
//   session — la limite du § 9 du skill d'intégration (`@publicodes/forms`
//   n'oublie jamais une page visitée) — et `PRESENTATION-HORS-MOSAIQUE-REJETEE`,
//   `CAISSE-SORTIE-IMMUTABLE-CHECKLIST` testent l'adaptateur de référence
//   lui-même (une session durable, une valeur de retour mutable) : rien de
//   cela ne transpose à notre moteur nu ou à notre rendu React, recréé à
//   chaque appel plutôt que partagé.

import { describe, expect, it } from "vitest";
import { evaluerLeCas, situationDuLivrable } from "./livrable";
import { moteurDeTest } from "./moteur";
import {
  CHARGE_ETABLISSEMENT,
  CONVOCATION,
  DAP,
  NON_ELIGIBLE,
  ORIENTATION_CAISSE,
  PMT,
  S3141,
} from "./situations";

const WAIT = "cible_attente_accord_prealable_requise";
const AVION_BATEAU = { p2_convocation_avion_bateau: "oui" };
const convocation = () =>
  ({
    overrides: {
      p2_convocation_ou_avis_type:
        "'Convocation du contrôle médical de l’Assurance Maladie.'",
    },
  }) as const;

describe("RETOURS972 / INDEPENDANT972 — l’attente de l’accord préalable", () => {
  it("RETOURS972-ATTENTE-GARDE-CAS-FINAL", () => {
    // La règle corrigée s'indexe sur `cible_cas_final`, gardée par
    // `cible_resultat_2_affichable`, et non plus sur `p2_document_dap_determine`
    // (qui ne se complète jamais sur la branche orientation caisse).
    const regle = moteurDeTest().getRule(WAIT).rawNode as {
      "applicable si"?: string;
    };
    expect(regle["applicable si"]).toBe("cible_resultat_2_affichable");
    const serialise = JSON.stringify(regle);
    expect(serialise).toContain("cible_cas_final");
    expect(serialise).not.toContain("p2_document_dap_determine");
  });

  it.each([
    [
      "CAISSE",
      { ...convocation(), convocationCharacteristics: AVION_BATEAU },
      ORIENTATION_CAISSE,
      true,
    ],
    ["CONVOCATION", convocation(), CONVOCATION, false],
    ["DAP", { distance: 2 as const }, DAP, true],
    ["PMT", { reason: "Entrée en hospitalisation" }, PMT, false],
    ["S3141", { reason: "Permission temporaire de sortie" }, S3141, false],
    ["ETABLISSEMENT", { transfer: true }, CHARGE_ETABLISSEMENT, false],
    [
      "PATIENT",
      {
        reason: "Permission temporaire de sortie",
        age: "20 ans ou plus",
        permissionCadre: "Demande du patient sans justification médicale",
      },
      "permission de sortie sans motif médical",
      false,
    ],
    ["NON-ELIGIBLE", {}, NON_ELIGIBLE, false],
  ] as const)(
    "RETOURS972-ATTENTE-FINAL-%s",
    (_nom, options, casFinalAttendu, attenteAttendue) => {
      const moteur = evaluerLeCas(options);
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
        casFinalAttendu,
      );
      expect(moteur.evaluate(WAIT).nodeValue).toBe(attenteAttendue);
      expect(moteur.evaluate(WAIT).missingVariables).toEqual({});
    },
  );

  it.each([
    ["Appel au SAMU - Centre 15"],
    ["Autre urgence médicale attestée"],
  ] as const)("RETOURS972-ATTENTE-URGENTE-CAISSE-%s", (urgency) => {
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: AVION_BATEAU,
      urgency,
    });
    expect(moteur.evaluate(WAIT).nodeValue).toBe(false);
    expect(moteur.evaluate(WAIT).missingVariables).toEqual({});
  });

  it.each([
    [0, "Non", true],
    [1, "Appel au SAMU - Centre 15", false],
    [2, "Autre urgence médicale attestée", false],
  ] as const)(
    "INDEPENDANT972-DAP-CONSERVE-URGENCE-%s",
    (_i, urgency, attendu) => {
      const moteur = evaluerLeCas({ distance: 2, urgency });
      expect(moteur.evaluate(WAIT).nodeValue).toBe(attendu);
      expect(moteur.evaluate(WAIT).missingVariables).toEqual({});
    },
  );

  it("RETOURS972-CAISSE-SANS-ADRESSE-AUCUN-MANQUANT", () => {
    // La règle ne réévalue plus la préparation d'un Cerfa : aucune adresse
    // manquante ne doit empêcher le calcul de l'attente sur cette branche.
    const situation = situationDuLivrable({
      ...convocation(),
      convocationCharacteristics: AVION_BATEAU,
    });
    for (const cle of Object.keys(situation))
      if (/^p2_(depart|arrivee)_/.test(cle)) delete situation[cle];
    const moteur = moteurDeTest(situation);
    for (const cible of [
      WAIT,
      "cible_regime_financement",
      "cible_document_a_remettre_au_patient",
      "cible_resultat_2_affichable",
    ])
      expect(moteur.evaluate(cible).missingVariables, cible).toEqual({});
    expect(moteur.evaluate(WAIT).nodeValue).toBe(true);
  });

  // Le moteur nu n'est pas le parcours (§ 9 du skill d'intégration) : privé
  // d'une réponse qui bloquerait la navigation, le moteur range la situation
  // ailleurs (souvent « non éligible ») plutôt que de la laisser indécise. Ces
  // scénarios constatent seulement que le résultat ne s'affiche pas et que
  // l'attente ne peut pas être lue comme une autorisation — la vraie garde
  // tient à l'ordre du parcours (`etapes.ts`), pas à ces assertions.
  const sansLesCles = (
    options: Parameters<typeof situationDuLivrable>[0],
    cles: readonly string[],
  ) => {
    const situation = situationDuLivrable(options);
    for (const cle of cles) delete situation[cle];
    return situation;
  };

  it.each([
    ["P1", moteurDeTest({})],
    [
      "CARACTERISTIQUES",
      moteurDeTest(
        sansLesCles(convocation(), [
          "p2_convocation_plus_150km",
          "p2_convocation_avion_bateau",
          "p2_convocation_aucune",
        ]),
      ),
    ],
    [
      "ADRESSE-DAP",
      moteurDeTest(
        sansLesCles({ distance: 2 as const }, [
          "p2_depart_nom_lieu",
          "p2_depart_adresse",
          "p2_depart_code_postal",
          "p2_depart_commune",
          "p2_arrivee_nom_lieu",
          "p2_arrivee_adresse",
          "p2_arrivee_code_postal",
          "p2_arrivee_commune",
        ]),
      ),
    ],
  ] as const)("RETOURS972-ATTENTE-INCOMPLETE-%s", (_nom, moteur) => {
    expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).not.toBe(
      true,
    );
    expect(moteur.evaluate(WAIT).nodeValue).not.toBe(true);
  });

  // RETOURS972-ATTENTE-INCOMPLETE-URGENCE et -PRECISION-URGENCE,
  // INDEPENDANT972-INCOMPLET-URGENCE et -PRECISION-URGENCE ne se transposent
  // pas au moteur seul : privée de `p2_transport_urgence`, la situation ne
  // reste pas indécise — `est défini: p2_transport_urgence` vaut `false`, pas
  // indécis, et le modèle conclut « non éligible » sans jamais réclamer la
  // réponse (constaté à l'exécution : `cible_resultat_2_affichable` devient
  // `true`). La vraie garde tient à l'ordre du parcours (`etapes.ts`), qui pose
  // la question avant de laisser avancer — voir le même constat déjà fait sur
  // `CAISSE-URGENCE-REPONSE-OBLIGATOIRE` dans `convocation-aerienne.test.ts`.

  it("INDEPENDANT972-MUTANT-ANCIENNE-ATTENTE-DETECTE", () => {
    // La formule d'avant v9.7.2 indexait l'attente sur `p2_document_dap_determine`,
    // qui reste faux sur la branche orientation caisse (aucun Cerfa n'y est
    // préparé) : c'est justement ce que l'ancienne formule ne savait pas
    // traverser, et que la nouvelle traverse.
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: AVION_BATEAU,
    });
    expect(moteur.evaluate(WAIT).nodeValue).toBe(true);
    expect(moteur.evaluate("p2_document_dap_determine").nodeValue).not.toBe(
      true,
    );
  });
});
