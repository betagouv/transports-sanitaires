# AGENTS.md - cli

> Les conventions du dépôt sont dans [`../../AGENTS.md`](../../AGENTS.md). Ici,
> ce qui est propre à cette app.

`tsp`, le point d'entrée du dépôt. Le mode d'emploi est dans le
[README](README.md), les décisions dans
[`docs/knowledge/adr/cli.md`](../../docs/knowledge/adr/cli.md).

## Ce que c'est

- **Un lanceur shell à la racine**, `tsp`. Il choisit le clone, puis exécute la
  CLI par `mise`. Il ne demande qu'un shell et `git`.
- **Du TypeScript exécuté directement par Node 24**, sans build, comme
  `data-analyzer`.
- **Aucune dépendance d'exécution.** Les arguments se lisent avec
  `node:util.parseArgs`, Notion se joint par `fetch`. N'en ajoute pas : la CLI
  doit démarrer sur un dépôt dont les dépendances ne sont pas encore installées.

## Pas de tests

**Cette app n'a pas de tests, par décision du porteur.** N'en ajoute pas sans
qu'il le demande.

- `pnpm verifier` passe le lint, le typecheck et knip.
- Les gardes `lisibilite` et `architecture` du simulateur ne couvrent pas ce
  dossier. Biome y garde seul les limites de 30 et 300 lignes.
- Une commande se vérifie donc en la lançant. Pour Notion, sans jeton :
  `NOTION_API_URL` redirige la CLI vers un serveur local.

## Ajouter une commande

1. Un fichier par sujet dans `src/`, nommé d'après ce qu'il permet de faire.
2. Une fonction `xxxCommand(invocation)`, qui rend un code de sortie.
3. Une entrée dans `src/commands.ts` : c'est elle qui l'inscrit dans l'aide.
4. Une commande de lecture passe par `emit`, pour répondre à `--json`.

Une **action** n'est pas une commande à écrire : c'est un script du
`package.json` de l'app. `tsp dev glossaire` lance son script `dev`.

## Ce qu'il ne faut pas casser

| Invariant | Pourquoi |
|---|---|
| Une erreur prévue rend un code non nul et une ligne sur stderr | un agent lit le code de sortie, pas le texte |
| Sans jeton Notion, `wip` et `next` affichent le reste | personne n'est bloqué par un service absent |
| `spec sync` ne réécrit jamais le corps d'un ticket | l'équipe produit y prend des notes |
| Un statut Notion ne recule jamais | `Reviewing dev` et `Prod / Done` se posent à la main |
| La cible d'une PR est `staging`, sans option pour en changer | c'est ce qui applique GIT-009 |
| `setup` se rejoue sans risque | il sert aussi à réparer |

## Langue

Les noms de commande sont en anglais, comme les scripts `pnpm`. L'aide et les
sorties sont en français. Dans le code, le technique est en anglais et le
métier en français : `recueil`, `tracker`, `etat`, `ticket`, `tache`.
