import { useEffect, useState } from "react";
import { PRESCRIPTEUR_AUTRE, type Selection } from "./selection";
import { goToSimulateur } from "./redirect";
import {
  snapshotReferentiel,
  type Etablissement,
  type Prescripteur,
  type Referentiel,
  type Service,
} from "./referentiel";

type Props = {
  referentiel?: Referentiel;
  onValider?: (selection: Selection) => void;
};

const OPTION_PRESCRIPTEUR_AUTRE = "Autre / prescripteur non répertorié";

export function App({
  referentiel = snapshotReferentiel,
  onValider = goToSimulateur,
}: Props) {
  const [etape, setEtape] = useState<1 | 2>(1);

  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [prescripteurs, setPrescripteurs] = useState<Prescripteur[]>([]);

  const [etabId, setEtabId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [prescripteurId, setPrescripteurId] = useState("");

  useEffect(() => {
    referentiel.getEtablissements().then(setEtablissements);
  }, [referentiel]);

  useEffect(() => {
    setServiceId("");
    setServices([]);
    if (etabId) referentiel.getServices(etabId).then(setServices);
  }, [referentiel, etabId]);

  useEffect(() => {
    setPrescripteurId("");
    setPrescripteurs([]);
    if (serviceId) referentiel.getPrescripteurs(serviceId).then(setPrescripteurs);
  }, [referentiel, serviceId]);

  const etape1Valide = etabId !== "" && serviceId !== "";
  const etape2Valide = prescripteurId !== "";

  function handleValider() {
    onValider({ etabId, serviceId, prescripteurId });
  }

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      <h1 className="fr-h3">Identification</h1>

      <div
        className="fr-stepper"
        aria-label="Étapes de l'identification"
        style={{ marginBottom: "2rem" }}
      >
        <h2 className="fr-stepper__title">
          {etape === 1 ? "Établissement et service" : "Prescripteur"}
          <span className="fr-stepper__state">Étape {etape} sur 2</span>
        </h2>
        <div
          className="fr-stepper__steps"
          data-fr-current-step={etape}
          data-fr-steps={2}
        />
      </div>

      {etape === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (etape1Valide) setEtape(2);
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
            </select>
          </div>

          <div className="fr-select-group">
            <label className="fr-label" htmlFor="service">
              Service / unité
            </label>
            <select
              className="fr-select"
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              disabled={etabId === ""}
            >
              <option value="" disabled hidden>
                Sélectionnez un service
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.libelle}
                </option>
              ))}
            </select>
          </div>

          <div
            className="fr-btns-group fr-btns-group--inline"
            style={{ marginTop: "2rem" }}
          >
            <button type="submit" className="fr-btn" disabled={!etape1Valide}>
              Suivant
            </button>
          </div>
        </form>
      )}

      {etape === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (etape2Valide) handleValider();
          }}
        >
          <div className="fr-select-group">
            <label className="fr-label" htmlFor="prescripteur">
              Prescripteur
            </label>
            <select
              className="fr-select"
              id="prescripteur"
              value={prescripteurId}
              onChange={(e) => setPrescripteurId(e.target.value)}
            >
              <option value="" disabled hidden>
                Sélectionnez un prescripteur
              </option>
              {prescripteurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.libelle}
                </option>
              ))}
              <option value={PRESCRIPTEUR_AUTRE}>
                {OPTION_PRESCRIPTEUR_AUTRE}
              </option>
            </select>
          </div>

          <div
            className="fr-btns-group fr-btns-group--inline"
            style={{ marginTop: "2rem" }}
          >
            <button
              type="button"
              className="fr-btn fr-btn--secondary"
              onClick={() => setEtape(1)}
            >
              Précédent
            </button>
            <button type="submit" className="fr-btn" disabled={!etape2Valide}>
              Accéder au simulateur
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
