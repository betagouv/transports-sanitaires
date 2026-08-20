// Ce que l'application affiche d'elle-même en bas du simulateur : le commit
// déployé et la version du modèle de règles.
//
// C'est un outil de support, pas une décoration. Quand un prescripteur signale
// un résultat surprenant, ces deux valeurs disent exactement quel code et quel
// modèle il avait sous les yeux — sans quoi la même situation rejouée ici ne
// prouve rien. Elles sont figées à la construction (cf. `vite.config.ts`) : le
// navigateur n'a aucun moyen de les découvrir.
//
// Le bandeau reste dans le flux : c'est `PageDuSimulateur` qui le pousse au bas
// de la fenêtre quand le contenu est trop court pour l'y amener, et il se
// contente de suivre le contenu quand celui-ci défile. Ni `fixed` ni `sticky` —
// l'application est embarquée en iframe dans le CMS (cf. `index.html`), et un
// pied de page détaché du flux recouvrirait le contenu d'un cadre déjà court.

export function BandeauVersion() {
  return (
    <footer
      className="fr-text--xs"
      style={{
        padding: "0.25rem 0",
        textAlign: "center",
        color: "var(--text-mention-grey)",
        backgroundColor: "var(--background-default-grey)",
        // En propriétés longues, et non en raccourci : une `var()` dans
        // `border-top` se répand sur les trois composantes chez certains
        // moteurs, et la bordure disparaît sans rien dire.
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: "var(--border-default-grey)",
        margin: 0,
      }}
    >
      Version {SHA_COMMIT} · règles {VERSION_REGLES}
    </footer>
  );
}

// ---- implémentation ----

// Remplacées textuellement par Vite à la construction. Les valeurs de repli ne
// servent qu'aux outils qui compilent ce fichier sans passer par lui.
const SHA_COMMIT: string = import.meta.env.VITE_SHA_COMMIT ?? "inconnu";
const VERSION_REGLES: string =
  import.meta.env.VITE_VERSION_REGLES ?? "inconnues";
