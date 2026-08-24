// Ce que l'application affiche d'elle-même en bas du simulateur : sa version, le
// commit déployé et la version du modèle de règles.
//
// C'est un outil de support, pas une décoration. Quand un prescripteur signale
// un résultat surprenant, ces valeurs disent exactement quel code et quel modèle
// il avait sous les yeux — sans quoi la même situation rejouée ici ne prouve
// rien. La version renvoie à sa release, qui dit ce que cette livraison a changé
// et donc si le comportement signalé y est arrivé. Toutes sont figées à la
// construction (cf. `vite.config.ts`) : le navigateur n'a aucun moyen de les
// découvrir.
//
// Le bandeau reste dans le flux : c'est `PageDuSimulateur` qui le pousse au bas
// de la fenêtre quand le contenu est trop court pour l'y amener, et il se
// contente de suivre le contenu quand celui-ci défile. Ni `fixed` ni `sticky` —
// l'application est embarquée en iframe dans le CMS (cf. `index.html`), et un
// pied de page détaché du flux recouvrirait le contenu d'un cadre déjà court.

import type { CSSProperties } from "react";

export function BandeauVersion() {
  return (
    <footer className="fr-text--xs" style={STYLE_DU_BANDEAU}>
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
      · commit {SHA_COMMIT} · règles {VERSION_REGLES}
    </footer>
  );
}

// ---- implémentation ----

// Remplacées textuellement par Vite à la construction. Les valeurs de repli ne
// servent qu'aux outils qui compilent ce fichier sans passer par lui.
const VERSION_APP: string = import.meta.env.VITE_VERSION_APP ?? "inconnue";
const SHA_COMMIT: string = import.meta.env.VITE_SHA_COMMIT ?? "inconnu";
const VERSION_REGLES: string =
  import.meta.env.VITE_VERSION_REGLES ?? "inconnues";

// Le tag d'une version porte le nom de l'app — le dépôt est un monorepo dont
// chaque app a son cycle propre (cf. `CHANGELOG.md`). Son `@` doit être encodé :
// c'est la forme sous laquelle GitHub sert la page d'une release.
const LIEN_DE_LA_VERSION = `https://github.com/betagouv/transports-sanitaires/releases/tag/${encodeURIComponent(
  `simulateur-eligibilite@${VERSION_APP}`,
)}`;

const STYLE_DU_BANDEAU: CSSProperties = {
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
