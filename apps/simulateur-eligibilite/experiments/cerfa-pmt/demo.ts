// Démonstration de bout en bout : une situation du simulateur → un CERFA rempli.
//
//   node --experimental-strip-types experiments/cerfa-pmt/demo.ts [sortie.pdf]
//
// Le PDF produit montre ce que le simulateur sait déduire (cases ❶ et ❷, trajet,
// urgence) et, par contraste, tout ce qui reste vierge — patient, adresses,
// identité du prescripteur.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Engine from "publicodes";
import type { RawPublicodes, Situation } from "publicodes";
import yaml from "js-yaml";
import { saisiesDepuisSituation } from "./depuis-simulateur.ts";
import { remplirCerfa } from "./remplir-cerfa.ts";

const ici = dirname(fileURLToPath(import.meta.url));
const règles = yaml.load(
  readFileSync(join(ici, "../../regles/regles.publicodes"), "utf-8"),
) as RawPublicodes<string>;

// Situation d'exemple : sortie d'hospitalisation, patient nécessitant brancardage
// et position allongée → le moteur conclut à une ambulance. Aller-retour depuis le
// domicile, deux transports prévus.
const situation: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  p1_motif_hospitalisation: "oui",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "oui",
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
  p2_prestation_prise_en_charge_assurance_maladie: "oui",
  p2_distance_aller_superieure_150km: "non",
  p2_chaque_trajet_aller_superieur_50km: "non",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  p2_trajet_aller_retour: "'Aller-retour'",
  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Structure de soins'",
  p2_nombre_transports_prevus: "2",
  p2_transport_urgence: "'Non'",
  p2_accident_cause_par_tiers: "'Non'",
  p2_convocation_ou_avis_type: "'Convocation du contrôle médical.'",
};

const moteur = new Engine(règles, { flag: { filterNotApplicablePossibilities: true } });
const saisies = saisiesDepuisSituation(moteur, situation);

console.log(`mode prescrit  : ${moteur.setSituation(situation).evaluate("cible_transport_sanitaire_prescrit").nodeValue}`);
console.log(`champs déduits : ${saisies.length}`);
for (const saisie of saisies) {
  console.log("  " + ("case" in saisie ? `[x] ${saisie.case.nom}` : `    ${saisie.champ} = ${saisie.texte}`));
}

const sortie = process.argv[2] ?? join(ici, "demo-rempli.pdf");
const gabarit = readFileSync(join(ici, "gabarit/cerfa-11574-07.pdf"));
writeFileSync(sortie, await remplirCerfa(gabarit, saisies));
console.log(`\nPDF écrit : ${sortie}`);
