# Plan : séparer le socle et le modèle

Le simulateur a un socle qui ne dépend d'aucune version (rattachement,
questionnaire, analytics, seeds, outils PDF, developer tools) et un modèle qui
change à chaque livrable de l'éditeur. Le but est que faire évoluer l'un ne
touche pas à l'autre.

Ce fichier tient l'ordre des chantiers et le journal des décisions. Chaque
chantier a son fichier, avec ses décisions, ce qui est proposé et ses questions
ouvertes. On les traite un par un, dans l'ordre du tableau.

## Les chantiers

| N° | Chantier | État | Reste |
|---|---|---|---|
| [01](01-vocabulaire.md) | Vocabulaire | arbitré | reporter dans `CONTEXT.md` |
| [02](02-structure-des-dossiers.md) | Structure des dossiers | fait | rien |
| [03](03-contrat-model.md) | Contrat `Model` | écrit | quatre champs pas encore lus par le socle |
| [04](04-declarations-du-modele.md) | Déclarations du modèle | faits et cibles de la v10 déclarés | les questions, les 6 cibles de la preuve Q2.1, les cibles documentaires |
| [05](05-questionnaire-en-parties.md) | Questionnaire en parties | fait | rien |
| [06](06-parcours-et-resultats.md) | Parcours et résultats | fait, hors PDF | impression, production du PDF |
| [07](07-seeds.md) | Seeds | fait | une seed par cas d'oracle, quand l'éditeur le livre en réponses |
| [08](08-tests-et-factice.md) | Tests et factice | fait | rien |
| [09](09-capacites-du-socle-pour-la-v10.md) | Capacités du socle pour la v10 | cadré | tout à coder |
| [10](10-integration-de-la-v10.md) | Intégration de la v10 | étape 1 codée | les étapes 2 à 7 ; les étapes 3 et 4 attendent l'éditeur |

## Commits

| Commit | Ce qu'il fait |
|---|---|
| e9dc636 | sépare le front en socle et modèle (déplacement pur) |
| c6c12b8 | déclare le questionnaire en parties |
| 381090c | injecte le modèle dans le socle par le contrat `Model` |
| a35b0ad | déduit des réponses l'écran où une seed s'ouvre |
| dfc9ccd | vérifie la conformité du modèle livré, et ajoute deux gardes |

## Journal des décisions

Les décisions sont de Simon, sauf mention contraire. Une décision renversée
reste dans le tableau, barrée, avec celle qui la remplace.

| N° | Date | Décision | Chantier |
|---|---|---|---|
| D-01 | 2026-10-07 | Le design applicatif sépare le socle et la version du simulateur. | tous |
| D-02 | 2026-10-07 | Le socle va dans `front/socle/`, la version dans `front/model/`, en anglais. | 02 |
| D-03 | 2026-10-07 | Les règles publicodes s'appellent `rules` et vont dans `front/model/rules/`. | 02 |
| D-04 | 2026-10-07 | La v10 est la seule référence de structure. La v6 et la v9.1 ne comptent pas : elles pilotaient le questionnaire par publicodes. | 03, 06 |
| D-05 | 2026-10-07 | Le socle porte le parcours de la v10. Le modèle ne le redéfinit pas. | 06 |
| D-06 | 2026-10-07 | P0 à P3 sont des `QuestionnairePart`, pas des pages. | 05 |
| D-07 | 2026-10-07 | Un fichier déclare explicitement les questions, les faits, les cibles et tout ce qui entre dans le questionnaire ou sa réponse. Il sert à typer précisément. | 04 |
| D-08 | 2026-10-07 | ~~`completion`~~ abandonné. Le simulateur a deux résultats : R2 à l'issue de P2, R3 (le cerfa) à l'issue du questionnaire entier. | 03, 06 |
| D-09 | 2026-10-07 | La clé du premier résultat s'appelle `transportAndEligibility`. | 03 |
| D-10 | 2026-10-07 | Les génériques de `Model` portent des noms explicites. | 03 |
| D-11 | 2026-10-07 | Le concept qui aboutit à R2 puis à R3 s'appelle une Préconisation. R2 et R3 s'appellent des Résultats. | 01, 03 |
| D-12 | 2026-10-07 | On dit Cibles, en français, pour éviter l'ambiguïté de « target ». Même logique pour Faits. | 01 |
| D-13 | 2026-10-07 | On dit Questions, plus Answers : les trois génériques sont Questions, Faits, Cibles. | 01, 03, 05 |
| D-14 | 2026-10-07 | ~~`AnyAnswers`~~ accepté pour le type non précisé du socle, puis remplacé par D-38. | 03 |
| D-15 | 2026-10-07 | La liste du vocabulaire divergent est soumise à l'équipe pour alignement. | 01 |
| D-16 | 2026-10-07 | « Préconisation » est confirmé. L'éditeur dit « décision » pour la même chose : la correspondance se note dans `CONTEXT.md`. | 01 |
| D-17 | 2026-10-07 | R2 et R3 s'appellent `Resultat` dans le code, en français comme Faits et Cibles. | 01, 03 |
| D-18 | 2026-10-07 | Le second résultat s'appelle `cerfa`, S3141 compris. | 01, 03 |
| D-19 | 2026-10-07 | Questionnaire et parcours sont deux notions : l'ensemble des questions, et le chemin d'un utilisateur dedans. Le code garde « questionnaire ». | 01 |
| D-20 | 2026-10-07 | « Modèle » désigne la version entière (`front/model`). Le fichier publicodes seul, ce sont les « règles ». | 01 |
| D-21 | 2026-10-07 | « Référentiel » est réservé au rattachement. Les corpus CCAM, NGAP, NABM et LPP sont des « nomenclatures ». | 01 |
| D-22 | 2026-10-07 | « Catalogue » est toujours qualifié : « catalogue des seeds ». Les questions de l'éditeur vivent dans les déclarations du modèle. | 01 |
| D-23 | 2026-10-07 | « Trace » est toujours qualifiée : « trace de debug » dans le code, « trace d'audit » pour celle de l'éditeur. | 01 |
| D-24 | 2026-10-07 | « Établissement » est celui du rattachement. Un lieu du trajet est un « lieu de soins ». La « structure » de l'éditeur vaut notre établissement. | 01 |
| D-25 | 2026-10-07 | « Sortie » sort du vocabulaire technique. On dit « cibles » et « résultats ». | 01 |
| D-26 | 2026-10-07 | « Page » désigne un écran de questions à l'intérieur d'une partie (P1/1, P2/trajet). Jamais une partie, jamais un résultat. | 01, 05 |
| D-27 | 2026-10-07 | `readOnly` reste au remplissage PDF. Dans le questionnaire, une réponse reprise sans pouvoir être modifiée est une réponse « déduite ». | 01, 09 |
| D-28 | 2026-10-07 | Les tests se rangent en `tests/socle/` et `tests/model/`, en miroir du front. | 02, 08 |
| D-29 | 2026-10-07 | Le modèle importe le socle par un point d'entrée unique, `front/socle/index.ts`. | 02 |
| D-30 | 2026-10-07 | Le déplacement des dossiers se fait maintenant, en un commit sans changement de comportement. Les gardes arrivent avec l'injection du modèle. | 02 |
| D-31 | 2026-10-07 | Le parcours et le moteur de questionnaire sont deux dossiers frères du socle. | 02 |
| D-32 | 2026-10-07 | Le moteur de questionnaire vit dans `front/socle/questionnaire-engine/`. « Moteur » seul reste au moteur de décision. | 01, 02 |
| D-33 | 2026-10-07 | `front/socle/index.ts` expose ce dont le reste de l'app a besoin, seeds exceptées. | 02 |
| D-34 | 2026-10-07 | Les tests du serveur vont dans `tests/socle/`. | 02 |
| D-35 | 2026-10-07 | La clé `preconisation` reste dans `Model`. Elle contient ce qui calcule la préconisation. | 03 |
| D-36 | 2026-10-07 | Le modèle fournit en champs les libellés des trois actions propres à la version. Le socle rend tous les boutons et garde les libellés de navigation. | 03, 06 |
| D-37 | 2026-10-07 | `preconisation` porte deux fonctions, `faits` puis `cibles`. La trace de debug montre les faits. | 03 |
| D-38 | 2026-10-07 | `Questions` est la déclaration des questions du modèle, avec le type de chaque réponse. `Answers<Questions>` désigne les réponses données à un instant. Le socle garde `Answer`, `Answers`, `lockedAnswers`, `seedAnswers`. Précise D-13. | 03, 05 |
| D-39 | 2026-10-07 | Les déclarations vivent dans `front/model/declarations/` : `questions.ts`, `faits.ts`, `cibles.ts`. | 04 |
| D-40 | 2026-10-07 | Les questions portent les identifiants de l'éditeur : `Q1.1`, `Q2.3.4`. | 04 |
| D-41 | 2026-10-07 | Les déclarations sont écrites à la main. Un test compare les faits et les cibles au YAML et au dictionnaire de l'éditeur. | 04 |
| D-42 | 2026-10-07 | Deux déclarations de cibles. `Cibles` : les 50 qui font la préconisation, figées au verrou. `CiblesDocumentaires` : les 39 qui ne servent qu'à remplir le cerfa. | 01, 04 |
| D-43 | 2026-10-07 | `QuestionnairePart` s'écrit maintenant dans le code, sur le factice. | 05 |
| D-44 | 2026-10-07 | En P3, `askedIf` reçoit les cibles figées au verrou : `askedIf(answers, cibles)`. Le modèle ne recalcule rien. | 05, 06 |
| D-45 | 2026-10-07 | Le stepper s'affiche aussi sur R2 et R3, comme le demande la v10. | 06 |
| D-46 | 2026-10-07 | Le trajet retour différent (les segments) relève du modèle : une question et des questions conditionnelles. | 06, 10 |
| D-47 | 2026-10-07 | Première écriture du contrat et de l'injection sur le factice : tout sauf la production du PDF. R3 n'a pas de bouton de téléchargement. | 03, 06, 07, 08 |
| D-48 | 2026-10-07 | Chaque partie et chaque résultat a un `title`, dont le socle fait le titre de l'écran. (C-1) | 03, 05 |
| D-49 | 2026-10-07 | Dans le factice, répondre « Rien » ne donne aucun cerfa : le résultat est le dernier écran. (C-2) | 06, 08 |
| D-50 | 2026-10-07 | L'avertissement « Ce questionnaire ne décide rien » disparaît de l'écran. (C-3) | 08 |
| D-51 | 2026-10-07 | `front/socle/index.ts` n'exporte pas le type `Seed`. Le catalogue du modèle le lit dans `front/socle/seeds/seed`, seule exception à la garde. (C-4) | 02, 07 |
| D-52 | 2026-10-07 | Le factice reste dans `front/model/` jusqu'à la v10. À son intégration, il migre dans `tests/socle/fixtures/`. D'ici là, les tests du socle le prennent par `tests/socle/modele-de-test.ts`. (C-5) | 08, 10 |
| D-53 | 2026-10-07 | Le contrat garde les quatre champs que le socle ne lit pas encore : `printLabel`, `downloadLabel`, le gabarit et le mapping du cerfa. (C-6) | 03, 06 |
| D-54 | 2026-10-07 | Le catalogue des seeds est chargé par un effet, pas par `use`. (C-8) | 07 |
| D-55 | 2026-10-07 | Le socle reste sans générique. `defineModel` efface les types du modèle par une conversion, à un seul endroit, et `askedIf` est écrit en méthode. Le typage protège le modèle, pas les appels du socle. (C-7) | 03 |
| D-56 | 2026-10-07 | Une seed ne déclare pas où elle s'ouvre. Le parcours le déduit toujours de ses réponses, verrou compris. | 07 |
| D-57 | 2026-10-07 | À l'intégration de la v10, une seed par cas de l'oracle (D01 à D25). Chaque seed cite son cas, et un test vérifie que ses réponses donnent les faits de ce cas. | 07, 10 |
| D-58 | 2026-10-07 | Le test de conformité du modèle s'écrit maintenant, sur le factice, dans `tests/model/`. | 08 |
| D-59 | 2026-10-07 | Un fichier de `front/model/` ne porte pas de version dans son nom, comme un fichier de test. | 08, 10 |
| D-60 | 2026-10-07 | L'adresse est un type de question du socle. Sa réponse est un objet : le type `Answer` s'élargit. | 09 |
| D-61 | 2026-10-07 | Un texte trop long ne bloque jamais le PDF. Le socle applique les règles de l'éditeur tant qu'elles suffisent, puis écrit le texte en entier, en débordant du cadre, comme sur un formulaire papier. C'est un écart au livrable, qui demande de bloquer. | 09, 10 |
| D-62 | 2026-10-07 | Les gabarits des cerfa sont ceux de Notion, « 05. LIVRABLES » : `PMT_cerfa_11574-07`, `DAP_cerfa_11575-08` et celui des moins de 20 ans. Ils sont remplissables. Les PDF du dossier `formulaires/` du livrable sont des spécimens publics, sans champs : ils ne servent pas. | 09, 10 |
| D-63 | 2026-10-07 | Avant de déborder, le socle applique les seules règles automatiques de l'éditeur : réduire le corps jusqu'au plancher, puis retirer le commentaire facultatif en prévenant le prescripteur. La reformulation à valider n'est pas reprise. | 09, 10 |
| D-64 | 2026-10-07 | Le simulateur n'existe que dans le navigateur. L'éditeur a retiré du livrable le verrou, la trace et les marqueurs côté serveur : c'était une erreur. Le verrou est celui du parcours, et le modèle calcule `fait_p1_complete` et `fait_p2_complete`. | 06, 09, 10 |
| D-65 | 2026-10-07 | En Q2.1, la recherche d'acte porte sur la sélection de l'éditeur (`selection_q21.json` : 16 profils, 3 suggestions, leurs synonymes), pas sur les index CCAM et NABM entiers. Aucun autre acte ne peut qualifier dans cette livraison. | 09, 10 |
| D-66 | 2026-10-07 | Chaque capacité du socle a ses tests sur des pages écrites dans le test, et une page de démonstration dans le factice pour la voir à l'écran. | 08, 09 |
| D-67 | 2026-10-07 | Un texte qui déborde continue sous son cadre, quitte à recouvrir ce qui s'y trouve. | 09 |
| D-68 | 2026-10-07 | La taille visée et la taille plancher du texte d'un cerfa viennent d'un fichier de configuration du socle. Une nouvelle version du modèle peut modifier ce fichier. Le contrat `Model` ne change pas. | 09, 10 |
| D-69 | 2026-10-07 | L'intégration de la v10 suit sept étapes, dans l'ordre du questionnaire : 1. le noyau ; 2. P0 et P1, le mode de transport ; 3. P2, l'éligibilité, sans page de résultat ; 4. R2, la page de résultat (mode et éligibilité) ; 5. P3, les informations qui complètent le cerfa, sans PDF ; 6. le premier PDF ; 7. les autres PDF. | 10 |
| D-70 | 2026-10-07 | Du livrable, le dépôt ne garde que le YAML des règles et un fichier `VERSION`, dans `front/model/rules/`. Le dictionnaire des cibles, le mapping, la sélection Q2.1 et l'oracle sont retranscrits dans `front/model/`, selon les règles de la codebase. Les gabarits remplissables vont dans `front/model/cerfa/`. Un script local compare nos déclarations au package à chaque livraison. D-41 se restreint : le test du dépôt compare au YAML seul. | 04, 10 |
| D-71 | 2026-10-07 | `publicodes` revient en version figée `1.10.1`, celle que l'éditeur a testée. Le YAML est converti en objet JavaScript à la compilation : aucun analyseur YAML ne part dans le navigateur. Le modèle entier se charge à la demande, pendant l'écran-porte : le contrat reste synchrone et le chunk d'entrée ne grossit pas. `verifier-bundle` surveille publicodes. | 03, 10 |
| D-72 | 2026-10-07 | Pour remplir les cerfa de la v10, le package fait foi : `mapping_documents.json` et `COMPLETION_DOCUMENTS.md`. Le Google Sheet de Notion n'est pas suivi. La question de son maintien est posée à l'éditeur. | 10 |
| D-73 | 2026-10-07 | Aucun mécanisme dans le code pour désactiver les résultats positifs. La v10 reste sur staging pendant la recette, et passe en production d'un bloc quand tous les profils sont validés. | 10 |
| D-74 | 2026-10-07 | Le rattachement (établissement et service de l'écran-porte) n'est pas le « contexte fiable » du livrable. Les rubriques d'identité du cerfa restent vides : bénéficiaire, assuré, organisme, prescripteur, structure. | 01, 10 |

## Questions ouvertes, par chantier

| Question | Chantier |
|---|---|

## À remonter à l'éditeur

Les tickets ouverts et les questions en attente sont dans
[QUESTIONS-EDITEUR.md](QUESTIONS-EDITEUR.md).
