// Page Résultat 2 — document à imprimer et à remettre au patient.
//
// Ce module n'est plus qu'un **assemblage** : il évalue une fois les cibles dont
// les trois blocs ont besoin, puis les leur passe. Chaque bloc vit dans son propre
// fichier — c'est le seul endroit qui connaisse leur ordre.

import type { Situation } from "publicodes";
import { engine } from "../engine";
import { TraceDebug } from "../resultat/TraceDebug";
import { BoutonCerfa } from "../../cerfa/BoutonCerfa";
import type { OptionsGénération } from "../../cerfa/cerfa";
import { Bloc1Resultat } from "./Bloc1Resultat";
import { Bloc2Etapes } from "./Bloc2Etapes";
import { Bloc3CasRetenu } from "./Bloc3CasRetenu";
import type { Article80 } from "./Article80";

type Props = {
  situation: Situation<string>;
  onNouvelleSimulation: () => void;
  /**
   * Le service identifié a-t-il accès aux outils produit ? Le téléchargement du
   * CERFA leur est réservé. Défaut fermé : un appelant qui oublie de le passer
   * n'ouvre pas l'accès par mégarde.
   */
  outilsProduit?: boolean;
  /** Injectable pour les tests (défaut = asset servi par l'application). */
  chargerGabarit?: OptionsGénération["chargerGabarit"];
};

export function ResultatFinal({
  situation,
  onNouvelleSimulation,
  outilsProduit = false,
  chargerGabarit,
}: Props) {
  const e = engine.setSituation(situation);
  const casFinal = String(e.evaluate("cible_cas_final").nodeValue ?? "");
  const doc = String(
    e.evaluate("cible_document_a_remettre_au_patient").nodeValue ?? ""
  );
  const transport = String(
    e.evaluate("cible_transport_sanitaire_prescrit").nodeValue ?? ""
  );
  const transportPrescrit = transport !== "" && transport !== "aucun";

  const article80: Article80 = {
    mode: String(e.evaluate("cible_article_80_mode").nodeValue ?? ""),
    situationSpecifique:
      e.evaluate("cible_article_80_situation_specifique").nodeValue === true,
    permissionTherapeutique:
      e.evaluate("cible_article_80_permission_sortie_therapeutique").nodeValue ===
      true,
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

      {/* Deux conditions. Le cas final d'abord : un accord préalable relève du
          formulaire S3139, une prise en charge par l'établissement ne donne lieu à
          aucun CERFA. L'accès aux outils produit ensuite — le pré-remplissage
          reste réservé au service n° 4, le temps d'être éprouvé. */}
      {casFinal === "prescription médicale de transport" && outilsProduit && (
        <BoutonCerfa
          moteur={engine}
          situation={situation}
          chargerGabarit={chargerGabarit}
        />
      )}

      <div className="fr-btns-group fr-btns-group--inline">
        <button
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
