---
name: integrer-une-version-du-modele
description: Intégrer une nouvelle version du modèle d'éligibilité livrée par l'éditeur dans apps/simulateur-eligibilite (paquet déposé dans tmp/<version>/). À charger dès qu'il s'agit de recopier, porter ou monter le modèle publicodes, de faire le diff d'un livrable, ou de remonter une anomalie à l'éditeur.
---

# Intégrer une version du modèle

Le modèle d'éligibilité est **livré de l'extérieur**. Un paquet arrive dans
`tmp/<version>/transports-sanitaires-package-v<version>/` et porte trois YAML :
les règles publicodes, un contrat d'interface, une matrice de tests. Seul le
premier est chargé par l'app ; les deux autres sont **réencodés** dans nos
composants et nos tests.

**On ne corrige jamais le modèle localement.** Il est recopié tel qu'il est
livré. Ce qui ne va pas se constate, se documente et se remonte à l'éditeur —
voir « Quand le modèle a tort ». Un correctif local a existé une fois, en v9.1,
et a été retiré dès que l'éditeur a corrigé (`f4da5b7`).

Précédents à relire au besoin : `128bbfa` (v9.4.1, un commit), et la v9.5.0 en
quatre commits — `afc1052`, `1914314`, `1de1038`, `7bc16d7`.

## 1. Le paquet

```bash
cd tmp/<version>/transports-sanitaires-package-v<version>
sha256sum -c SHA256SUMS
```

Puis lire, dans cet ordre : le `CHANGELOG-v<version>.md`, qui dit ce que
l'éditeur a voulu, et `documentation-developpeur/DOCUMENTATION-DEVELOPPEUR-DIFFERENTIELLE-*.md`,
qui sépare ce que publicodes calcule, ce que l'app doit rendre, et ce qu'il faut
tester. Ce dernier est le plus utile des deux.

## 2. Le diff, avant toute chose

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
   pour la plus mauvaise raison — voir § 6.

## 3. La recopie

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

## 4. Le contrat de règles

`front/simulateur/contrat-regles-publicodes.ts` déclare les noms que le code a le
droit d'employer. Trois listes, et le rangement compte :

| Liste | Ce qu'on y met |
|---|---|
| `CIBLES` | les sorties que le produit affiche ou décide |
| `QUESTIONS` | les règles **que le code renseigne** dans une situation |
| `REGLES_LUES` | les règles que le code lit sans jamais les écrire |

**Une question devenue calculée quitte `QUESTIONS`.** Sinon `SituationTypee`
continue d'autoriser une seed ou un test à prétendre la renseigner, alors que le
modèle en décide désormais seul. Si plus rien ne la nomme, elle quitte le
contrat tout court : y déclarer une clé est le geste qui en autorise l'usage.

En v9.5.0 : `p1_m0_smur` supprimée du modèle, `p2_accompagnement_tiers` et
`p2_convocation_ou_avis` devenues calculées, `cible_nombre_transports_prevus` et
`cible_ald_reconnue_liee_aux_soins` nouvellement consommées.

## 5. Les seeds

`front/outils-produit/seeds/base-neutre.ts` répond à **chaque** question du
modèle par sa valeur la plus banale. Une question supprimée en sort ; une
question ajoutée y entre ; une possibilité renommée s'y met à jour. Le catalogue
(`catalogue.ts`) ne déclare que ce qui distingue chaque situation, et ses
attendus sont confrontés au moteur par `tests/simulateur/scenarios.test.ts`.

Un attendu qui change **n'est pas un test à réparer** : c'est un comportement du
modèle qui a bougé. Le mettre à jour, et écrire dans la `description` de la seed
pourquoi il a bougé.

## 6. Les libellés recopiés

C'est le gros du travail, et le moins intéressant. Un énoncé ou une possibilité
du modèle est recopié à ces endroits :

| Où | Quoi |
|---|---|
| `front/outils-produit/seeds/base-neutre.ts` | les valeurs des `une possibilité` |
| `front/outils-produit/seeds/catalogue.ts` | les constantes de réponses (`AIDE_PROFESSIONNEL`, …) |
| `front/outils-produit/beta/cerfa/reponses.ts` | `VALEURS_COMPAREES`, gardé par `tests/cerfa/remplissage.test.ts` |
| `front/simulateur/secretariat/motifs-de-la-dap.ts` | les libellés du contrat d'interface |
| `tests/simulateur/situations-v9-<version>.ts` | le vocabulaire des scénarios |
| `tests/cerfa/gabarit.ts` | les situations de référence du CERFA |
| les tests d'interface | les **regex** qui ciblent une question ou une réponse |

Les regex des tests sont les plus traîtres : elles échouent loin de la cause. En
v9.5.0, `/^le patient/i` ne matchait plus « Concernant son déplacement, le
patient : », et `/entrée ou sortie d'hospitalisation/i` ne matchait plus « … d'une
hospitalisation » — d'où une réponse manquée, un parcours qui bifurque, et un
test qui échoue trois écrans plus loin.

## 7. Le piège de la réponse par défaut

`tests/simulateur/parcours.ts` remplit par défaut toute question qu'un test ne
cible pas : « Non » pour un oui/non, l'option exclusive pour une mosaïque, la
sortie « Aucun… » pour un choix unique qui en offre une, sa première possibilité
sinon.

**Une nouvelle question à choix unique dont la première réponse conclut le
parcours casse tous les tests qui la traversent.** C'est ce qu'a fait A2.1 en
v9.5.0, dont la première des huit réponses est une convocation. Vérifier, pour
chaque choix unique ajouté, ce que la réponse par défaut y déclenche.

## 8. La recette portée

Les fichiers de recette portent la version dans leur nom et sont **renommés à
chaque intégration** (`git mv`) :

```
tests/simulateur/situations-v<version>.ts          le vocabulaire partagé
tests/simulateur/matrice.ts                        la forme d'un cas, et sa lecture
tests/simulateur/regression-v<version>.test.ts     le droit ouvert et le mode médical
tests/simulateur/article-80-v<version>.test.ts     la charge de l'établissement
tests/simulateur/accord-prealable-v<version>.test.ts la série, la distance, le trajet
tests/simulateur/familles-v<version>.test.ts       ce que le livrable décrit par un générateur
```

Ils gardent les identifiants du livrable (`ALD-002`, `CONVOCATION-001`, …) : c'est
sous ce nom qu'un désaccord remonte à l'éditeur. Les assertions purement UI de la
matrice n'y sont pas — elles relèvent des tests d'interface.

Chaque `test_case` neuf de la matrice livrée mérite son portage. La matrice est
**séparée par sujet** et non par volume : à 300 lignes, `noExcessiveLinesPerFile`
et `tests/architecture.test.ts` refusent le fichier, et le message dit pourquoi.

## 9. Les gardes qui parlent

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

## 10. Les contenus du contrat d'interface

Le `*.ui.yaml` n'est pas chargé : ses contenus sont réencodés dans les
composants. Une version qui réécrit un bloc de résultat se répercute donc à la
main — page Résultat 1 dans `front/simulateur/prescripteur/ResultatMedical.tsx`,
page Résultat 2 dans `front/simulateur/secretariat/Bloc{1,2,3}*.tsx` et
`cases-documentaires.ts`.

Reprendre les textes **mot pour mot** : ils sont validés par le porteur, et une
reformulation en passant ne se verrait nulle part.

## 11. La découpe en commits

Quatre commits, dans cet ordre, chacun laissant `pnpm verifier` vert :

| Type | Ce qu'il porte |
|---|---|
| `feat(simulateur): porte le modèle d'éligibilité en v<version>` | le modèle, `VERSION`, le contrat, les seeds, la recette renommée, les libellés recopiés — tout ce qu'il faut pour que la suite repasse |
| `test(simulateur): porte la recette v<version>` | les assertions neuves de la matrice livrée |
| `feat(simulateur): rend les contenus de la v<version>` | ce que le contrat d'interface ajoute ou réécrit à l'écran |
| `docs(simulateur): met le README à l'heure de la v<version>` | le compte de règles et de cibles, les noms des fichiers de recette |

Le premier est gros par nature : il ne peut pas être vert à moitié. Les
règles de commit du dépôt s'appliquent (`docs/contributing/regles-git.md`),
GIT-005 compris — deux paragraphes, et l'état de vérification pour finir.

**La livraison est un autre geste**, décrit par le skill `livrer-une-version` :
ne pas monter `package.json` ni écrire dans `CHANGELOG.md` ici.

## Quand le modèle a tort

Écrire un constat dans `tmp/anomalie-v<version>-<sujet>.md`, destiné à être
envoyé tel quel. Le précédent est `tmp/anomalie-v9-5-0-accompagnement.md`, et sa
structure vaut d'être reprise : en-tête (modèle, règles en cause, comment c'est
reproduit), le constat en une phrase, ce qui se passait avant, ce qui se passe
maintenant, pourquoi cela nous arrête, la cause qu'on suppose, ce qu'on a
constaté à l'exécution, ce qu'on a fait de notre côté, et la question posée avec
les pistes de correction.

En attendant la réponse, on intègre quand même. Les attendus touchés sont mis à
jour pour constater le comportement réel, avec un commentaire qui dit pourquoi.
Un test devenu inexécutable n'est pas supprimé : il est réécrit pour constater
l'impasse, de sorte qu'il redevienne rouge le jour où l'éditeur la rouvre —
voir `tests/cerfa/depuis-simulateur.test.ts`, cas de l'accompagnant sur la PMT.
