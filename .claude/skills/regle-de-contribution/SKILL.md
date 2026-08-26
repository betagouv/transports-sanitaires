---
name: regle-de-contribution
description: Ajouter, modifier ou retirer une règle de docs/contributing/ (les QUAL-* de code, les GIT-* de commit). À charger dès qu'il s'agit d'écrire une convention d'écriture ou de commit, de la numéroter, ou qu'une revue fait apparaître une règle qui n'était nulle part.
---

# Structurer une règle de contribution

Les règles numérotées vivent dans `docs/contributing/`. Il y a **un recueil par
domaine**, et non un fichier par règle.

| Recueil | Préfixe | Ce qu'il couvre |
|---|---|---|
| `regles-de-code.md` | `QUAL-` | forme d'un fichier, découpage, noms, exports, suppressions de lint |
| `regles-git.md` | `GIT-` | branche ou `main`, forme du message, métadonnée d'IA, confidentialité |

`AGENTS.md` ne porte qu'un pointeur vers les deux. **N'y recopie pas les
règles** : une copie dérive.

## Le squelette d'une règle

~~~~markdown
---

### QUAL-016 - Le titre, à l'infinitif ou au présent

> Raison : ce qui casse sans la règle. Une à trois phrases courtes.

Le corps, facultatif. Ce que la règle demande exactement, quand le titre ne
suffit pas. Les exceptions vont ici.

**Exemples**

```ts
// ✅ OK : ce qui rend l'exemple juste
```

```ts
// ❌ KO : ce qui rend l'exemple faux
```

*Gardé par* `tests/lisibilite.test.ts › nom de l'assertion`.
~~~~

Le `---` se met **avant** la règle. Le titre sépare l'identifiant du nom par un
trait d'union entouré d'espaces, jamais par un tiret cadratin.

## Choisir l'identifiant

Le numéro est attribué à la suite, sur trois chiffres, et **ne se réutilise
jamais**. Si `QUAL-014` est retirée, la suivante est `QUAL-016`.

Un numéro réemployé ferait pointer un vieux commit ou une vieille revue sur une
autre règle. C'est la même raison qui fait garder les ADR révoqués dans
`docs/architecture/`, barrés plutôt qu'effacés.

Une règle retirée disparaît du corps du recueil. Sa ligne d'index reste, barrée,
avec la date et le motif :

```markdown
| ~~QUAL-014~~ | ~~Pas de suppression pour un linter absent~~ | retirée le 2026-09-01, le linter a été ajouté |
```

## Écrire la raison

La raison dit **ce qui casse sans la règle**, pas que la règle est bonne. Si elle
se relit comme une reformulation du titre, elle ne sert à rien.

```markdown
✅ OK
> Raison : un privé sous le marqueur est appelé depuis plus haut. En `const`
> fléché, il n'existe pas encore au moment de l'appel. C'est une erreur TDZ à
> l'exécution, que le typecheck ne voit pas.
```

```markdown
❌ KO
> Raison : il est important d'utiliser des fonctions hoistées pour la lisibilité
> et la maintenabilité du code.
```

Trois phrases courtes suffisent. La garde de documentation en refuse plus de
quatre, et refuse une phrase de plus de 25 mots.

## Écrire les deux exemples

Un exemple juste, un exemple faux, jamais plus. La glose se met en commentaire
sur la première ligne, derrière deux-points.

- **Le KO est l'erreur réellement commise**, pas une caricature. `QUAL-014` cite
  l'`eslint-disable` qui a dormi des mois dans `Parcours.tsx`.
- **Les deux exemples portent sur le même cas.** Un OK et un KO qui parlent de
  deux sujets ne se comparent pas.
- **Le bloc porte son langage** (`ts`, `tsx`, `bash`) quand c'en est. Une
  arborescence, un message de commit ou un nom de fichier vont dans un bloc nu.

Dans un bloc nu, la glose n'a pas de commentaire où vivre. Elle se colle alors au
marqueur :

```
✅ OK : coupé par sujet, chaque nom dit une capacité
cerfa/remplissage.ts
cerfa/lieux-du-trajet.ts
```

## Nommer la garde

Toute règle finit par une ligne de garde. Il n'y a que trois cas.

| Cas | Ce qu'on écrit |
|---|---|
| Une assertion l'applique | `*Gardé par* <chemin du test> › <nom de l'assertion>` |
| Rien ne peut l'appliquer | `*Aucune garde.* C'est du jugement, pas de la forme.` |
| Une assertion est possible, pas encore écrite | `*Aucune garde.* <ce qui la porterait>` |

Le troisième cas est une dette, pas un statut. Avant de l'écrire, demande-toi si
la règle vaut mieux qu'un test, comme le dit `AGENTS.md § Toute règle nomme sa
garde`. Une règle de forme mécanisable devrait naître avec son assertion.

Vérifie le nom de l'assertion avant de le citer :

```bash
grep -nE '^\s*(describe|it)\(' apps/simulateur-eligibilite/tests/lisibilite.test.ts
```

## Ce qu'il faut toucher en plus

| Endroit | Quoi |
|---|---|
| Le tableau d'index du recueil | une ligne : identifiant, titre, garde |
| L'en-tête du recueil (`> Les N règles`) | le décompte, si le nombre change |
| `AGENTS.md § Toute règle nomme sa garde` | le tableau de répartition, si la garde change de nature |

Le `**N règles**` du chapô n'est pas à surveiller. La garde le compare au nombre
réel de règles, et échoue s'il ment.

## Vérifier

```bash
pnpm verifier-documentation
```

Six assertions, dans `verifier-documentation.ts` à la racine. Quatre valent pour
toute la documentation, deux pour les recueils seuls :

| Assertion | Ce qu'elle refuse |
|---|---|
| pas de tiret cadratin | un cadratin hors bloc de code, titres et cellules compris |
| une phrase tient en 25 mots | une phrase plus longue |
| un paragraphe tient en 4 phrases | un paragraphe plus long |
| les listes d'exemption nomment des fichiers qui existent | une exemption devenue orpheline |
| le décompte annoncé par un recueil est le bon | un chapô qui annonce autre chose que le vrai nombre |
| chaque règle numérotée est dans l'index de son recueil | une règle sans ligne d'index |

Le message d'échec dit ce que la règle protège. Lis-le avant de contourner.

## Ce qui ne va pas là

Ce qui n'est pas une règle numérotée se range ailleurs :
`AGENTS.md § Où écrire quoi` dit où. Un cas ne s'y trouve pas, parce qu'il est
propre à ce skill : **une convention qui ne vaut que pour une app va dans son
`apps/<app>/AGENTS.md`**.

Les recueils valent pour le dépôt entier. Une exception logée dedans serait
invisible depuis l'app qu'elle concerne.
