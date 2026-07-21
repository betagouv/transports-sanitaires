// Racine de l'app : **écran-porte** d'identification devant les simulateurs.
// Tant que le prescripteur n'est pas identifié, seul l'écran d'identification
// s'affiche — impossible de simuler sans s'être identifié (voir
// docs/architecture/identification.md — ADR-1).
//
// À la validation, on convertit l'identité saisie en identité pseudonymisée via
// l'API (`pseudonymiserViaApi`), on la range en session (pour Matomo), puis on
// bascule sur le simulateur. Un échec de l'API n'empêche pas d'entrer (identité
// `null` : suivi analytics dégradé).
//
// Deux outils partagent le même moteur derrière la porte : le parcours médical
// du **prescripteur** et le parcours administratif du **secrétariat**. Le
// premier passe la main au second via la passation (situation de Partie 1). Le
// point d'entrée initial peut être forcé par `?outil=secretariat`.

import { useState } from "react";
import type { Situation } from "publicodes";
import { Identification } from "../identification/Identification";
import { Prescripteur } from "../prescripteur/Prescripteur";
import { Secretariat } from "../secretariat/Secretariat";
import { referentielHttp } from "../identification/referentiel-http";
import { pseudonymiserViaApi } from "../identite/pseudonymisation-http";
import { setIdentite } from "../identite/session";
import { effacerPassation, emettrePassation } from "../simulateur/passation";
import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";
import type { Referentiel } from "../../shared/referentiel";
import type { IdentiteSaisie } from "../../shared/identite-saisie";

type Outil = "prescripteur" | "secretariat";

// Raccourcis dev : les deux premières variantes ouvrent la Page Résultat 1
// (prescripteur, situation de Partie 1) ; les deux dernières ouvrent directement
// la Page Résultat 2 finale (secrétariat, situation complète P1 + P2).
type VarianteDev = "favorable" | "defavorable" | "final-succes" | "final-refus";

// Situation de démo (dev) — cas favorable riche : motif hospitalisation +
// critère « position allongée » (⇒ ambulance). Ouvre directement le résultat
// prescripteur avec critères et motifs retenus renseignés.
const SITUATION_DEMO_DEV_FAVORABLE: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'non'",
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
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
};

// Situation de démo (dev) — cas défavorable : aucun motif ouvrant droit et
// aucune situation encadrée (⇒ transport non justifié médicalement).
const SITUATION_DEMO_DEV_DEFAVORABLE: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'non'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "oui",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "non",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "oui",
};

// Situation de démo (dev) — Page Résultat 2 finale, cas succès : P1 favorable
// (motif ALD validé + critère « position allongée » ⇒ ambulance) puis P2
// complète menant à cas_final = « prescription médicale de transport ».
const SITUATION_DEMO_DEV_FINAL_SUCCES: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'non'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "oui",
  p1_ald_lien_avec_ald_reconnue: "oui",
  p1_ald_seance_specifique: "non",
  p1_ald_incapacite_ou_deficience: "oui",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "non",
  p2_convocation_ou_avis: "non",
  p2_distance_aller_superieure_150km: "non",
  p2_transport_en_serie: "oui",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  p2_trajet_aller_retour: "'aller simple'",
  p2_trajet_depart: "'domicile'",
  p2_trajet_arrivee: "'structure de soins'",
  p2_nombre_transports_prevus: "4",
  p2_transport_urgence: "'non'",
  p2_accident_cause_par_tiers: "non",
};

// Situation de démo (dev) — Page Résultat 2 finale, cas refus : même P1
// favorable (⇒ ambulance) puis P2 (patient détenu hospitalisé, hors exceptions)
// menant à cas_final = « non éligible assurance maladie dans ce parcours ».
const SITUATION_DEMO_DEV_FINAL_REFUS: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'non'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "oui",
  p1_ald_lien_avec_ald_reconnue: "oui",
  p1_ald_seance_specifique: "non",
  p1_ald_incapacite_ou_deficience: "oui",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "oui",
  p2_exception_restant_assurance_maladie: "oui",
  p2_exception_type: "'Retour en HAD (Hospitalisation À Domicile).'",
  p2_detenu_hospitalise: "oui",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",
  p2_detenu_retour_etablissement_penitentiaire: "non",
};

const SITUATIONS_DEMO_DEV: Record<VarianteDev, Situation<string>> = {
  favorable: SITUATION_DEMO_DEV_FAVORABLE,
  defavorable: SITUATION_DEMO_DEV_DEFAVORABLE,
  "final-succes": SITUATION_DEMO_DEV_FINAL_SUCCES,
  "final-refus": SITUATION_DEMO_DEV_FINAL_REFUS,
};

// Outil ciblé par chaque raccourci dev : résultat médical (prescripteur) pour les
// variantes P1, résultat final (secrétariat) pour les variantes P2.
const OUTIL_DEV: Record<VarianteDev, Outil> = {
  favorable: "prescripteur",
  defavorable: "prescripteur",
  "final-succes": "secretariat",
  "final-refus": "secretariat",
};

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  pseudonymiser?: (saisie: IdentiteSaisie) => Promise<IdentitePseudonymisee | null>;
};

function outilInitial(): Outil {
  const p = new URLSearchParams(window.location.search).get("outil");
  return p === "secretariat" ? "secretariat" : "prescripteur";
}

export function App({
  referentiel = referentielHttp,
  pseudonymiser = pseudonymiserViaApi,
}: Props = {}) {
  const [identifie, setIdentifie] = useState(false);
  const [outil, setOutil] = useState<Outil>(outilInitial);
  // Remonté à chaque nouvelle simulation pour remonter (remount) l'outil et
  // repartir d'un parcours vierge.
  const [cle, setCle] = useState(0);
  // Raccourci dev : situation pré-remplie pour ouvrir directement le résultat.
  const [situationDev, setSituationDev] = useState<Situation<string> | null>(
    null
  );

  async function handleValide(saisie: IdentiteSaisie) {
    setIdentite(await pseudonymiser(saisie));
    setIdentifie(true);
  }

  // Raccourci dev : saute l'identification (identité non pseudonymisée, suivi
  // analytics dégradé) et ouvre directement une page de résultat sur une
  // situation type — résultat médical (prescripteur) ou résultat final
  // (secrétariat) selon la variante.
  function accesDirectDev(variante: VarianteDev) {
    setSituationDev(SITUATIONS_DEMO_DEV[variante]);
    setOutil(OUTIL_DEV[variante]);
    setIdentifie(true);
  }

  function recommencer() {
    effacerPassation();
    setSituationDev(null);
    setCle((c) => c + 1);
    setOutil("prescripteur");
  }

  if (!identifie) {
    return (
      <Identification
        referentiel={referentiel}
        onValide={handleValide}
        onAccesDirectDev={import.meta.env.DEV ? accesDirectDev : undefined}
      />
    );
  }

  const contenu =
    outil === "prescripteur" ? (
      <Prescripteur
        key={cle}
        situationInitiale={situationDev}
        onPasserAuSecretariat={(situationP1: Situation<string>) => {
          emettrePassation(situationP1);
          setOutil("secretariat");
        }}
        onNouvelleSimulation={recommencer}
      />
    ) : (
      <Secretariat
        key={cle}
        situationFinale={situationDev}
        onNouvelleSimulation={recommencer}
      />
    );

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      {contenu}
    </main>
  );
}
