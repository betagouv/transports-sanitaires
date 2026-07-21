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

// Situation de démo (dev) : cas favorable riche — motif hospitalisation +
// critère « position allongée » (⇒ ambulance). Ouvre directement le résultat
// prescripteur avec critères et motifs retenus renseignés.
const SITUATION_DEMO_DEV: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "non",
  p1_motif_hospitalisation: "oui",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'aucune de ces situations'",
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
  // analytics dégradé) et ouvre le résultat prescripteur sur une situation type.
  function accesDirectDev() {
    setSituationDev(SITUATION_DEMO_DEV);
    setOutil("prescripteur");
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
      <Secretariat key={cle} onNouvelleSimulation={recommencer} />
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
