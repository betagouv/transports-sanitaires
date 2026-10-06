// Le simulateur : un questionnaire, son résultat, puis le complément posé une
// fois le résultat verrouillé.
//
// Tant que le résultat n'est pas verrouillé, « Précédent » rouvre le
// questionnaire sur sa dernière page, réponses intactes. C'est l'action
// principale du résultat qui verrouille : le complément est un second parcours,
// qui reçoit les réponses acquises sans en reposer aucune, et dont la première
// page n'a pas de « Précédent ». Le verrou tient à ce montage, pas à un drapeau.

import { type ReactNode, useState } from "react";
import {
  decider,
  NOMBRE_DE_PARTIES,
  PAGES_APRES_VERROU,
  PAGES_AVANT_VERROU,
} from "./parcours-factice";
import { ParcoursForm } from "./questionnaire/ParcoursForm";
import type { EtatDuParcours } from "./questionnaire/passation";
import { etatApresLesReponses } from "./questionnaire/passation";
import type { Reponses } from "./questionnaire/question";
import { TraceDebug } from "./resultat/TraceDebug";

type Props = {
  onNouvelleSimulation: () => void;
  // Seed : pré-remplit le questionnaire. Complète, elle ouvre le résultat ;
  // sinon, la première page qu'elle laisse sans réponse.
  reponsesDeSeed?: Reponses | null;
  // Encadré des developer tools, rendu tel quel sous le questionnaire. Le
  // simulateur sait *où* il s'affiche, pas ce qu'il contient : c'est `App` qui le
  // compose, et il est absent hors du service produit.
  panneauDeveloperTools?: ReactNode;
  // Traces de debug ouvertes sous le questionnaire et sous les résultats. Même
  // garde que le panneau ci-dessus, portée par un booléen : la trace lit l'état
  // vivant du parcours, `App` ne peut donc pas la composer d'avance.
  traceDebug?: boolean;
};

export function Simulateur({
  onNouvelleSimulation,
  reponsesDeSeed = null,
  panneauDeveloperTools,
  traceDebug = false,
}: Props) {
  const [ecran, allerA] = useState<Ecran>(() => ecranDeDepart(reponsesDeSeed));
  const commun = { allerA, traceDebug, onRecommencer: onNouvelleSimulation };

  switch (ecran.nom) {
    case "questionnaire":
      return (
        <>
          <Questionnaire ecran={ecran} {...commun} />
          {panneauDeveloperTools}
        </>
      );
    case "resultat":
      return <ResultatAVerrouiller ecran={ecran} {...commun} />;
    case "complement":
      return <Complement ecran={ecran} {...commun} />;
    default:
      return <CommandeCompletee ecran={ecran} {...commun} />;
  }
}

// ---- implémentation ----

// `derriere` est le parcours qu'un résultat a derrière lui : c'est lui que
// « Précédent » rouvre. Passé le verrou, l'état du questionnaire n'est plus
// porté par aucun écran : il n'y a plus rien à rouvrir.
type Ecran =
  | { nom: "questionnaire"; reprise?: EtatDuParcours }
  | { nom: "resultat"; derriere: EtatDuParcours }
  | { nom: "complement"; acquises: Reponses; reprise?: EtatDuParcours }
  | { nom: "fin"; acquises: Reponses; derriere: EtatDuParcours };

type EcranProps<Nom extends Ecran["nom"]> = {
  ecran: Extract<Ecran, { nom: Nom }>;
  allerA: (ecran: Ecran) => void;
  traceDebug: boolean;
  onRecommencer: () => void;
};

// Une seed n'est qu'un pré-remplissage : à réponses égales, l'application se
// comporte comme sous les doigts d'un utilisateur, « Précédent » compris.
function ecranDeDepart(reponsesDeSeed: Reponses | null): Ecran {
  if (!reponsesDeSeed) return { nom: "questionnaire" };
  const { complet, ...etat } = etatApresLesReponses(
    PAGES_AVANT_VERROU,
    reponsesDeSeed,
  );
  return complet
    ? { nom: "resultat", derriere: etat }
    : { nom: "questionnaire", reprise: etat };
}

function Questionnaire({
  ecran,
  allerA,
  traceDebug,
}: EcranProps<"questionnaire">) {
  return (
    <>
      <h1 className="fr-h3">Parcours factice</h1>
      <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-4w">
        <p>
          Ce parcours ne décide rien. Il éprouve la navigation, le temps que le
          modèle d’éligibilité suivant soit intégré.
        </p>
      </div>
      <ParcoursForm
        pages={PAGES_AVANT_VERROU}
        nombreDeParties={NOMBRE_DE_PARTIES}
        etatInitial={ecran.reprise}
        mesure
        libelleFin="Voir le résultat"
        traceDebug={traceDebug}
        onTermine={(_, derriere) => allerA({ nom: "resultat", derriere })}
      />
    </>
  );
}

// Le verrou ne s'annonce pas à l'écran : l'interface nomme l'action, et le
// « Précédent » de cette page dit ce qui reste ouvert.
function ResultatAVerrouiller({
  ecran,
  allerA,
  traceDebug,
  onRecommencer,
}: EcranProps<"resultat">) {
  const { reponses } = ecran.derriere;
  const sorties = decider(reponses);
  const rouvrir = () =>
    allerA({ nom: "questionnaire", reprise: ecran.derriere });
  const verrouiller = () => allerA({ nom: "complement", acquises: reponses });
  return (
    <>
      <h1 className="fr-h3">Résultat</h1>
      <p className="fr-text--lead">Commande : {sorties.commande}</p>
      <div className="fr-btns-group fr-btns-group--inline">
        <BoutonSecondaire onClick={rouvrir}>Précédent</BoutonSecondaire>
        <button type="button" className="fr-btn" onClick={verrouiller}>
          Compléter la commande
        </button>
        <BoutonSecondaire onClick={onRecommencer}>
          Nouvelle simulation
        </BoutonSecondaire>
      </div>
      <TraceDebug
        autorisee={traceDebug}
        titre="résultat"
        reponses={reponses}
        sorties={sorties}
      />
    </>
  );
}

// Le complément n'émet pas d'évènement : ce qu'on y mesurera se décidera avec
// les documents du modèle suivant.
function Complement({ ecran, allerA, traceDebug }: EcranProps<"complement">) {
  const { acquises } = ecran;
  return (
    <>
      <h1 className="fr-h3">Compléter la commande</h1>
      <ParcoursForm
        pages={PAGES_APRES_VERROU}
        nombreDeParties={NOMBRE_DE_PARTIES}
        reponsesAcquises={acquises}
        etatInitial={ecran.reprise}
        mesure={false}
        libelleFin="Terminer"
        traceDebug={traceDebug}
        onTermine={(_, derriere) => allerA({ nom: "fin", acquises, derriere })}
      />
    </>
  );
}

// « Précédent » revient au complément, jamais en deçà du verrou.
function CommandeCompletee({
  ecran,
  allerA,
  traceDebug,
  onRecommencer,
}: EcranProps<"fin">) {
  const { reponses } = ecran.derriere;
  const sorties = decider(reponses);
  const rouvrir = () =>
    allerA({
      nom: "complement",
      acquises: ecran.acquises,
      reprise: ecran.derriere,
    });
  return (
    <>
      <h1 className="fr-h3">Commande complétée</h1>
      <p className="fr-text--lead">
        Commande : {sorties.commande}, {String(reponses.quantite)} tasses
      </p>
      <div className="fr-btns-group fr-btns-group--inline">
        <BoutonSecondaire onClick={rouvrir}>Précédent</BoutonSecondaire>
        <button type="button" className="fr-btn" onClick={onRecommencer}>
          Nouvelle simulation
        </button>
      </div>
      <TraceDebug
        autorisee={traceDebug}
        titre="commande complétée"
        reponses={reponses}
        sorties={sorties}
      />
    </>
  );
}

function BoutonSecondaire({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="fr-btn fr-btn--secondary"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
