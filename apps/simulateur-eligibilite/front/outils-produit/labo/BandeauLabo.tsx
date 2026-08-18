// Bandeau permanent affiché **partout** tant qu'un jeu de règles de test est actif,
// pour que le produit ne reste jamais coincé en mode labo sans le savoir. Un clic
// repasse aux règles officielles (efface le `localStorage` + recharge).

import { desactiverLabo, versionLaboActive } from "./labo";

export function BandeauLabo() {
  const active = versionLaboActive();
  if (!active) return null;

  return (
    <div
      className="fr-notice fr-notice--warning"
      role="status"
      style={{ position: "sticky", top: 0, zIndex: 100 }}
    >
      <div className="fr-container">
        <div className="fr-notice__body">
          <span className="fr-notice__title">
            Mode test — règles : {active.nom}
          </span>
          <button
            type="button"
            className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
            onClick={() => {
              desactiverLabo();
              window.location.reload();
            }}
          >
            Revenir aux règles officielles
          </button>
        </div>
      </div>
    </div>
  );
}
