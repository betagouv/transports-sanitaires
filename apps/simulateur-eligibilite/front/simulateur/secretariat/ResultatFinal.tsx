// Page Résultat 2 — document à imprimer et à remettre au patient.
//
// Ce module n'est plus qu'un **assemblage** : il évalue une fois les cibles dont
// les trois blocs ont besoin, puis les leur passe. Chaque bloc vit dans son propre
// fichier — c'est le seul endroit qui connaisse leur ordre.

import type { Situation } from "publicodes";
import type { ReactNode } from "react";
import { moteur, texte, vrai } from "../moteur";
import { TraceDebug } from "../resultat/TraceDebug";
import type { Article80 } from "./Article80";
import { Bloc1Resultat } from "./Bloc1Resultat";
import { Bloc2Etapes } from "./Bloc2Etapes";
import { Bloc3CasRetenu } from "./Bloc3CasRetenu";
import { motifsDeLaDap } from "./motifs-de-la-dap";

type Props = {
  situation: Situation<string>;
  onNouvelleSimulation: () => void;
  /**
   * Retour à la Partie 2, réponses intactes. Absent quand aucun parcours ne
   * précède le document — seed ouverte droit sur le résultat, ou cas tranché dès
   * la Partie 1, où le questionnaire administratif n'a posé aucune question.
   */
  onPrecedent?: () => void;
  /**
   * Rendu du document téléchargeable, proposé dès que le modèle nomme un document
   * à remettre au patient. Fourni par l'appelant : le simulateur sait *quand* un
   * document a lieu d'être, pas lequel se fabrique ni à qui il est ouvert — deux
   * des quatre documents que le modèle nomme n'ont pas de CERFA à produire.
   * Défaut fermé : un appelant qui l'oublie ne propose rien.
   */
  documentTelechargeable?: (situation: Situation<string>) => ReactNode;
};

export function ResultatFinal({
  situation,
  onNouvelleSimulation,
  onPrecedent,
  documentTelechargeable,
}: Props) {
  return (
    <div>
      <h2>Document à imprimer et à remettre au patient</h2>
      <DocumentARemettre
        situation={situation}
        documentTelechargeable={documentTelechargeable}
      />
      <SuiteDuParcours
        onNouvelleSimulation={onNouvelleSimulation}
        onPrecedent={onPrecedent}
      />
      <TraceDebug
        titre="résultat administratif"
        situation={situation}
        sorties={[
          "cible_cas_final",
          "cible_transport_sanitaire_prescrit",
          "cible_document_a_remettre_au_patient",
        ]}
      />
    </div>
  );
}

// ---- implémentation ----

// Les deux suites possibles depuis le document : revenir sur les réponses
// administratives, ou repartir de zéro. Rien ici ne peut rouvrir la décision
// médicale — elle a été figée au passage au secrétariat.
function SuiteDuParcours({
  onNouvelleSimulation,
  onPrecedent,
}: Pick<Props, "onNouvelleSimulation" | "onPrecedent">) {
  return (
    <div className="fr-btns-group fr-btns-group--inline">
      {onPrecedent && (
        <button
          type="button"
          className="fr-btn fr-btn--secondary"
          onClick={onPrecedent}
        >
          Précédent
        </button>
      )}
      <button
        type="button"
        className="fr-btn fr-btn--secondary"
        onClick={onNouvelleSimulation}
      >
        Faire une nouvelle simulation
      </button>
    </div>
  );
}

// Ce que le patient emporte : le verdict, ce qu'il doit en faire, ce que le corps
// médical doit reporter — et, s'il y a lieu, le CERFA pré-rempli.
//
// Le modèle nomme un document dans quatre cas ; c'est cette sortie-là qu'on lit,
// plutôt que d'énumérer ici des cas finaux. Deux d'entre eux seulement sont des
// CERFA que nous produisons — une convocation d'audience vaut prescription à elle
// seule, un transport à la charge de l'établissement relève d'un formulaire
// interne. Lequel, et à qui il est ouvert, ne se décide pas ici (cf.
// `documentTelechargeable`).
function DocumentARemettre({
  situation,
  documentTelechargeable,
}: Pick<Props, "situation" | "documentTelechargeable">) {
  const e = moteur.setSituation(situation);
  const lues = cibles(e);
  return (
    <>
      <TroisBlocs e={e} cibles={lues} />
      {lues.doc !== AUCUN_DOCUMENT && documentTelechargeable?.(situation)}
    </>
  );
}

// Les trois blocs du document, dans l'ordre où ils s'impriment. Chacun reçoit ce
// qui le concerne ; le moteur ne va aux deux derniers que parce qu'ils lisent des
// règles au cas par cas — le verdict, lui, est entièrement tranché ici.
function TroisBlocs({
  e,
  cibles: c,
}: {
  e: typeof moteur;
  cibles: ReturnType<typeof cibles>;
}) {
  return (
    <>
      <Bloc1Resultat
        casFinal={c.casFinal}
        transport={c.transport}
        transportPrescrit={c.transportPrescrit}
        motifs={c.motifs}
        attenteRequise={c.attenteRequise}
      />
      <Bloc2Etapes
        e={e}
        casFinal={c.casFinal}
        transport={c.transport}
        transportPrescrit={c.transportPrescrit}
        article80={c.article80}
      />
      <Bloc3CasRetenu
        e={e}
        casFinal={c.casFinal}
        transport={c.transport}
        doc={c.doc}
        article80={c.article80}
      />
    </>
  );
}

/** La valeur que prend `cible_document_a_remettre_au_patient` quand il n'y en a pas. */
const AUCUN_DOCUMENT = "aucun document";

// Les sorties du moteur dont les trois blocs ont besoin, évaluées une seule fois.
function cibles(e: typeof moteur) {
  const transport = texte(e, "cible_transport_sanitaire_prescrit");
  return {
    casFinal: texte(e, "cible_cas_final"),
    doc: texte(e, "cible_document_a_remettre_au_patient"),
    transport,
    transportPrescrit: transport !== "" && transport !== "aucun",
    motifs: motifsDeLaDap(e),
    attenteRequise: vrai(e, "cible_attente_accord_prealable_requise"),
    article80: {
      mode: texte(e, "cible_article_80_mode"),
      situationSpecifique: vrai(e, "cible_article_80_situation_specifique"),
    } satisfies Article80,
  };
}
