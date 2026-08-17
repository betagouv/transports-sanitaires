// Panneau regroupant les raccourcis de développement, partagé par les écrans qui
// en proposent (écran-porte d'identification, début du parcours prescripteur).
//
// Ces boutons court-circuitent le parcours : ils doivent être **impossibles à
// confondre** avec les actions du parcours nominal, qui restent dans leur propre
// groupe. D'où l'encadré à part, la bordure tiretée et l'intitulé explicite —
// plutôt qu'un suffixe « (dev) » sur chaque libellé, qui se noyait au milieu des
// vraies actions.
//
// Rien ici n'assure le masquage en production : ce sont les appelants qui ne
// câblent leurs callbacks que sous `import.meta.env.DEV`. Sans raccourci à
// afficher, le panneau ne rend rien.

import type { ReactNode } from "react";

export function RaccourcisDev({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Raccourcis de développement"
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
        <span className="fr-icon-code-s-slash-line fr-mr-1w" aria-hidden="true" />
        Raccourcis de développement — absents en production
      </p>
      <div className="fr-btns-group fr-btns-group--inline fr-btns-group--sm">
        {children}
      </div>
    </section>
  );
}

/** Bouton d'un raccourci dev. Même apparence pour tous : aucun n'est « l'action ». */
export function BoutonDev({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="fr-btn fr-btn--tertiary fr-btn--sm" onClick={onClick}>
      {children}
    </button>
  );
}
