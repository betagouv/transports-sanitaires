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
import type {
  DocumentCerfa,
  OptionsGénération,
  RevisionDuTexteMedical,
} from "./document";
import { genererCerfa, nomFichier, telecharger } from "./document";
import { documentPour } from "./documents";
import { DebordementDuTexteMedical } from "./elements-medicaux/debordement-du-texte-medical";
import { ReviserLeTexteMedical } from "./ReviserLeTexteMedical";

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
  const etat = useTelechargement(document, moteur, situation, chargerGabarit);
  return (
    <section className="fr-mt-4w">
      <CeQueLeCerfaContient document={document} />
      {etat.erreur && <AlerteErreur message={etat.erreur} />}
      {etat.revision && (
        <ReviserLeTexteMedical
          revision={etat.revision}
          deborde={etat.deborde}
          onChange={etat.reviser}
        />
      )}
      <button
        type="button"
        className="fr-btn fr-icon-download-line fr-btn--icon-left"
        onClick={etat.telechargerCerfa}
        disabled={etat.enCours || etat.revision?.revise.trim() === ""}
      >
        {libelleDuBouton(document, etat.enCours, etat.deborde)}
      </button>
    </section>
  );
}

// L'état d'un téléchargement : en cours, en échec, ou en révision du texte
// médical après un débordement.
function useTelechargement(
  document: DocumentCerfa,
  moteur: Props["moteur"],
  situation: Props["situation"],
  chargerGabarit: Props["chargerGabarit"],
) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [revision, setRevision] = useState<RevisionDuTexteMedical>();
  const [deborde, setDeborde] = useState(false);

  async function telechargerCerfa() {
    setEnCours(true);
    setErreur(null);
    const issue = await genererEtTelecharger(document, moteur, situation, {
      chargerGabarit,
      revision,
    });
    setDeborde(issue.statut === "debordement");
    if (issue.statut === "debordement")
      setRevision(prochaineRevision(revision, issue.texte));
    if (issue.statut === "echec") setErreur(issue.message);
    setEnCours(false);
  }

  const reviser = (revise: string) =>
    setRevision((courante) => courante && { ...courante, revise });
  return { enCours, erreur, revision, deborde, telechargerCerfa, reviser };
}

function libelleDuBouton(
  document: DocumentCerfa,
  enCours: boolean,
  deborde: boolean,
): string {
  if (enCours) return "Génération en cours…";
  return deborde ? "Remesurer et télécharger" : document.libelléDuBouton;
}

// Un débordement du texte déjà révisé garde la révision en cours. Tout autre
// débordement vient d'un texte composé, neuf ou recomposé après un changement
// de réponses : c'est lui qu'on propose de réviser.
function prochaineRevision(
  revision: RevisionDuTexteMedical | undefined,
  texte: string,
): RevisionDuTexteMedical {
  if (revision && texte === revision.revise) return revision;
  return { compose: texte, revise: texte };
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

// L'issue d'un clic. Le parcours reste exploitable sans le document : un
// échec se signale, il ne masque pas le résultat déjà affiché.
type Issue =
  | { statut: "parti" }
  | { statut: "debordement"; texte: string }
  | { statut: "echec"; message: string };

async function genererEtTelecharger(
  document: DocumentCerfa,
  moteur: Props["moteur"],
  situation: Props["situation"],
  options: OptionsGénération,
): Promise<Issue> {
  try {
    telecharger(
      await genererCerfa(document, moteur, situation, options),
      nomFichier(document),
    );
    trackCerfaTelecharge(document.fichier);
    return { statut: "parti" };
  } catch (cause) {
    if (cause instanceof DebordementDuTexteMedical)
      return { statut: "debordement", texte: cause.texte };
    console.error("[cerfa] Génération impossible.", cause);
    return {
      statut: "echec",
      message:
        "Le document n'a pas pu être généré. Réessayez, ou remplissez le CERFA manuellement.",
    };
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
