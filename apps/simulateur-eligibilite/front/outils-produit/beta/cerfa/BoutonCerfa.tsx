// Action de fin de parcours : télécharger le CERFA de prescription pré-rempli.
//
// N'est proposé que lorsque le cas final est bien une prescription médicale de
// transport (cf. `ResultatFinal`) — un accord préalable relève du formulaire
// S3139, une prise en charge par l'établissement ne donne lieu à aucun CERFA.

import { useState } from "react";
import type { Situation } from "publicodes";
import type Engine from "publicodes";
import {
  genererCerfa,
  nomFichier,
  telecharger,
  type OptionsGénération,
} from "./cerfa";
import { trackCerfaTelecharge } from "../../../analytics/analytics";

type Props = {
  moteur: Engine<string>;
  situation: Situation<string>;
  /** Injectable pour les tests (défaut = asset servi par l'application). */
  chargerGabarit?: OptionsGénération["chargerGabarit"];
};

export function BoutonCerfa({ moteur, situation, chargerGabarit }: Props) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function telechargerCerfa() {
    setEnCours(true);
    setErreur(null);
    try {
      telecharger(
        await genererCerfa(moteur, situation, { chargerGabarit }),
        nomFichier(),
      );
      trackCerfaTelecharge();
    } catch (cause) {
      // Le parcours reste exploitable sans le PDF : on signale l'échec sans
      // masquer le résultat déjà affiché.
      console.error("[cerfa] Génération impossible.", cause);
      setErreur(
        "Le document n'a pas pu être généré. Réessayez, ou remplissez le CERFA manuellement.",
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section className="fr-mt-4w">
      <h3 className="fr-h5">Prescription médicale de transport</h3>
      <p>
        Le CERFA n° 11574*07 pré-rempli à partir de cette simulation : la
        situation ouvrant droit, le mode de transport et sa justification, le
        trajet et le contexte d'urgence y sont déjà cochés, sur les deux volets.
      </p>
      <p className="fr-text--sm fr-mb-2w">
        <span className="fr-icon-edit-line fr-mr-1w" aria-hidden="true" />
        Restent à compléter et à signer : l'identité du patient et de l'assuré,
        celle du prescripteur, les adresses de départ et d'arrivée, ainsi que
        les éléments d'ordre médical. Tous les champs restent modifiables.
      </p>

      {erreur && (
        <div
          className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w"
          role="alert"
        >
          <p>{erreur}</p>
        </div>
      )}

      <button
        className="fr-btn fr-icon-download-line fr-btn--icon-left"
        onClick={telechargerCerfa}
        disabled={enCours}
      >
        {enCours
          ? "Génération en cours…"
          : "Télécharger la prescription pré-remplie"}
      </button>
    </section>
  );
}
