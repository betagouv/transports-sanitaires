// Outil 2 — le parcours administratif du secrétariat : Partie 2 puis Résultat 2.
//
// Comme côté prescripteur, le résultat n'est pas un cul-de-sac : « Précédent »
// rouvre la Partie 2 sur sa dernière page, réponses intactes — et, quand elle
// n'avait rien à poser, ramène au résultat médical, qui est alors l'écran d'avant
// (cf. `ecranPrecedent`). Peu importe comment on est arrivé au document : une
// seed rejoue le parcours que ses réponses auraient produit.

import type { FormState } from "@publicodes/forms";
import type { Situation } from "publicodes";
import { type ReactNode, useState } from "react";
import { trackResultat } from "../../analytics/evenements";
import {
  CIBLES_ADMINISTRATIVES,
  CIBLES_MEDICALES,
} from "../cibles-du-parcours";
import type { CleDeRegle } from "../contrat-regles-publicodes";
import { moteur, texte } from "../moteur";
import { reprendrePassation } from "../passation";
import { Parcours } from "../questionnaire/Parcours";
import { rejouerLesReponses } from "../questionnaire/rejeu";
import { ResultatFinal } from "./ResultatFinal";

type Props = {
  onNouvelleSimulation: () => void;
  // Seed : situation complète (P1 + P2) ouvrant directement la Page Résultat 2,
  // sans passation. Le parcours qui y mène est rejoué (cf. `amorceDuParcours`).
  situationFinale?: Situation<string> | null;
  /**
   * Retour au résultat médical, seul écran en deçà du document quand la Partie 2
   * n'a rien eu à poser. Le secrétariat sait *quand* il n'a rien derrière lui ;
   * changer d'outil ne lui appartient pas, c'est `App` qui l'opère.
   */
  onRetourAuResultatMedical?: (situationP1: Situation<string>) => void;
  /** Transmis tel quel à la Page Résultat 2 (cf. `ResultatFinal`). */
  documentTelechargeable?: (situation: Situation<string>) => ReactNode;
};

// La situation initiale (P1) rend les questions de Partie 1 déjà répondues :
// `Parcours` ne présente donc que la Partie 2, et bascule directement au
// résultat quand le cas est tranché dès la Partie 1.
export function Secretariat({
  onNouvelleSimulation,
  situationFinale = null,
  onRetourAuResultatMedical,
  documentTelechargeable,
}: Props) {
  const parcours = useParcoursAdministratif(situationFinale);

  // Situation complète déjà connue (parcours P2 terminé, ou seed ouverte) :
  // affiche directement la Page Résultat 2.
  if (parcours.situation) {
    return (
      <ResultatFinal
        situation={parcours.situation}
        onNouvelleSimulation={onNouvelleSimulation}
        onPrecedent={ecranPrecedent(parcours, onRetourAuResultatMedical)}
        documentTelechargeable={documentTelechargeable}
      />
    );
  }

  if (!parcours.situationP1) {
    return <AucunePrescription onNouvelleSimulation={onNouvelleSimulation} />;
  }

  return (
    <Qualification
      situationP1={parcours.situationP1}
      etatInitial={parcours.etatQuestionnaire}
      onTermine={parcours.conclure}
    />
  );
}

// ---- implémentation ----

/**
 * L'écran en deçà du document : la dernière page de la Partie 2 quand elle a posé
 * des questions, le résultat médical sinon — un cas tranché dès la Partie 1 n'a
 * rien à qualifier, et c'est de là qu'on vient.
 *
 * Le retour au résultat médical ne rouvre donc *pas* une décision qu'un
 * questionnaire administratif aurait qualifiée : là où la Partie 2 a été
 * répondue, « Précédent » ramène dans ses pages, et ses réponses — qui ne
 * survivraient pas à un changement d'outil — restent où elles sont.
 */
function ecranPrecedent(
  parcours: ReturnType<typeof useParcoursAdministratif>,
  onRetourAuResultatMedical: Props["onRetourAuResultatMedical"],
) {
  const { retourAuQuestionnaire, situationP1 } = parcours;
  if (retourAuQuestionnaire) return retourAuQuestionnaire;
  if (!onRetourAuResultatMedical || !situationP1) return undefined;
  return () => onRetourAuResultatMedical(situationP1);
}

// L'avancement du parcours administratif : les réponses acquises en Partie 1, la
// situation conclue, et derrière elle le questionnaire à rouvrir.
// `retourAuQuestionnaire` est absent quand la Partie 2 n'a rien eu à poser (cf.
// `retourPossible`).
function useParcoursAdministratif(situationFinale: Situation<string> | null) {
  const [situation, setSituation] = useState<Situation<string> | null>(
    situationFinale,
  );
  const [amorce] = useState(() => amorceDuParcours(situationFinale));
  const [etatQuestionnaire, setEtatQuestionnaire] = useState(amorce.parcours);
  return {
    situation,
    situationP1: amorce.situationP1,
    etatQuestionnaire,
    retourAuQuestionnaire: etatQuestionnaire && (() => setSituation(null)),
    conclure: (s: Situation<string>, etat: FormState<string>) => {
      setEtatQuestionnaire(retourPossible(etat) ? etat : undefined);
      setSituation(s);
    },
  };
}

/**
 * Ce dont part le secrétariat. Le cas courant est la passation : le prescripteur
 * a mené la Partie 1, sa situation attend, et le questionnaire administratif se
 * pose par-dessus.
 *
 * Une seed de résultat, elle, n'a traversé ni l'une ni l'autre — elle n'est
 * qu'un pré-remplissage des réponses. On lui rejoue donc les deux parcours à la
 * suite : la Partie 1 pour retrouver la situation que la passation aurait
 * portée, puis la Partie 2 par-dessus. Sans quoi le document n'aurait rien
 * derrière lui, et le « Précédent » manquerait là où un utilisateur l'aurait eu.
 */
function amorceDuParcours(situationFinale: Situation<string> | null) {
  const passation = reprendrePassation();
  if (!situationFinale) return { situationP1: passation, parcours: undefined };
  const partie1 = rejouerLesReponses({
    cibles: CIBLES_MEDICALES,
    reponses: situationFinale,
  });
  const partie2 = rejouerLesReponses({
    cibles: CIBLES_ADMINISTRATIVES,
    reponses: situationFinale,
    situationInitiale: partie1.situation,
  });
  return {
    situationP1: partie1.situation,
    parcours: retourPossible(partie2) ? partie2 : undefined,
  };
}

// Le complément d'adresse et le pays sont offerts, pas exigés : le modèle ne les
// compte pas dans `p2_adresses_obligatoires_completes`. Les cibler les fait poser
// (cf. ci-dessus) ; sans cette liste, les poser reviendrait à les rendre
// obligatoires, et la page ne se quitterait plus sans un pays pour un trajet
// franco-français.
const SAISIES_FACULTATIVES = [
  "p2_depart_complement_adresse",
  "p2_depart_pays",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_pays",
] as const satisfies readonly CleDeRegle[];

// M1.1 ouvre la Partie 2 : c'est là qu'il faut dire ce que cette partie peut, et
// surtout ne peut pas, changer — le mode de transport est arrêté en Partie 1.
const RAPPEL_PORTEE_ADMINISTRATIVE = {
  question: "p2_contexte_administratif",
  texte:
    "Les réponses apportées dans cette partie déterminent le régime de prise en charge et le document à utiliser. Elles ne peuvent pas modifier le mode de transport validé par le prescripteur.",
} as const;

// Partie 2 du questionnaire : la Partie 1 étant déjà répondue, `Parcours` ne
// pose que les questions administratives — et bascule droit au résultat quand le
// cas était déjà tranché en Partie 1.
function Qualification({
  situationP1,
  etatInitial,
  onTermine,
}: {
  situationP1: Situation<string>;
  etatInitial?: FormState<string>;
  onTermine: (situation: Situation<string>, etat: FormState<string>) => void;
}) {
  return (
    <>
      <h1 className="fr-h3">Qualification du document à remettre au patient</h1>
      <Parcours
        outil="secretariat"
        etatInitial={etatInitial}
        cibles={CIBLES_ADMINISTRATIVES}
        facultatives={SAISIES_FACULTATIVES}
        situationInitiale={situationP1}
        libelleFin="Voir le document à remettre au patient"
        bandeau={RAPPEL_PORTEE_ADMINISTRATIVE}
        onTermine={(s, etat) => {
          onTermine(s, etat);
          trackResultat(
            texte(moteur.setSituation(s), "cible_cas_final"),
            "secretariat",
          );
        }}
      />
    </>
  );
}

// Un cas tranché dès la Partie 1 ne pose aucune question administrative : le
// parcours conclut sans écran, et « Précédent » rouvrirait un questionnaire qui
// se refermerait aussitôt. Le retour n'a de sens qu'après une page réellement
// présentée.
function retourPossible(etat: FormState<string>): boolean {
  return etat.pages.some((page) => page.elements.length > 0);
}

// Le secrétariat a été ouvert sans passation : il n'y a rien à qualifier tant
// que l'évaluation médicale n'a pas eu lieu.
function AucunePrescription({
  onNouvelleSimulation,
}: Pick<Props, "onNouvelleSimulation">) {
  return (
    <div>
      <div className="fr-alert fr-alert--info" style={{ marginBottom: "2rem" }}>
        <h3 className="fr-alert__title">Aucune prescription en attente</h3>
        <p>Commencez par l'évaluation médicale du transport.</p>
      </div>
      <button type="button" className="fr-btn" onClick={onNouvelleSimulation}>
        Aller à l'évaluation médicale
      </button>
    </div>
  );
}
