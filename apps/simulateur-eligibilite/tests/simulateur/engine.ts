import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Engine from "publicodes";
import type { RawPublicodes, Situation } from "publicodes";
import yaml from "js-yaml";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../regles");

function loadRules(): RawPublicodes<string> {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".publicodes"))
    .reduce<RawPublicodes<string>>((acc, file) => {
      const content = readFileSync(join(dir, file), "utf-8");
      return { ...acc, ...(yaml.load(content) as RawPublicodes<string>) };
    }, {});
}

export function makeEngine(situation: Situation<string> = {}) {
  return new Engine(loadRules(), {
    flag: { filterNotApplicablePossibilities: true },
  }).setSituation(situation);
}

// Base neutre « tout à non » partagée par les tests métier (le modèle n'a pas de
// `par défaut` : on part de cette base puis on surcharge avec les entrées du
// scénario, comme la validation de référence). Formats de valeurs publicodes
// (booléens `oui`/`non`, énumérés entre quotes simples).
export const BASE_NEUTRE: Record<string, string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_ald_lien_avec_ald_reconnue: "non",
  p1_ald_seance_specifique: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "non",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "non",
  p2_exception_type: "'Non, le transport ne fait pas partie de ces exceptions.'",
  p2_detenu_hospitalise: "non",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",
  p2_detenu_retour_etablissement_penitentiaire: "non",
  p2_convocation_ou_avis: "non",
  // v8.10 : A2.3 applicable en base neutre → répondue « oui » (parcours standard).
  p2_prestation_prise_en_charge_assurance_maladie: "oui",
  p2_distance_aller_superieure_150km: "non",
  p2_chaque_trajet_aller_superieur_50km: "non",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  p2_trajet_aller_retour: "'Aller simple'",
  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Structure de soins'",
  p2_nombre_transports_prevus: "1",
  p2_transport_urgence: "'Non'",
  p2_accident_cause_par_tiers: "'Non'",
  p2_convocation_ou_avis_type: "'Convocation du contrôle médical.'",
};
