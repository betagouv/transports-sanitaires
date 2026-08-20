// Outil 2 — le parcours administratif du secrétariat : Partie 2 puis Résultat 2.

import type { Situation } from "publicodes";
import { type ReactNode, useState } from "react";
import { trackResultat } from "../../analytics/evenements";
import type { Cible, CleDeRegle } from "../contrat-regles-publicodes";
import { moteur, texte } from "../moteur";
import { reprendrePassation } from "../passation";
import { Parcours } from "../questionnaire/Parcours";
import { ResultatFinal } from "./ResultatFinal";

type Props = {
  onNouvelleSimulation: () => void;
  // Seed : situation complète (P1 + P2) ouvrant directement la Page Résultat 2,
  // sans passation ni parcours administratif.
  situationFinale?: Situation<string> | null;
  /** Transmis tel quel à la Page Résultat 2 (cf. `ResultatFinal`). */
  documentTelechargeable?: (situation: Situation<string>) => ReactNode;
};

// La situation initiale (P1) rend les questions de Partie 1 déjà répondues :
// `Parcours` ne présente donc que la Partie 2, et bascule directement au
// résultat quand le cas est tranché dès la Partie 1.
export function Secretariat({
  onNouvelleSimulation,
  situationFinale = null,
  documentTelechargeable,
}: Props) {
  const situationP1 = reprendrePassation();
  const [situation, setSituation] = useState<Situation<string> | null>(
    situationFinale,
  );

  // Situation complète déjà connue (parcours P2 terminé, ou seed ouverte) :
  // affiche directement la Page Résultat 2.
  if (situation) {
    return (
      <ResultatFinal
        situation={situation}
        onNouvelleSimulation={onNouvelleSimulation}
        documentTelechargeable={documentTelechargeable}
      />
    );
  }

  if (!situationP1) {
    return <AucunePrescription onNouvelleSimulation={onNouvelleSimulation} />;
  }

  return <Qualification situationP1={situationP1} onTermine={setSituation} />;
}

// ---- implémentation ----

// Le cas final et le document, plus les douze sorties qui portent les saisies
// d'adresse. Cibler ces sorties fait collecter leurs questions propres, et rien
// d'autre ne le ferait : le complément et le pays ne sont dans le graphe d'aucune
// autre cible — le CERFA les lit, et les recevait donc toujours vides. Quant aux
// huit obligatoires, la conjonction `p2_adresses_obligatoires_completes` les
// révélait **une par une** : publicodes n'évalue pas ce qui suit sa première
// condition non satisfaite, si bien qu'une seule adresse manquait à la fois — et
// qu'aucune pagination n'aurait pu les réunir.
const CIBLES_ADMINISTRATIVES = [
  "cible_cas_final",
  "cible_document_a_remettre_au_patient",
  "cible_document_depart_nom",
  "cible_document_depart_adresse",
  "cible_document_depart_complement",
  "cible_document_depart_code_postal",
  "cible_document_depart_commune",
  "cible_document_depart_pays",
  "cible_document_arrivee_nom",
  "cible_document_arrivee_adresse",
  "cible_document_arrivee_complement",
  "cible_document_arrivee_code_postal",
  "cible_document_arrivee_commune",
  "cible_document_arrivee_pays",
] as const satisfies readonly Cible[];

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
  onTermine,
}: {
  situationP1: Situation<string>;
  onTermine: (situation: Situation<string>) => void;
}) {
  return (
    <>
      <h1 className="fr-h3">Qualification du document à remettre au patient</h1>
      <Parcours
        outil="secretariat"
        cibles={CIBLES_ADMINISTRATIVES}
        facultatives={SAISIES_FACULTATIVES}
        situationInitiale={situationP1}
        libelleFin="Voir le document à remettre au patient"
        bandeau={RAPPEL_PORTEE_ADMINISTRATIVE}
        onTermine={(s) => {
          onTermine(s);
          trackResultat(
            texte(moteur.setSituation(s), "cible_cas_final"),
            "secretariat",
          );
        }}
      />
    </>
  );
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
