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
  PRESCRIPTEUR_HORS_LISTE,
  SERVICE_AUTRE,
  saisieComplete,
  type IdentiteSaisie,
} from "../../shared/identite-saisie";
import {
  snapshotReferentiel,
  type Etablissement,
  type Prescripteur,
  type Referentiel,
  type Service,
} from "../../shared/referentiel";

type Props = {
  referentiel?: Referentiel;
  onValide: (saisie: IdentiteSaisie) => void;
  // Raccourci dev (fourni uniquement en mode dev) : ouvre directement une page
  // de résultat sans passer par le formulaire — résultat médical (favorable /
  // défavorable) ou résultat final (succès / refus).
  onAccesDirectDev?: (
    variante: "favorable" | "defavorable" | "final-succes" | "final-refus"
  ) => void;
};

const OPTION_SERVICE_AUTRE = "Autre";
const OPTION_HORS_LISTE = "Je ne suis pas dans la liste";

// Tri alphabétique des listes déroulantes (locale FR, insensible à la casse et
// aux accents). Les options spéciales (« Autre », « hors liste ») sont ajoutées
// séparément après la liste et gardent leur place.
const triParLibelle = <T extends { libelle: string }>(liste: T[]): T[] =>
  [...liste].sort((a, b) =>
    a.libelle.localeCompare(b.libelle, "fr", { sensitivity: "base" })
  );

export function Identification({
  referentiel = snapshotReferentiel,
  onValide,
  onAccesDirectDev,
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
      referentiel.getServices(etabId).then((l) => setServices(triParLibelle(l)));
    }
  }, [referentiel, etabId]);

  // Changement de service → réinitialise l'aval, recharge les prescripteurs si
  // c'est un service réel.
  useEffect(() => {
    setServiceLibre("");
    setPrescripteurId("");
    setNom("");
    setPrenom("");
    setPrescripteurs([]);
    if (serviceId && serviceId !== SERVICE_AUTRE) {
      referentiel
        .getPrescripteurs(serviceId)
        .then((l) => setPrescripteurs(triParLibelle(l)));
    }
  }, [referentiel, serviceId]);

  const etabChoisi = etabId !== "";
  const serviceAutre = serviceId === SERVICE_AUTRE;
  const serviceReel = serviceId !== "" && !serviceAutre;
  const prescripteurHorsListe = prescripteurId === PRESCRIPTEUR_HORS_LISTE;
  const identiteLibre = serviceAutre || (serviceReel && prescripteurHorsListe);

  function buildSaisie(): IdentiteSaisie {
    const saisie: IdentiteSaisie = { etabId };
    if (etabChoisi && serviceId) {
      saisie.serviceId = serviceId;
      if (serviceAutre) {
        saisie.serviceLibre = serviceLibre;
        saisie.nom = nom;
        saisie.prenom = prenom;
      } else {
        saisie.prescripteurId = prescripteurId;
        if (prescripteurHorsListe) {
          saisie.nom = nom;
          saisie.prenom = prenom;
        }
      }
    }
    return saisie;
  }

  const saisie = buildSaisie();
  const valide = saisieComplete(saisie);

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valide) onValide(saisie);
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
              <option value={SERVICE_AUTRE}>{OPTION_SERVICE_AUTRE}</option>
            </select>
          </div>
        )}

        {serviceAutre && (
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="service-libre">
              Précisez le nom de votre service
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

        {serviceReel && (
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
              <option value={PRESCRIPTEUR_HORS_LISTE}>{OPTION_HORS_LISTE}</option>
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
          {onAccesDirectDev && (
            <>
              <button
                type="button"
                className="fr-btn fr-btn--secondary"
                onClick={() => onAccesDirectDev("favorable")}
              >
                Résultat favorable (dev)
              </button>
              <button
                type="button"
                className="fr-btn fr-btn--secondary"
                onClick={() => onAccesDirectDev("defavorable")}
              >
                Résultat défavorable (dev)
              </button>
              <button
                type="button"
                className="fr-btn fr-btn--tertiary"
                onClick={() => onAccesDirectDev("final-succes")}
              >
                Résultat final — succès (dev)
              </button>
              <button
                type="button"
                className="fr-btn fr-btn--tertiary"
                onClick={() => onAccesDirectDev("final-refus")}
              >
                Résultat final — refus (dev)
              </button>
            </>
          )}
        </div>
      </form>
    </main>
  );
}
