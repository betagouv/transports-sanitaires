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
        // Cette même iframe interdit de naviguer dans le cadre : le lecteur y
        // perdrait le simulateur, et le CMS autour. La mention « nouvelle
        // fenêtre » est ce qui l'annonce à un lecteur d'écran.
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

// Remplacées textuellement par Vite à la construction. Les valeurs de repli ne
// servent qu'aux outils qui compilent ce fichier sans passer par lui.
const VERSION_APP: string = import.meta.env.VITE_VERSION_APP ?? "inconnue";
const SHA_COMMIT: string = import.meta.env.VITE_SHA_COMMIT ?? "inconnu";

// Le tag d'une version porte le nom de l'app — le dépôt est un monorepo dont
// chaque app a son cycle propre (cf. `CHANGELOG.md`). Son `@` doit être encodé :
// c'est la forme sous laquelle GitHub sert la page d'une release.
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
  // En propriétés longues, et non en raccourci : une `var()` dans `border-top`
  // se répand sur les trois composantes chez certains moteurs, et la bordure
  // disparaît sans rien dire.
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "var(--border-default-grey)",
  margin: 0,
};
