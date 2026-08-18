// Page Résultat 2 — document à imprimer et à remettre au patient.
//
// Ce module n'est plus qu'un **assemblage** : il évalue une fois les cibles dont
// les trois blocs ont besoin, puis les leur passe. Chaque bloc vit dans son propre
// fichier — c'est le seul endroit qui connaisse leur ordre.

import type { Situation } from "publicodes";
import type { ReactNode } from "react";
import { moteur } from "../moteur";
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
  const casFinal = String(e.evaluate("cible_cas_final").nodeValue ?? "");
  const doc = String(
    e.evaluate("cible_document_a_remettre_au_patient").nodeValue ?? "",
  );
  const transport = String(
    e.evaluate("cible_transport_sanitaire_prescrit").nodeValue ?? "",
  );
  const transportPrescrit = transport !== "" && transport !== "aucun";

  const article80: Article80 = {
    mode: String(e.evaluate("cible_article_80_mode").nodeValue ?? ""),
    situationSpecifique:
      e.evaluate("cible_article_80_situation_specifique").nodeValue === true,
    permissionTherapeutique:
      e.evaluate("cible_article_80_permission_sortie_therapeutique")
        .nodeValue === true,
  };

  return (
    <div>
      <h2>Document à imprimer et à remettre au patient</h2>

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

      {/* Un accord préalable relève du formulaire S3139, une prise en charge par
          l'établissement ne donne lieu à aucun CERFA : seule la prescription
          médicale de transport ouvre un document. À qui il est ouvert, en
          revanche, ne se décide pas ici (cf. `documentTelechargeable`). */}
      {casFinal === "prescription médicale de transport" &&
        documentTelechargeable?.(situation)}

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
    </div>
  );
}
