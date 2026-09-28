// Le référentiel des évènements Matomo, et le seul module que le reste de
// l'app importe pour tracer. Le transport (tag Matomo, file `_paq`) est
// derrière, dans `matomo.ts`.
//
// Ce module ne connaît que les noms d'évènement : aucune donnée métier (outil,
// statut, formulaire) n'y est interprétée. C'est l'appelant qui choisit
// l'entrée du référentiel à émettre — voir docs/knowledge/adr/analytics.md.

import { emettre } from "./matomo";

/**
 * Les trois CERFA que le parcours sait produire (cf. `DocumentCerfa.fichier`
 * dans `outils-produit/beta/cerfa/document.ts`). Le type vit ici, pas là-bas :
 * c'est ce référentiel qui doit rester la seule source du nom d'évènement, et
 * `document.ts` s'y range pour que les deux ne puissent pas diverger.
 */
export type Formulaire =
  | "prescription-medicale-transport"
  | "demande-accord-prealable"
  | "prescription-permission-sortie";

/**
 * Référentiel des évènements Matomo : chaque nom est fixe, hardcodé — outil,
 * et pour un résultat ou un CERFA le slug, compris — jamais composé à la
 * volée. `trackEvenement` ci-dessous refuse à la compilation tout nom qui
 * n'en soit pas une valeur exacte.
 *
 * Les slugs de `resultat` traduisent `cible_cas_final` (secretariat) et
 * `cible_resultat_medical` (prescripteur), deux cibles publicodes dont la
 * valeur est une phrase d'affichage — jusqu'à 152 caractères pour l'une
 * d'elles. Ce référentiel ne les connaît pas : c'est l'appelant
 * (`secretariat/`, `prescripteur/`) qui traduit sa phrase vers le slug
 * correspondant avant d'émettre.
 *
 * Un objet `as const`, pas un `enum` : `erasableSyntaxOnly` (tsconfig) interdit
 * l'`enum`, qui engendre du code non effaçable à la compilation.
 */
export const NomEvenement = {
  prescripteur: {
    simulationStart: "prescripteur:simulation_start",
    simulationStep: "prescripteur:simulation_step",
    simulationComplete: "prescripteur:simulation_complete",
    simulationAbandon: "prescripteur:simulation_abandon",
    resultat: {
      vp: "prescripteur:resultat:vp",
      tp_terrestre: "prescripteur:resultat:tp_terrestre",
      ambulance: "prescripteur:resultat:ambulance",
      vp_ou_tp: "prescripteur:resultat:vp_ou_tp",
      vsl_ou_taxi: "prescripteur:resultat:vsl_ou_taxi",
      vsl_ou_tpmr_ou_taxi_tpmr:
        "prescripteur:resultat:vsl_ou_tpmr_ou_taxi_tpmr",
      indetermine: "prescripteur:resultat:indetermine",
    },
  },
  secretariat: {
    simulationStart: "secretariat:simulation_start",
    simulationStep: "secretariat:simulation_step",
    simulationComplete: "secretariat:simulation_complete",
    simulationAbandon: "secretariat:simulation_abandon",
    resultat: {
      transport_charge_etablissement:
        "secretariat:resultat:transport_charge_etablissement",
      permission_sans_motif_medical:
        "secretariat:resultat:permission_sans_motif_medical",
      convocation_ou_avis_audience:
        "secretariat:resultat:convocation_ou_avis_audience",
      orientation_caisse_accord_prealable:
        "secretariat:resultat:orientation_caisse_accord_prealable",
      non_eligible_am: "secretariat:resultat:non_eligible_am",
      prescription_s3141: "secretariat:resultat:prescription_s3141",
      demande_accord_prealable: "secretariat:resultat:demande_accord_prealable",
      prescription_medicale_transport:
        "secretariat:resultat:prescription_medicale_transport",
      indetermine: "secretariat:resultat:indetermine",
    },
    cerfaTelecharge: {
      "prescription-medicale-transport":
        "secretariat:cerfa_telecharge:prescription-medicale-transport",
      "demande-accord-prealable":
        "secretariat:cerfa_telecharge:demande-accord-prealable",
      "prescription-permission-sortie":
        "secretariat:cerfa_telecharge:prescription-permission-sortie",
    } satisfies Record<Formulaire, string>,
  },
} as const;

/** Toutes les valeurs terminales de `NomEvenement`, aplaties en union. */
type ValeurDe<T> = T extends string
  ? T
  : { [K in keyof T]: ValeurDe<T[K]> }[keyof T];

/**
 * Émet un évènement Matomo : le seul point d'entrée du reste de l'app pour
 * tracer. `nom` doit être une valeur exacte de `NomEvenement` — un nom composé
 * au moment de l'appel (gabarit de chaîne, concaténation) ne compile pas.
 */
export function trackEvenement(
  nom: ValeurDe<typeof NomEvenement>,
  valeur?: number,
): void {
  emettre(nom, valeur);
}
