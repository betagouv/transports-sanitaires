---
name: implement-publicodes-version
description: Intégrer une nouvelle version du modèle d'éligibilité livrée par l'éditeur dans apps/simulateur-eligibilite (paquet déposé dans tmp/<version>/). À charger dès qu'il s'agit de recopier, porter ou monter le modèle publicodes, de faire le diff d'un livrable, ou de remonter une anomalie à l'éditeur.
---

# Implémenter une version du modèle

Le modèle d'éligibilité est **livré de l'extérieur**. Un paquet arrive dans
`tmp/<version>/` (§ 1 pour sa forme, qui varie d'une livraison à l'autre) et
porte trois YAML : les règles publicodes, un contrat d'interface, une matrice
de tests. Seul le premier est chargé par l'app ; les deux autres sont
**réencodés** dans nos composants et nos tests.

**On ne corrige jamais le modèle localement.** Il est recopié tel qu'il est
livré. Ce qui ne va pas se constate, se documente et se remonte à l'éditeur
(§ Retour à l'éditeur, dans les connaissances du domaine ci-dessous).

Les intégrations passées ont laissé des traces datées : les commits, les pièges
rencontrés, l'unique correctif local. Elles sont dans
[`references/precedents.md`](references/precedents.md), à lire au besoin.

## Process

### 1. Le paquet

Sa forme varie d'une livraison à l'autre — deux vues jusqu'ici :

- un dossier `tmp/<version>/transports-sanitaires-package-v<version>/`, un
  `SHA256SUMS` à vérifier (`sha256sum -c SHA256SUMS`), les YAML dans un
  sous-dossier ;
- ou, depuis la v9.7.1, un dépôt à plat dans `tmp/<version>/` (YAML à la
  racine, pas de sous-dossier), un `MANIFEST.sha256.json`, et un vérificateur
  fourni par le paquet lui-même :
  ```bash
  cd tmp/<version> && PYTHONDONTWRITEBYTECODE=1 python3 src/package.py --verify
  ```
  Cette forme exige un inventaire **exact** : n'écrire aucun fichier dans
  `tmp/<version>/`, et ne pas y lancer `npm test`, qui réécrit `rapports/`.

Dans les deux cas, lire ensuite, dans cet ordre, le `CHANGELOG-v<version>.md`
(`docs/` depuis la v9.7.1), qui dit ce que l'éditeur a voulu, puis le document
qui sépare ce que publicodes calcule, ce que l'app doit rendre et ce qu'il faut
tester — `documentation-developpeur/DOCUMENTATION-DEVELOPPEUR-DIFFERENTIELLE-*.md`
ou, depuis la v9.7.1, `docs/GUIDE-DEVELOPPEUR-v<version>.md`. C'est le plus
utile des deux.

Les contrôles neufs d'une version peuvent vivre hors de la matrice YAML : la
v9.7.1 les porte dans des suites `tmp/<version>/tests/*.mjs`, à lire une par
une pour en tirer les identifiants (voir « La recette portée » ci-dessous).

### 2. Le diff, avant toute chose

```bash
A=tmp/<précédente>/…-package-v<précédente> B=tmp/<version>/…-package-v<version>
diff -u $A/transports-sanitaires.publicodes.flat-*.yaml $B/transports-sanitaires.publicodes.flat-*.yaml
diff -u $A/transports-sanitaires.ui.*.yaml            $B/transports-sanitaires.ui.*.yaml
diff -u $A/transports-sanitaires.tests.*.yaml         $B/transports-sanitaires.tests.*.yaml
```

`regles/regles.publicodes` est la recopie **exacte** du flat de la version en
cours : le diff des deux livrables est donc, au caractère près, le diff qu'on
subit. C'est le plan de travail, et il vaut d'être montré avant de coder.

Trois questions à lui poser, dans cet ordre :

1. **Quelles clés disparaissent ?** Chacune est citée quelque part dans le code.
2. **Quelles questions deviennent calculées ?** Une règle qui perd sa `question`
   pour une `valeur` n'est plus renseignable. C'est le changement le plus
   coûteux, et le moins visible.
3. **Quels libellés changent ?** Ce sont eux qui cassent le plus de tests, et
   pour la plus mauvaise raison (voir « Les libellés recopiés » ci-dessous).

### 3. Découper en tickets avec `/to-tasks`

Le diff en main, passer par `/to-tasks` plutôt que d'enchaîner à la main :
lui donner le diff et les connaissances du domaine ci-dessous comme contexte.
Les frontières naturelles d'une intégration, observées sur les précédentes :

| Ticket | Ce qu'il porte | Bloqué par |
|---|---|---|
| Porter le modèle en v<version> | le modèle recopié, `VERSION`, le contrat de règles, les seeds, la recette portée, les libellés recopiés : tout ce qu'il faut pour que la suite repasse | — |
| Porter la recette v<version> | les assertions neuves de la matrice livrée | le ticket précédent |
| Rendre les contenus de la v<version> | ce que le contrat d'interface (`*.ui.yaml`) ajoute ou réécrit à l'écran | le ticket précédent |
| Mettre à jour le README | le compte de règles et de cibles, les noms des fichiers de recette | tous les tickets de code |
| Remonter les anomalies à l'éditeur | un fichier par sujet dans `tmp/`, indépendant du reste | — |

Le premier ticket est gros par nature et ne se scinde pas : le modèle recopié
casse tout ce qui le nomme, rien n'est vert tant que tout ne l'est pas. Une
version plus large (un écran refondu, un sujet neuf comme la convocation
aérienne en v9.7.1) mérite ses propres tickets en plus de ceux du tableau —
même règle de séparation par sujet qu'ailleurs dans le dépôt.

**La livraison est un autre geste**, décrit par le skill `livrer-une-version` :
aucun ticket ne monte `package.json` ni n'écrit dans `CHANGELOG.md`.

### 4. Implémenter avec `/implement`

Exécuter les tickets avec `/implement`. Les seams naturels pour le TDD :
`contrat-regles-publicodes.ts` (une clé qui entre ou sort), `base-neutre.ts` et
`catalogue.ts` (une seed qui change), `scenarios.test.ts` (un attendu qui
bouge). Les « gardes qui parlent » ci-dessous disent, pour chaque suite de
tests existante, ce qu'un échec signifie réellement — les lire avant de
toucher au code qu'elles gardent.

`pnpm verifier` vert à la fin de chaque ticket, comme le veut `/implement` —
et comme le veut GIT-005 (`docs/knowledge/contributing/regles-git.md`) pour
chaque commit qui en résulte : un commit, une intention.

## Connaissances du domaine

À lire en écrivant les tickets (§ 3) et en les implémentant (§ 4).

### La recopie

```bash
cp tmp/<version>/…/transports-sanitaires.publicodes.flat-v<version>.yaml \
   apps/simulateur-eligibilite/regles/regles.publicodes
printf 'v<version>\n' > apps/simulateur-eligibilite/regles/VERSION
cd apps/simulateur-eligibilite && pnpm valider-regles
```

`regles/VERSION` va **avec** la recopie : le pied de page l'affiche, et
`tests/app/BandeauVersion.test.tsx` compare les deux. Sans elle, l'app annonce
une version qu'elle n'exécute pas.

Le compte de règles et de cibles, que le README annonce :

```bash
cd apps/simulateur-eligibilite   # pour que js-yaml se résolve
node -e "const r=require('js-yaml').load(require('fs').readFileSync('regles/regles.publicodes','utf8'));
console.log(Object.keys(r).length,'règles,',Object.keys(r).filter(n=>n.startsWith('cible_')).length,'cibles')"
```

### Le contrat de règles

`front/simulateur/contrat-regles-publicodes.ts` déclare les noms que le code a le
droit d'employer. Ses quatre listes (`CIBLES`, `QUESTIONS`, `ENTREES_CALCULEES`,
`REGLES_LUES`) sont décrites par le skill `regle-publicodes` ; une intégration
les rouvre toutes les quatre.

**Une question devenue calculée quitte `QUESTIONS`.** Sinon `SituationTypee`
continue d'autoriser une seed ou un test à prétendre la renseigner, alors que le
modèle en décide désormais seul. Si plus rien ne la nomme, elle quitte le
contrat tout court : y déclarer une clé est le geste qui en autorise l'usage.

### Les seeds

`front/outils-produit/seeds/base-neutre.ts` répond à **chaque** question du
modèle par sa valeur la plus banale. Une question supprimée en sort ; une
question ajoutée y entre ; une possibilité renommée s'y met à jour. Le catalogue
(`catalogue.ts`) ne déclare que ce qui distingue chaque situation, et ses
attendus sont confrontés au moteur par `tests/simulateur/scenarios.test.ts`.

Un attendu qui change **n'est pas un test à réparer** : c'est un comportement du
modèle qui a bougé. Le mettre à jour, et écrire dans la `description` de la seed
pourquoi il a bougé.

### Les libellés recopiés

C'est le gros du travail, et le moins intéressant. Un énoncé ou une possibilité
du modèle est recopié à ces endroits :

| Où | Quoi |
|---|---|
| `front/outils-produit/seeds/base-neutre.ts` | les valeurs des `une possibilité` |
| `front/outils-produit/seeds/catalogue.ts` | les constantes de réponses (`AIDE_PROFESSIONNEL`, …) |
| `front/outils-produit/beta/cerfa/reponses.ts` | `VALEURS_COMPAREES`, gardé par `tests/cerfa/remplissage.test.ts` |
| `front/simulateur/secretariat/motifs-de-la-dap.ts` | les libellés du contrat d'interface |
| `tests/simulateur/situations.ts` | le vocabulaire des scénarios |
| `tests/cerfa/gabarit.ts` | les situations de référence du CERFA |
| les tests d'interface | les **regex** qui ciblent une question ou une réponse |

Les regex des tests sont les plus traîtres : elles échouent loin de la cause. Un
énoncé reformulé fait manquer une réponse, le parcours bifurque, et le test tombe
trois écrans plus loin. Les précédents en montrent deux exemples.

### Le piège de la réponse par défaut

`tests/simulateur/parcours.ts` remplit par défaut toute question qu'un test ne
cible pas :

- « Non » pour un oui/non ;
- l'option exclusive pour une mosaïque ;
- la sortie « Aucun… » pour un choix unique qui en offre une ;
- sa première possibilité sinon.

**Une nouvelle question à choix unique dont la première réponse conclut le
parcours casse tous les tests qui la traversent.** Vérifier, pour chaque choix
unique ajouté, ce que la réponse par défaut y déclenche.

### La recette portée

Les fichiers de recette **ne portent pas la version** du modèle, ni dans leur
nom, ni dans leurs `describe`/`it`. Un test qui passe vaut pour le modèle en
cours, quel que soit son numéro : l'intégration met les attendus à jour, elle
ne renomme rien. Seuls les identifiants du livrable gardent la leur
(`CONV971-*`, `RETOURS972-*`, `V973-*`) : c'est leur nom chez l'éditeur. Ne
pas les « monter » à la version courante. L'ensemble :

```
tests/simulateur/situations.ts             le vocabulaire partagé
tests/simulateur/livrable.ts               l'adaptateur options → réponses du livrable
tests/simulateur/matrice.ts                la forme d'un cas, et sa lecture
tests/simulateur/regression.test.ts        le droit ouvert et le mode médical
tests/simulateur/article-80.test.ts        la charge de l'établissement
tests/simulateur/accord-prealable.test.ts  la série, la distance, le trajet
tests/simulateur/familles.test.ts          ce que le livrable décrit par un générateur
tests/simulateur/grille.test.ts            un produit croisé engendré
tests/simulateur/matrice-nommee.test.ts    les cas nommés un par un
tests/simulateur/motifs-dap.test.ts        les motifs de DAP sans distance ni série
tests/simulateur/permission.test.ts        un sujet neuf, propre à sa version
tests/simulateur/campagne-*.test.ts        la campagne de l'éditeur, une famille par fichier
```

Depuis la v9.7.3, l'éditeur livre aussi une **campagne** (`tests/campagne-v973/`
du paquet) : `ROUTE-*`, `PERM-*`, `DEC-*`, `DOC-*`, `TR-*`, plus les `V973-*` et
`EM-*`. Elle se rejoue au moteur, une famille par fichier `campagne-*`. Un refus
de `Session.submit()` s'y lit comme un résultat bloqué, un `field()` du payload
par `depuisLeMapping` (`document-du-livrable.ts`). Les modifications après coup
(`TR-*`) se rejouent en simulant ce que fait l'application
(`aval-invalide.ts`, `invalidation-lieu.ts`), pas la session de
l'éditeur. L'adaptateur migre les fixtures de la version précédente
(`migration-du-livrable.ts`).

Une version qui introduit un sujet entier (la convocation aérienne et son
financement pour la v9.7.1) mérite ses propres fichiers plutôt que d'étirer un
fichier existant — même règle de séparation par sujet qu'ailleurs dans le
dépôt. Un sujet peut aussi se scinder en deux à la relecture (`X` et
`X-incomplet`, un sujet et sa page « ce qui laisse indécis ») quand les deux
dépassent 300 lignes ensemble.

Ils gardent les identifiants du livrable (`ALD-002`, `CONVOCATION-001`,
`CONV971-AIR-ORIENTATION-SANS_CONTEXTE`, …) : c'est sous ce nom qu'un désaccord
remonte à l'éditeur. Les assertions purement UI de la matrice n'y sont pas :
elles relèvent des tests d'interface.

Chaque `test_case` neuf de la matrice livrée mérite son portage — mais pas
forcément littéralement : un contrôle qui manipule directement une session de
référence (reprise d'état, historique de pages) ne transpose pas toujours à
notre moteur nu ou à notre mécanique de retour en arrière. Le dire dans le
commit plutôt que de forcer un test à passer sans rien vérifier de réel (« Les
gardes qui parlent » ci-dessous en donne deux formes : la garde qui ne se
traduit pas au moteur seul, et la bibliothèque de formulaire dont l'historique
de pages ne rejoue pas une page déjà visitée).

La matrice est **séparée par sujet** et non par volume : à 300 lignes,
`noExcessiveLinesPerFile` et `tests/architecture.test.ts` refusent le fichier,
et le message dit pourquoi.

**Le piège CI de gitleaks :** `.gitleaks.toml` exempte `livrable.ts` de la
règle `generic-api-key`, qui prend les noms de règles longs pour des clés. Un
fichier qui recopie aussi des noms de règles en demande autant.

### Les gardes qui parlent

Ces tests-là ne sont pas des tests à réparer : chacun dit une chose précise.
Lire le message avant de toucher au code.

| Ce qui échoue | Ce que ça veut dire |
|---|---|
| `tests/regles-front.test.ts` | une clé du contrat n'existe plus, une valeur comparée a été reformulée, ou un cas final n'est traité par aucun bloc de résultat |
| `informations-des-questions.test.tsx` | une `description` a été ajoutée ou réécrite dans le modèle, et rien ne garantit qu'elle atteint l'écran |
| `mosaiques.test.tsx` | une mosaïque, son intitulé ou son option exclusive ont changé |
| `scenarios.test.ts` | une situation de référence ne produit plus l'attendu écrit à côté d'elle |
| `remplissage.test.ts` | un libellé comparé par le CERFA n'est plus une possibilité du modèle |
| `motifs-de-la-dap.test.tsx` | le modèle porte un motif de DAP que la page n'affiche pas |
| `bornes-de-saisie.test.tsx` | une borne de saisie du modèle n'atteint pas le champ |
| `BandeauVersion.test.tsx` | `regles/VERSION` ou `package.json` sont désaccordés |

Deux limites rencontrées en portant la matrice v9.7.1, à connaître avant d'y
passer du temps :

- **Le moteur nu n'est pas le parcours.** Une réponse manquante qui bloque la
  navigation (question posée avant qu'on puisse avancer) ne bloque pas
  forcément `cible_resultat_2_affichable` quand on construit la situation à la
  main : `est défini: X` vaut `false`, pas indécis, dès que `X` est absent —
  le modèle peut alors conclure ailleurs (souvent « non éligible ») sans
  jamais réclamer `X`. La vraie garde tient à l'ordre du parcours
  (`etapes.ts`), pas au moteur seul. Documenter ces contrôles-là comme non
  transposables plutôt que de les forcer à passer sur un aveu.
- **`@publicodes/forms` n'oublie jamais une page visitée.** `computeNextFields`
  exclut toute règle déjà portée par une page de `formState.pages`, même
  redevenue manquante après un `handleInputChange(..., undefined)`. Rendre une
  page antérieure à nouveau incomplète ne suffit donc pas à la faire
  reposer : il faut aussi tronquer `formState.pages` jusqu'à elle et la
  reprendre comme page courante (`convocation-revalidation.ts`). Et
  `handleInputChange` **mute** `formState` en place (il y réassigne
  `formState.situation`) — lire une valeur « avant » se fait avant l'appel,
  jamais sur l'objet qu'on vient de lui passer.

### Les contenus du contrat d'interface

Le `*.ui.yaml` n'est pas chargé : ses contenus sont réencodés dans les
composants. Une version qui réécrit un bloc de résultat se répercute donc à la
main :

| Bloc | Où |
|---|---|
| Page Résultat 1 | `front/simulateur/prescripteur/ResultatMedical.tsx` |
| Page Résultat 2 | `front/simulateur/secretariat/Bloc{1,2,3}*.tsx` et `cases-documentaires.ts` |

Reprendre les textes **mot pour mot** : ils sont validés par le porteur, et une
reformulation en passant ne se verrait nulle part.

### Le retour à l'éditeur

Une intégration apprend des choses que seul l'intégrateur voit :

- une règle qui se contredit ;
- un libellé qui ne dit pas ce qu'il calcule ;
- une question supprimée dont la valeur ne se déduit pas ;
- un cas devenu inatteignable.

**Rien de tout cela ne se remonte de mémoire.** Ça s'écrit au moment où on le
constate, dans un fichier, et ça part chez l'éditeur du modèle.

Un fichier par sujet, dans `tmp/`, nommé `anomalie-v<version>-<sujet>.md`, et
**écrit pour être envoyé tel quel** : le destinataire ne connaît ni notre code,
ni nos tests. Sa structure :

| Section | Ce qu'elle porte |
|---|---|
| En-tête | le modèle concerné, les règles en cause, comment le constat est reproduit |
| Le constat en une phrase | de quoi décider s'il faut lire la suite |
| L'origine | où se trouve le problème, en un mot : `spec`, `publicodes` ou `app` (voir ci-dessous) |
| Ce qui se passait avant | la version précédente, et pourquoi elle tenait |
| Ce qui se passe maintenant | l'enchaînement, étape par étape |
| Pourquoi cela nous arrête | la conséquence pour le prescripteur ou le patient, pas pour notre code |
| La cause supposée | ce qu'on croit avoir été confondu, sans l'affirmer |
| Ce qu'on a constaté à l'exécution | les scénarios de la recette qui ont changé de résultat |
| Ce qu'on a fait de notre côté | pour que l'éditeur sache ce qu'il défait s'il corrige |
| La question | fermée, avec les pistes de correction : le choix lui revient |

L'origine dit à l'éditeur quelle pièce corriger :

| Origine | Où est le problème | Exemple |
|---|---|---|
| `spec` | un ticket, un contrat (`docs/*.md`) ou le contrat d'interface (`*.ui.yaml`) | un ticket suppose une capacité que l'application n'a pas |
| `publicodes` | les règles du modèle (`*.publicodes.flat-*.yaml`) | une règle accepte une réponse que le reste du livrable refuse |
| `app` | du code applicatif : celui de référence de l'éditeur (`src/application.mjs`), ou le nôtre | une fonction de référence ignore une clé du contrat ; un écart que notre application assume |

Quand deux pièces se contredisent, les nommer toutes les deux (`spec et app`),
et dire laquelle on a suivie. L'origine se complète de deux lignes : le
comportement **attendu**, tel que la spec et le modèle le décrivent, et le
comportement **observé dans notre application**. Sans elles, le lecteur ne
sait pas si le problème est chez nous.

Deux réflexes qui rendent ces constats utiles :

- **Reproduire avant d'écrire.** Un constat vaut par ce qu'il montre. Évaluer le
  cas au moteur, ou nommer les scénarios de la recette qui ont basculé, plutôt
  que de raisonner sur le diff.
- **Séparer le fait de l'hypothèse.** Ce que le modèle fait est vérifiable ; ce
  qui a été voulu ne l'est pas. Les deux ne s'écrivent pas sur le même ton.

**En attendant la réponse, on intègre quand même** : le modèle est recopié tel
qu'il est livré, comme le dit la règle d'ouverture. Les attendus touchés sont mis
à jour pour constater le comportement réel, avec un commentaire qui dit pourquoi.
Un test devenu inexécutable n'est pas supprimé : il est réécrit pour constater
l'impasse, de sorte qu'il redevienne rouge le jour où l'éditeur la rouvre. Voir
`tests/cerfa/depuis-simulateur.test.ts`, cas de l'accompagnant sur la PMT.
