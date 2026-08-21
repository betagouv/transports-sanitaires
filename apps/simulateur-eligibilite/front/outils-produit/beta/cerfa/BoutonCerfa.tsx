// Action de fin de parcours : télécharger le CERFA pré-rempli.
//
// Lequel, c'est le cas final qui le dit (cf. `documents.ts`). Les cas finaux qui
// n'ouvrent aucun CERFA — une convocation, un formulaire interne d'établissement,
// aucun document du tout — ne rendent rien : la Page Résultat 2 propose la place,
// c'est ici qu'on sait s'il y a de quoi la remplir.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import { useState } from "react";
import { trackCerfaTelecharge } from "../../../analytics/evenements";
import type { DocumentCerfa, OptionsGénération } from "./document";
import { genererCerfa, nomFichier, telecharger } from "./document";
import { documentPour } from "./documents";

type Props = {
  moteur: Engine<string>;
  situation: Situation<string>;
  /** Injectable pour les tests (défaut = asset servi par l'application). */
  chargerGabarit?: OptionsGénération["chargerGabarit"];
};

export function BoutonCerfa({ moteur, situation, chargerGabarit }: Props) {
  const casFinal = String(
    moteur.setSituation(situation).evaluate("cible_cas_final").nodeValue ?? "",
  );
  const document = documentPour(casFinal);
  if (!document) return null;
  return (
    <Telechargement
      document={document}
      moteur={moteur}
      situation={situation}
      chargerGabarit={chargerGabarit}
    />
  );
}

// ---- implémentation ----

function Telechargement({
  document,
  moteur,
  situation,
  chargerGabarit,
}: Props & { document: DocumentCerfa }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function telechargerCerfa() {
    setEnCours(true);
    setErreur(null);
    setErreur(
      await genererEtTelecharger(document, moteur, situation, chargerGabarit),
    );
    setEnCours(false);
  }

  return (
    <section className="fr-mt-4w">
      <CeQueLeCerfaContient document={document} />
      {erreur && <AlerteErreur message={erreur} />}
      <button
        type="button"
        className="fr-btn fr-icon-download-line fr-btn--icon-left"
        onClick={telechargerCerfa}
        disabled={enCours}
      >
        {enCours ? "Génération en cours…" : document.libelléDuBouton}
      </button>
    </section>
  );
}

function AlerteErreur({ message }: { message: string }) {
  return (
    <div
      className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w"
      role="alert"
    >
      <p>{message}</p>
    </div>
  );
}

// Renvoie le message d'erreur à afficher, ou `null` si le PDF est parti. Le
// parcours reste exploitable sans le document : un échec se signale, il ne
// masque pas le résultat déjà affiché.
async function genererEtTelecharger(
  document: DocumentCerfa,
  moteur: Props["moteur"],
  situation: Props["situation"],
  chargerGabarit: Props["chargerGabarit"],
): Promise<string | null> {
  try {
    telecharger(
      await genererCerfa(document, moteur, situation, { chargerGabarit }),
      nomFichier(document),
    );
    trackCerfaTelecharge(document.fichier);
    return null;
  } catch (cause) {
    console.error("[cerfa] Génération impossible.", cause);
    return "Le document n'a pas pu être généré. Réessayez, ou remplissez le CERFA manuellement.";
  }
}

// Ce que la simulation a rempli, et ce qui reste au prescripteur : l'annoncer
// avant le clic évite d'ouvrir le PDF pour le découvrir.
function CeQueLeCerfaContient({ document }: { document: DocumentCerfa }) {
  return (
    <>
      <h3 className="fr-h5">{document.titre}</h3>
      <p>
        Le CERFA {document.numero} pré-rempli à partir de cette simulation :{" "}
        {document.ceQuiEstRempli}.
      </p>
      <p className="fr-text--sm fr-mb-2w">
        <span className="fr-icon-edit-line fr-mr-1w" aria-hidden="true" />
        Restent à compléter et à signer : {document.ceQuiResteASaisir}. Tous les
        champs restent modifiables.
      </p>
    </>
  );
}
