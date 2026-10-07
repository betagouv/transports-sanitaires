// L'encadré des developer tools, et leurs boutons.
//
// Ces outils existent sur tous les environnements, production comprise. Seul le
// service n° 4 du référentiel les voit (`unlock.ts`).
//
// L'encadré est à part, avec une bordure tiretée : ces boutons ne doivent pas se
// confondre avec ceux du parcours.
//
// Ce fichier ne garde pas l'accès. C'est l'appelant qui décide de l'afficher.

import type { ReactNode } from "react";

export function DeveloperTools({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Developer tools"
      className="fr-mt-4w fr-p-2w"
      // Propriétés longues, pas le raccourci `border` : une variable CSS absente
      // invaliderait toute la déclaration. L'encadré disparaîtrait sans bruit,
      // alors que lui seul distingue ces boutons du questionnaire.
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
        style={{
          color: "var(--text-mention-grey)",
          textTransform: "uppercase",
        }}
      >
        <span className="fr-icon-flashlight-line fr-mr-1w" aria-hidden="true" />
        Developer tools — service Transport Sanitaire
      </p>
      <div className="fr-btns-group fr-btns-group--inline fr-btns-group--sm">
        {children}
      </div>
    </section>
  );
}

/** Bouton d'un developer tool. Même apparence pour tous : aucun n'est « l'action ». */
export function ToolButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="fr-btn fr-btn--tertiary fr-btn--sm"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
