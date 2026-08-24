---
name: livrer-une-version
description: Livrer une version d'une app — numéro, entrée de CHANGELOG, montée du package.json, tag `<app>@<version>`, release GitHub. À charger dès qu'il s'agit de livrer, publier, étiqueter ou « sortir une version ».
---

# Livrer une version

**Une livraison ne concerne qu'une app.** Le monorepo n'a pas d'outillage de
workspace ni de tag global : chaque app porte sa version dans son `package.json`
et suit son propre cycle. Une livraison ne touche donc que les fichiers de
`apps/<app>/`.

Un seul précédent à ce jour, `simulateur-eligibilite@0.1.0`. Les exemples
ci-dessous en viennent.

## Ce qu'une livraison produit

| Quoi | Où |
|---|---|
| Le numéro | `apps/<app>/package.json` (et son `package-lock.json`) |
| Ce qu'elle apporte | `apps/<app>/CHANGELOG.md`, la plus récente en haut |
| Le commit | `chore(<app>): livre la version X.Y.Z` |
| Le tag | annoté, `<app>@X.Y.Z` |
| La page publique | une release GitHub sur ce tag |

**Les cinq vont ensemble.** Le pied de page du simulateur affiche sa version et
la lie à la page de sa release (`front/app/BandeauVersion.tsx`) : un tag poussé
sans release publiée fait un lien mort en production, pour tous les utilisateurs.

## 1. Le périmètre

```
git status                       # rien en cours, main à jour
git log --oneline <app>@<version précédente>..main -- apps/<app>
```

Ces commits doivent **déjà être sur `origin/main`** : le journal renvoie à chacun
par son sha sur GitHub. Pousser avant d'écrire le journal, pas après.

Première livraison d'une app, donc pas de tag précédent : remonter au point qui
fait sens et le dire dans l'entrée — la 0.1.0 annonce « les 35 commits mergés
depuis `staging` et `feat/prefill-cerfa-pmt` ».

## 2. Le numéro

Semver. Un `feat` dans le périmètre appelle une mineure, des `fix` seuls un patch.
Rester en `0.x` tant que la surface publique n'est pas figée : c'est ce qui a valu
0.1.0 plutôt que 1.0.0 à un simulateur pourtant en production, le pré-remplissage
des CERFA restant derrière la garde « outils produit ».

Le numéro est une **décision produit** : le proposer avec sa raison, ne pas le
trancher seul.

## 3. L'entrée du journal

```markdown
## [0.2.0](https://github.com/betagouv/transports-sanitaires/releases/tag/simulateur-eligibilite%400.2.0) — 12 septembre 2026

<Une ou deux phrases : ce que la version rassemble, et depuis quel point.>

### TL;DR

- <Ce qu'un lecteur pressé doit retenir, une ligne par sujet.>

### ✨ Nouveautés

- [8c1788e](https://github.com/betagouv/transports-sanitaires/commit/8c1788e) : passe le modèle en v9.4.1 et corrige trois anomalies qu'on avait remontées à l'éditeur : …
```

- Le `@` du tag s'encode en `%40` dans le lien du titre — c'est la forme sous
  laquelle GitHub sert la page d'une release.
- **Les sections, dans cet ordre, selon le type du commit.** Chacune porte son
  emoji, toujours le même, collé au titre — c'est ce qui rend les groupes
  repérables d'un coup d'œil dans une page de release un peu longue :

  | Type de commit | Titre de section |
  |---|---|
  | `feat` | `### ✨ Nouveautés` |
  | `fix` | `### 🐛 Corrections` |
  | `refactor`, `perf` | `### ♻️ Sous le capot` |
  | `test` | `### ✅ Tests` |
  | `docs` | `### 📝 Documentation` |

  Une section vide ne s'écrit pas. Le TL;DR n'a pas d'emoji : il ne groupe pas
  des commits, il résume la version.
- **Une ligne par commit**, sha court, puis un verbe conjugué à la 3ᵉ personne de
  l'indicatif présent — la règle du sujet de commit vaut ici.
- La ligne **n'est pas le sujet recopié**. Elle est écrite pour qui lit le
  produit, tirée du corps du commit, et dit ce qui change pour l'utilisateur
  quitte à être plus longue que le sujet.
- **Chaque commit du périmètre apparaît une fois et une seule.** Compter :
  `git log --oneline <tag>..main -- apps/<app> | wc -l` doit égaler le nombre de
  lignes des sections.

## 4. La montée de version

```
cd apps/<app>
npm version X.Y.Z --no-git-tag-version   # met à jour package.json et le lock
npm run verifier
```

`--no-git-tag-version` est indispensable : le commit et le tag s'écrivent à la
main, avec un message.

Pour le simulateur, `tests/app/BandeauVersion.test.tsx` compare ce que le pied de
page affiche à ce que `package.json` et `regles/VERSION` déclarent. Une montée
oubliée d'un côté s'y voit — c'est la garde de cette étape.

## 5. Le commit et le tag

```
git commit -m "chore(simulateur): livre la version 0.2.0"   # corps argumenté
git tag -a "simulateur-eligibilite@0.2.0" -m "<message>"
git push origin main "simulateur-eligibilite@0.2.0"
```

`chore` parce que le commit ne livre que le numéro et le journal. La 0.1.0 est en
`feat` parce qu'elle apportait aussi le pied de page — ce n'est pas le régime
ordinaire.

Le **message du tag** reprend le titre `<app> <version>`, puis le TL;DR en prose.
C'est ce que voit `git show <tag>`, sans réseau.

## 6. La release GitHub

`gh` vient du toolchain, comme Node : il est épinglé dans `mise.toml` et
s'installe par `mise install`. L'authentification, elle, est personnelle et se
fait une fois — `gh auth login`, portée `repo` suffisante. `gh auth status` dit
où on en est.

Le corps de la release est **l'entrée du journal**, pas autre chose. Comme elle
est la première du fichier, elle s'extrait sans la recopier :

```
cd apps/simulateur-eligibilite
awk '/^## \[/{n++} n==1' CHANGELOG.md | tail -n +2 |
  gh release create "simulateur-eligibilite@0.2.0" \
    --title "simulateur-eligibilite 0.2.0" \
    --verify-tag --notes-file -
```

- `--verify-tag` refuse de créer la release si le tag n'est pas **sur le
  distant** : c'est la garde contre un `git push` du tag oublié à l'étape 5.
- `tail -n +2` retire la ligne de titre, que GitHub affiche déjà.
- **Ne jamais passer `--generate-notes`.** GitHub y liste les sujets de commit :
  on aurait deux textes concurrents pour la même version, et le moins bon des
  deux en évidence.

Relire ce qui est publié — `gh release view "simulateur-eligibilite@0.2.0" --web`.

## 7. Après

Scalingo déploie depuis `main`. Une fois le déploiement passé, lire le pied de
page en production : il doit annoncer la nouvelle version, le sha du commit livré
et la version des règles attendue. Le lien de la version doit ouvrir la release,
pas un 404.

## Ne pas réécrire l'historique d'une version publiée

Le journal renvoie aux commits par leur sha. Un `rebase`, un `amend` ou un
`filter-branch` les change tous et transforme chaque ligne du journal en lien
mort, tag compris. Si l'historique doit vraiment être réécrit, refaire les liens
du journal et replacer les tags dans le même mouvement, avant de pousser.

## Les autres apps

Seul le simulateur a aujourd'hui un journal et un tag. `glossaire-notion` porte
une version dans son `package.json` sans rien de tout cela, et `data-analyzer`
est en `0.0.0` — elle n'est pas livrée, elle tourne. La marche à suivre ci-dessus
vaut dès qu'une app est livrée à quelqu'un : c'est la livraison qui appelle le
journal, pas la présence d'un `package.json`.
