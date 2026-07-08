// Écran-porte d'identification du prescripteur : étape préalable **obligatoire**
// au simulateur (voir docs/architecture/identification.md — ADR-1). Formulaire à
// **révélation progressive** : chaque réponse dévoile la suite selon la branche
// (workflow §4). Composant de pure sélection ; à la validation il remonte la
// `Selection` brute à `onValide` (c'est la porte, App.tsx, qui la convertit en
// contexte via l'API et bascule vers le simulateur). Le référentiel par défaut est
// le snapshot factice (dev / tests) ; en production App injecte le client HTTP.

import { useEffect, useState } from "react";
import {
  ETAB_NON_RATTACHE,
  PRESCRIPTEUR_HORS_LISTE,
  SERVICE_AUTRE,
  selectionComplete,
  type Categorie,
  type Selection,
} from "../../shared/selection";
import {
  snapshotReferentiel,
  type Etablissement,
  type Prescripteur,
  type Referentiel,
  type Service,
} from "../../shared/referentiel";

type Props = {
  referentiel?: Referentiel;
  onValide: (selection: Selection) => void;
};

const OPTION_NON_RATTACHE = "Je ne suis pas rattaché à un établissement de santé";
const OPTION_SERVICE_AUTRE = "Autre";
const OPTION_HORS_LISTE = "Je ne suis pas dans la liste";

export function Identification({
  referentiel = snapshotReferentiel,
  onValide,
}: Props) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [prescripteurs, setPrescripteurs] = useState<Prescripteur[]>([]);

  const [etabId, setEtabId] = useState("");
  const [categorie, setCategorie] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [serviceLibre, setServiceLibre] = useState("");
  const [prescripteurId, setPrescripteurId] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");

  useEffect(() => {
    referentiel.getEtablissements().then(setEtablissements);
  }, [referentiel]);

  // Changement d'établissement → réinitialise l'aval, recharge les services si
  // c'est un établissement réel.
  useEffect(() => {
    setCategorie("");
    setServiceId("");
    setServiceLibre("");
    setPrescripteurId("");
    setNom("");
    setPrenom("");
    setServices([]);
    setPrescripteurs([]);
    if (etabId && etabId !== ETAB_NON_RATTACHE) {
      referentiel.getServices(etabId).then(setServices);
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
    if (serviceId && serviceId !== SERVICE_AUTRE && etabId !== ETAB_NON_RATTACHE) {
      referentiel.getPrescripteurs(serviceId).then(setPrescripteurs);
    }
  }, [referentiel, serviceId, etabId]);

  const nonRattache = etabId === ETAB_NON_RATTACHE;
  const etabReel = etabId !== "" && !nonRattache;
  const serviceAutre = serviceId === SERVICE_AUTRE;
  const serviceReel = serviceId !== "" && !serviceAutre;
  const prescripteurHorsListe = prescripteurId === PRESCRIPTEUR_HORS_LISTE;
  const identiteLibre =
    (nonRattache && categorie !== "") ||
    serviceAutre ||
    (serviceReel && prescripteurHorsListe);

  function buildSelection(): Selection {
    const sel: Selection = { etabId };
    if (nonRattache) {
      if (categorie) sel.categorie = categorie as Categorie;
      sel.nom = nom;
      sel.prenom = prenom;
      return sel;
    }
    if (etabReel && serviceId) {
      sel.serviceId = serviceId;
      if (serviceAutre) {
        sel.serviceLibre = serviceLibre;
        sel.nom = nom;
        sel.prenom = prenom;
      } else {
        sel.prescripteurId = prescripteurId;
        if (prescripteurHorsListe) {
          sel.nom = nom;
          sel.prenom = prenom;
        }
      }
    }
    return sel;
  }

  const selection = buildSelection();
  const valide = selectionComplete(selection);

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valide) onValide(selection);
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
            {etablissements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.libelle}
              </option>
            ))}
            <option value={ETAB_NON_RATTACHE}>{OPTION_NON_RATTACHE}</option>
          </select>
        </div>

        {nonRattache && (
          <div className="fr-select-group">
            <label className="fr-label" htmlFor="categorie">
              Précisez votre situation
            </label>
            <select
              className="fr-select"
              id="categorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
            >
              <option value="" disabled hidden>
                Sélectionnez
              </option>
              <option value="liberal">J'exerce en libéral</option>
              <option value="cnam">Je travaille à la CNAM</option>
            </select>
          </div>
        )}

        {etabReel && (
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
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.libelle}
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
              {prescripteurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.libelle}
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
        </div>
      </form>
    </main>
  );
}
