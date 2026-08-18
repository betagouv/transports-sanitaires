// Écran-porte d'identification du prescripteur : étape préalable **obligatoire**
// au simulateur (voir docs/architecture/identification.md — ADR-1). Formulaire à
// **révélation progressive** : chaque réponse dévoile la suite selon la branche
// (workflow §4). Composant de pure sélection ; à la validation il remonte la
// `IdentiteSaisie` brute à `onValide` (c'est la porte, App.tsx, qui la convertit
// en identité pseudonymisée via l'API et bascule vers le simulateur). Le
// référentiel par défaut est
// le snapshot factice (dev / tests) ; en production App injecte le client HTTP.

import { useEffect, useState } from "react";
import {
  type IdentiteSaisie,
  PRESCRIPTEUR_HORS_LISTE,
  saisieComplete,
} from "../../shared/identite-saisie";
import {
  type Etablissement,
  type Prescripteur,
  type Referentiel,
  type Service,
  snapshotReferentiel,
} from "../../shared/referentiel";
import { estServiceProduit } from "../outils-produit/deverrouillage";
import { BoutonOutil, OutilsProduit } from "../outils-produit/OutilsProduit";

/**
 * Ce que la validation emporte, en plus de l'identité saisie : l'écran à ouvrir et
 * l'accès aux outils produit. Les trois boutons de cet écran passent par le même
 * `onValide` — l'identification est obligatoire quelle que soit la destination
 * (ADR-1), et il n'y a donc qu'un seul endroit qui pseudonymise.
 */
export type AccesIdentification = {
  destination: "simulateur" | "galerie" | "labo";
  /** Le service sélectionné déverrouille les outils produit (service n° 4). */
  outilsProduit: boolean;
};

type Props = {
  referentiel?: Referentiel;
  onValide: (saisie: IdentiteSaisie, acces: AccesIdentification) => void;
};

const OPTION_HORS_LISTE = "Je ne suis pas dans la liste";

// « Autre » (service / unité non listé du référentiel) reste toujours en **fin**
// de liste, quel que soit l'ordre alphabétique.
const estAutre = (libelle: string): boolean =>
  libelle.trim().toLowerCase() === "autre";

// Tri alphabétique des listes déroulantes (locale FR, insensible à la casse et
// aux accents), « Autre » repoussé en fin de liste. L'option spéciale « hors
// liste » est ajoutée séparément après la liste et garde sa place.
const triParLibelle = <T extends { libelle: string }>(liste: T[]): T[] =>
  [...liste].sort((a, b) => {
    if (estAutre(a.libelle) !== estAutre(b.libelle)) {
      return estAutre(a.libelle) ? 1 : -1;
    }
    return a.libelle.localeCompare(b.libelle, "fr", { sensitivity: "base" });
  });

export function Identification({
  referentiel = snapshotReferentiel,
  onValide,
}: Props) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [prescripteurs, setPrescripteurs] = useState<Prescripteur[]>([]);

  const [etabId, setEtabId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [serviceLibre, setServiceLibre] = useState("");
  const [prescripteurId, setPrescripteurId] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");

  useEffect(() => {
    referentiel
      .getEtablissements()
      .then((l) => setEtablissements(triParLibelle(l)));
  }, [referentiel]);

  // Changement d'établissement → réinitialise l'aval, recharge les services.
  useEffect(() => {
    setServiceId("");
    setServiceLibre("");
    setPrescripteurId("");
    setNom("");
    setPrenom("");
    setServices([]);
    setPrescripteurs([]);
    if (etabId) {
      referentiel
        .getServices(etabId)
        .then((l) => setServices(triParLibelle(l)));
    }
  }, [referentiel, etabId]);

  // Changement de service → réinitialise l'aval, recharge les prescripteurs.
  useEffect(() => {
    setServiceLibre("");
    setPrescripteurId("");
    setNom("");
    setPrenom("");
    setPrescripteurs([]);
    if (serviceId) {
      referentiel
        .getPrescripteurs(serviceId)
        .then((l) => setPrescripteurs(triParLibelle(l)));
    }
  }, [referentiel, serviceId]);

  const etabChoisi = etabId !== "";
  const serviceChoisi = serviceId !== "";
  // « Autre » sélectionné → saisie du service/unité réel obligatoire.
  const serviceEstAutre = estAutre(
    services.find((s) => s.id === serviceId)?.libelle ?? "",
  );
  const prescripteurHorsListe = prescripteurId === PRESCRIPTEUR_HORS_LISTE;
  const identiteLibre = serviceChoisi && prescripteurHorsListe;
  // Les outils produit (galerie de seeds, mode test des règles) ne sont proposés
  // que pour le service dédié du référentiel — sur tous les environnements.
  const serviceSelectionne = services.find((s) => s.id === serviceId);
  const outilsProduit =
    !!serviceSelectionne && estServiceProduit(serviceSelectionne);

  function buildSaisie(): IdentiteSaisie {
    const saisie: IdentiteSaisie = { etabId };
    if (etabChoisi && serviceId) {
      saisie.serviceId = serviceId;
      if (serviceEstAutre) {
        saisie.serviceEstAutre = true;
        saisie.serviceLibre = serviceLibre;
      }
      saisie.prescripteurId = prescripteurId;
      if (prescripteurHorsListe) {
        saisie.nom = nom;
        saisie.prenom = prenom;
      }
    }
    return saisie;
  }

  const saisie = buildSaisie();
  const valide = saisieComplete(saisie);

  const entrer = (destination: AccesIdentification["destination"]) => {
    if (valide) onValide(saisie, { destination, outilsProduit });
  };

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem", maxWidth: "60rem" }}
    >
      <h1 className="fr-h3">Commencez par vous identifier</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          entrer("simulateur");
        }}
      >
        <div className="fr-select-group">
          <label className="fr-label" htmlFor="etablissement">
            Établissement
          </label>
          <select
            className="fr-select"
            id="etablissement"
            value={etabId}
            onChange={(e) => setEtabId(e.target.value)}
          >
            <option value="" disabled hidden>
              Sélectionnez un établissement
            </option>
            {etablissements.map((etab) => (
              <option key={etab.id} value={etab.id}>
                {etab.libelle}
              </option>
            ))}
          </select>
        </div>

        {etabChoisi && (
          <div className="fr-select-group">
            <label className="fr-label" htmlFor="service">
              Nom du service
            </label>
            <select
              className="fr-select"
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="" disabled hidden>
                Sélectionnez un service
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.libelle}
                </option>
              ))}
            </select>
          </div>
        )}

        {serviceEstAutre && (
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="service-libre">
              Nom de votre service / unité
            </label>
            <input
              className="fr-input"
              id="service-libre"
              type="text"
              value={serviceLibre}
              onChange={(e) => setServiceLibre(e.target.value)}
            />
          </div>
        )}

        {serviceChoisi && (
          <div className="fr-select-group">
            <label className="fr-label" htmlFor="prescripteur">
              Vous êtes
            </label>
            <select
              className="fr-select"
              id="prescripteur"
              value={prescripteurId}
              onChange={(e) => setPrescripteurId(e.target.value)}
            >
              <option value="" disabled hidden>
                Sélectionnez
              </option>
              {prescripteurs.map((prescripteur) => (
                <option key={prescripteur.id} value={prescripteur.id}>
                  {prescripteur.libelle}
                </option>
              ))}
              <option value={PRESCRIPTEUR_HORS_LISTE}>
                {OPTION_HORS_LISTE}
              </option>
            </select>
          </div>
        )}

        {identiteLibre && (
          <>
            <div className="fr-input-group">
              <label className="fr-label" htmlFor="nom">
                Votre nom
              </label>
              <input
                className="fr-input"
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div className="fr-input-group">
              <label className="fr-label" htmlFor="prenom">
                Votre prénom
              </label>
              <input
                className="fr-input"
                id="prenom"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
              />
            </div>
          </>
        )}

        <div
          className="fr-btns-group fr-btns-group--inline"
          style={{ marginTop: "2rem" }}
        >
          <button type="submit" className="fr-btn" disabled={!valide}>
            Accéder au simulateur
          </button>
        </div>

        {/* Les deux outils produit sont côte à côte, hors des actions nominales.
            Ils restent désactivés tant que l'identification n'est pas complète :
            y entrer reste une entrée dans l'application, elle passe par la porte.
            Les situations de la galerie vivent dans `seeds/`, pas dans cet écran —
            les y égrener en boutons ne passait pas l'échelle. */}
        {outilsProduit && (
          <OutilsProduit>
            <BoutonOutil onClick={() => entrer("galerie")} disabled={!valide}>
              Galerie de seeds
            </BoutonOutil>
            <BoutonOutil onClick={() => entrer("labo")} disabled={!valide}>
              Mode test des règles
            </BoutonOutil>
          </OutilsProduit>
        )}
      </form>
    </main>
  );
}
