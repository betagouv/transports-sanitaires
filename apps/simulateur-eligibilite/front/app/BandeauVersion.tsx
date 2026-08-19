// Ce que l'application affiche d'elle-même en bas du simulateur : le commit
// déployé et la version du modèle de règles.
//
// C'est un outil de support, pas une décoration. Quand un prescripteur signale
// un résultat surprenant, ces deux valeurs disent exactement quel code et quel
// modèle il avait sous les yeux — sans quoi la même situation rejouée ici ne
// prouve rien. Elles sont figées à la construction (cf. `vite.config.ts`) : le
// navigateur n'a aucun moyen de les découvrir.
//
// `sticky` et non `fixed` : l'application est embarquée en iframe dans le CMS
// (cf. `index.html`), et un pied de page fixé se collerait au bas de l'iframe —
// c'est-à-dire n'importe où, selon la façon dont le CMS la dimensionne. En
// `sticky`, le bandeau reste visible tant que la page défile et se pose sous le
// contenu quand il n'y a rien à faire défiler. Il ne recouvre jamais rien.

export function BandeauVersion() {
  return (
    <footer
      className="fr-text--xs"
      style={{
        position: "sticky",
        bottom: 0,
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
