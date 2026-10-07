// Le pied de page : la version de l'app et le commit déployé.
//
// Il sert au support. Quand un prescripteur signale un résultat surprenant, on
// sait quel code il avait sous les yeux.

import type { CSSProperties } from "react";

export function Footer() {
  return (
    <footer className="fr-text--xs fr-no-print" style={FOOTER_STYLE}>
      Version{" "}
      <a
        className="fr-link"
        style={{ fontSize: "inherit" }}
        href={LIEN_DE_LA_VERSION}
        // L'iframe interdit de naviguer sur place : on y perdrait le simulateur.
        // La mention « nouvelle fenêtre » l'annonce aux lecteurs d'écran.
        target="_blank"
        rel="noopener noreferrer"
        title={`Version ${VERSION_APP} - nouvelle fenêtre`}
      >
        {VERSION_APP}
      </a>{" "}
      · commit {SHA_COMMIT}
    </footer>
  );
}

// ---- implémentation ----

// Vite remplace ces valeurs à la construction. Les replis servent aux outils
// qui compilent ce fichier sans Vite.
const VERSION_APP: string = import.meta.env.VITE_VERSION_APP ?? "inconnue";
const SHA_COMMIT: string = import.meta.env.VITE_SHA_COMMIT ?? "inconnu";

// Le tag d'une version porte le nom de l'app : chaque app du monorepo a son
// cycle (voir `CHANGELOG.md`). Son `@` est encodé, comme dans l'URL d'une
// release GitHub.
const LIEN_DE_LA_VERSION = `https://github.com/betagouv/transports-sanitaires/releases/tag/${encodeURIComponent(
  `simulateur-eligibilite@${VERSION_APP}`,
)}`;

// Le pied de page reste dans le flux, ni `fixed` ni `sticky`. L'app est dans une
// iframe du CMS : détaché du flux, il recouvrirait le contenu. C'est
// `SimulateurScreen` qui le pousse en bas quand le contenu est court.
const FOOTER_STYLE: CSSProperties = {
  padding: "0.25rem 0",
  textAlign: "center",
  color: "var(--text-mention-grey)",
  backgroundColor: "var(--background-default-grey)",
  // Propriétés longues, pas le raccourci `border-top` : avec une `var()`,
  // certains moteurs perdent la bordure sans rien dire.
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "var(--border-default-grey)",
  margin: 0,
};
