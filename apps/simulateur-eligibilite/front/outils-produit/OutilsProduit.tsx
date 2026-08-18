// Encadré des **outils produit** : la galerie de seeds et le mode test des règles
// (labo). Partagé par les écrans qui les proposent — l'écran-porte d'identification
// et le début du parcours prescripteur.
//
// Ces outils ne sont pas réservés à l'environnement de développement : ils sont
// disponibles sur tous les environnements, **production comprise**, mais seulement
// pour le service dédié du référentiel (n° 4, « Transport Sanitaire » — cf.
// `estServiceProduit`, cf. `acces.ts`). C'est le service qui garde l'accès, plus le
// build.
//
// Ils court-circuitent le parcours nominal (la galerie ouvre une situation
// fabriquée, le labo remplace les règles) : ils doivent rester **impossibles à
// confondre** avec les actions du parcours. D'où l'encadré à part, la bordure
// tiretée et l'intitulé explicite.
//
// Rien ici n'assure la garde d'accès : ce sont les appelants qui ne rendent le
// panneau que pour le service dédié.

import type { ReactNode } from "react";

export function OutilsProduit({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Outils produit"
      className="fr-mt-4w fr-p-2w"
      // Propriétés longues plutôt que la forme raccourcie `border` : une variable
      // CSS absente y invaliderait toute la déclaration, et l'encadré — seul
      // signal distinguant ces boutons du parcours — disparaîtrait sans bruit.
      style={{
        borderWidth: "1px",
        borderStyle: "dashed",
        borderColor: "var(--border-default-grey)",
        borderRadius: "0.25rem",
        background: "var(--background-alt-grey)",
      }}
    >
      <p
        className="fr-text--xs fr-mb-1w"
        style={{ color: "var(--text-mention-grey)", textTransform: "uppercase" }}
      >
        <span className="fr-icon-flashlight-line fr-mr-1w" aria-hidden="true" />
        Outils produit — service Transport Sanitaire
      </p>
      <div className="fr-btns-group fr-btns-group--inline fr-btns-group--sm">
        {children}
      </div>
    </section>
  );
}

/** Bouton d'un outil produit. Même apparence pour tous : aucun n'est « l'action ». */
export function BoutonOutil({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="fr-btn fr-btn--tertiary fr-btn--sm"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
