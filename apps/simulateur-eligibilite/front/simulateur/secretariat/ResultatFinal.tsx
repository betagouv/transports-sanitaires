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

type Props = {
  situation: Situation<string>;
  onNouvelleSimulation: () => void;
  /**
   * Rendu du document téléchargeable proposé quand le cas final est une
   * prescription médicale de transport. Fourni par l'appelant : le simulateur
   * sait *quand* un document a lieu d'être, pas comment il se fabrique ni à qui
   * il est ouvert. Défaut fermé : un appelant qui l'oublie ne propose rien.
   */
  documentTelechargeable?: (situation: Situation<string>) => ReactNode;
};

export function ResultatFinal({
  situation,
  onNouvelleSimulation,
  documentTelechargeable,
}: Props) {
  const e = moteur.setSituation(situation);
  const { casFinal, doc, transport, transportPrescrit, article80 } = cibles(e);

  return (
    <div>
      <h2>Document à imprimer et à remettre au patient</h2>

      <Blocs
        e={e}
        casFinal={casFinal}
        doc={doc}
        transport={transport}
        transportPrescrit={transportPrescrit}
        article80={article80}
      />

      {/* Un accord préalable relève du formulaire S3139, une prise en charge par
          l'établissement ne donne lieu à aucun CERFA : seule la prescription
          médicale de transport ouvre un document. À qui il est ouvert, en
          revanche, ne se décide pas ici (cf. `documentTelechargeable`). */}
      {casFinal === "prescription médicale de transport" &&
        documentTelechargeable?.(situation)}

      <PiedDePage
        situation={situation}
        onNouvelleSimulation={onNouvelleSimulation}
      />
    </div>
  );
}

// ---- implémentation ----

// Les trois blocs, dans le seul ordre qui vaille : le verdict, ce que le patient
// doit en faire, puis ce que le corps médical doit reporter.
function Blocs({
  e,
  casFinal,
  doc,
  transport,
  transportPrescrit,
  article80,
}: ReturnType<typeof cibles> & { e: typeof moteur }) {
  return (
    <>
      <Bloc1Resultat
        casFinal={casFinal}
        transport={transport}
        transportPrescrit={transportPrescrit}
      />
      <Bloc2Etapes
        e={e}
        casFinal={casFinal}
        transport={transport}
        transportPrescrit={transportPrescrit}
        article80={article80}
      />
      <Bloc3CasRetenu
        e={e}
        casFinal={casFinal}
        transport={transport}
        doc={doc}
        article80={article80}
      />
    </>
  );
}

// Les sorties du moteur dont les trois blocs ont besoin, évaluées une seule fois.
function cibles(e: typeof moteur) {
  const transport = texte(e, "cible_transport_sanitaire_prescrit");
  return {
    casFinal: texte(e, "cible_cas_final"),
    doc: texte(e, "cible_document_a_remettre_au_patient"),
    transport,
    transportPrescrit: transport !== "" && transport !== "aucun",
    article80: {
      mode: texte(e, "cible_article_80_mode"),
      situationSpecifique: vrai(e, "cible_article_80_situation_specifique"),
      permissionTherapeutique: vrai(
        e,
        "cible_article_80_permission_sortie_therapeutique",
      ),
    } satisfies Article80,
  };
}

function PiedDePage({
  situation,
  onNouvelleSimulation,
}: Pick<Props, "situation" | "onNouvelleSimulation">) {
  return (
    <>
      <div className="fr-btns-group fr-btns-group--inline">
        <button
          type="button"
          className="fr-btn fr-btn--secondary"
          onClick={onNouvelleSimulation}
        >
          Faire une nouvelle simulation
        </button>
      </div>

      <TraceDebug
        titre="résultat administratif"
        situation={situation}
        sorties={[
          "cible_cas_final",
          "cible_transport_sanitaire_prescrit",
          "cible_document_a_remettre_au_patient",
        ]}
      />
    </>
  );
}
