# Simulateur d'éligibilité aux transports sanitaires

Aide un prescripteur hospitalier à déterminer, par un questionnaire guidé, si le
transport d'un patient est pris en charge par l'Assurance Maladie, et ce qu'il doit faire
en conséquence. Le parcours débute par un rattachement obligatoire à un établissement et
à un service, sans identifier la personne.

> **L'app est entre deux modèles.** Le modèle d'éligibilité v9 et tout ce qui en
> dépendait ont été retirés, et la v10 n'est pas encore intégrée. Le simulateur déroule
> un **questionnaire factice**, qui ne décide rien du transport. Le socle,
> lui, est prêt à recevoir la v10. Voir
> [« Entre deux modèles »](#entre-deux-modèles).

## Fonctionnement

```mermaid
flowchart LR
    subgraph front["Front (navigateur)"]
        Ident["Rattachement<br/>établissement + service"]
        Simu["Simulateur<br/>questionnaire → résultat → complément"]
        Analytics["Analytics"]
    end

    subgraph back["Backend (Node/Express)"]
        Ref["Référentiel"]
    end

    Grist[("Grist")]
    Matomo[("Matomo")]

    Ident -->|"consulte, déclare un service « Autre »"| Ref
    Ident -->|"rattachement validé"| Simu
    Ident -->|"id du service"| Analytics
    Simu -->|"événements de parcours"| Analytics
    Ref -->|"lit, complète"| Grist
    Analytics -->|"envoie"| Matomo
```

Aucune réponse du questionnaire ne quitte le navigateur. Le backend ne sert que le
front et le référentiel de rattachement.

## Commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `pnpm verifier` | **La vérification complète** : lint, typecheck, knip, tests, build et sa vérification de bundle. C'est la commande que lance la CI, telle quelle : ce qui passe ici passe là-bas. |
| `pnpm dev` | Le front et le backend de dev ensemble. C'est ce que lance `tsp dev simulateur`. |
| `pnpm dev:front` | Le front de dev, sur le port 5173, qui proxifie `/api` vers `:3000` |
| `pnpm dev:server` | Le backend de dev, sur le port 3000, en `--watch`, qui charge `.env` s'il est présent |
| `pnpm test` | Vitest. Le smoke Grist est ignoré sans `GRIST_API_KEY`. |
| `pnpm lint` | Biome : format, tri des imports et lint. `lint:fix` applique les corrections sûres. Le socle est commun aux apps du dépôt, dans `biome.base.jsonc` à la racine. |
| `pnpm knip` | Les exports, fichiers et dépendances que plus personne n'atteint |
| `pnpm typecheck` | `tsc -b` sur les quatre projets : front, node, serveur et tests |
| `pnpm build` | Typecheck puis build Vite dans `dist/`, suivi de `verifier-bundle`. `pdf-lib` et le catalogue de seeds doivent rester hors du chunk d'entrée, sans quoi chaque prescripteur télécharge ce qu'il ne verra jamais. |
| `pnpm start` | Le serveur de production (`node server/server.ts`, Node 24) |

Les règles d'écriture et les invariants ne sont pas de la prose, ils sont exécutables.
On les trouve dans `tests/architecture.test.ts`, pour les frontières, dans
`tests/taille-du-code.test.ts`, pour les limites de 30 et 300 lignes, et dans `tests/lisibilite.test.ts`, pour la forme des fichiers, les noms
et les extensions d'import. Lis leur message d'échec : chacun dit ce que sa règle
protège. Ce qu'on attend d'un contributeur est écrit dans [AGENTS.md](AGENTS.md).

De n'importe où dans le dépôt, `tsp dev simulateur` lance le front et le backend en
parallèle, et `tsp verifier` passe la vérification sur toutes les apps. Voir
[`apps/cli`](../cli/README.md).

## Configuration

Copier `.env.example` vers `.env`, qui est gitignoré. Les variables `VITE_*` sont lues au
build et bundlées dans le front ; les autres sont détenues par le serveur et ne sont
jamais exposées au front.

| Variable | Portée | Requis | Défaut / si absente | Usage |
| --- | --- | --- | --- | --- |
| `GRIST_API_KEY` | serveur | **prod** | référentiel **snapshot factice** (dev/CI) | Clé API Grist source du référentiel (établissements/services). Jamais exposée au front. |
| `GRIST_DOC_URL` | serveur | non | doc Grist du projet | Base API du doc Grist (`server/referentiel.ts`). |
| `VITE_MATOMO_ENABLED` | front | non | `false` (traceur no-op) | Active le tracking Matomo. Actif d'office en build de prod ; à mettre à `true` pour tester en local. |
| `VITE_MATOMO_URL` | front | non | instance mutualisée beta.gouv | URL de l'instance Matomo. |
| `VITE_MATOMO_SITE_ID` | front | non | `275` | Identifiant du site Matomo. |

La variable marquée **prod** n'a pas de valeur par défaut : son repli est un
référentiel inventé, ce qui n'a de sens que sur un poste de développement. En production — `NODE_ENV=production`, ce que pose Scalingo —
`server/configuration.ts` refuse donc de rendre une configuration incomplète : le serveur
s'arrête au démarrage, avant d'ouvrir son port, sur la liste de ce qui cloche.

```
[simulateur] Démarrage impossible — configuration invalide :
  - GRIST_API_KEY : sans valeur par défaut, elle doit être posée en production
```

La règle est portée par un schéma **zod** : un socle de variables à défaut, et une variante
de production où la clé Grist est exigée. Le schéma valide aussi la forme de ce qui est
posé — `PORT=quatre-mille` ou une `GRIST_DOC_URL` qui n'est pas une URL arrêtent le
démarrage de la même manière, plutôt que d'échouer plus tard et ailleurs. Une variable
posée mais vide (`GRIST_API_KEY=` dans un `.env` recopié) compte pour absente. Les autres
variables ont un défaut documenté ci-dessus : elles ne bloquent jamais le démarrage.
*Gardé par* [`tests/socle/serveur/configuration.test.ts`](tests/socle/serveur/configuration.test.ts).

## Structure (feature-first)

Il y a trois racines de *runtime* : `front/`, le front bundlé par Vite, `server/`, le
backend Node qui détient la clé Grist, et `shared/`, le contrat commun.
Chacune est organisée par feature. À côté, `cms/` porte le script que le CMS exécute
sur ses propres pages : il n'est ni bundlé ni servi par l'app.

```
shared/                  le contrat front ⇄ back, source unique des types partagés
server/                  le backend Node, barrière de sécurité : les secrets vivent ici
                         et ne sont jamais bundlés. Bootstrap, composition,
                         configuration lue une fois et refusée si elle manque en prod.
  rattachement/          LA feature backend : les routes `/api` et la source Grist du
                         référentiel, qu'elle lit et complète
front/                   le front, bundlé par Vite
  main.tsx               le point d'entrée du navigateur : monte l'app, amorce le traceur
  models/                un dossier par modèle, chacun chargé à la demande
    fake/                le modèle de démonstration : une page par capacité du
                         socle. Ses déclarations (questions, faits, cibles), son
                         questionnaire, sa préconisation, ses deux résultats et
                         son catalogue de seeds
    eligibilite/         le modèle de l'éditeur, en cours d'intégration. Ses règles
                         (`rules/`, le YAML livré et sa `VERSION`), ses déclarations,
                         son questionnaire, sa préconisation et ses deux résultats
  socle/                 ce qui ne dépend d'aucune version. `model.ts` est le contrat
                         qu'un modèle remplit, `index.ts` ce qu'il a le droit d'importer
    app/                 le choix de l'écran affiché, la navigation entre les écrans,
                         le conteneur de page, le pied de page
    rattachement/        LA feature de l'écran de rattachement, miroir de server/rattachement/ :
                         le formulaire à révélation progressive, les deux clients de
                         l'API, le rattachement en mémoire de session (ADR-4)
    simulateur/          le parcours : questionnaire, résultat, verrou, complément
    questionnaire-engine/  le moteur de questionnaire : ce qu'est une question, une
                         page, une partie et une adresse, l'état d'un questionnaire et son
                         brouillon, l'invalidation des réponses dépendantes,
                         l'avancement automatique, le champ qui rend une question,
                         ce qui part vers l'analytics
    decision-engine/     le moteur de décision : des faits aux cibles, par les règles
                         publicodes qu'un modèle lui donne. Un fait absent n'est pas
                         envoyé, et laisse indéfinie la cible qui en dépend. Le seul
                         fichier qui importe publicodes, pris par le modèle hors de
                         `index.ts`
    ui/                  les champs de formulaire, bâtis sur le DSFR et sans rien
                         savoir du questionnaire : TextField, TextAreaField,
                         SelectField, RadioField, CheckboxField, NumberField,
                         DateField, AddressField
    developer-tools/      ce qui est réservé au service produit : son encadré, la
                         trace de debug du parcours et de ses résultats, son export, et le
                         déverrouillage, garde commune à l'écran des seeds et aux traces
    seeds/               ce qu'est une seed et son écran. Elles se greffent sur le
                         simulateur, jamais l'inverse : c'est App.tsx qui compose.
    cerfa/               le socle de remplissage d'un PDF : un cerfa et son DTO,
                         l'écriture dans un AcroForm, le texte qui déborde,
                         l'aplatissement, les marques et textes dessinés, la
                         génération et le bouton de téléchargement. Aucun gabarit,
                         et rien du simulateur.
    cerfa-mapping.ts     la traduction des données du simulateur en DTO d'un cerfa
    analytics/           le vocabulaire mesuré, seul import du reste, son transport
                         vers Matomo, et le choix de l'utilisateur transmis par le CMS
cms/                     le script à coller dans Sites Conformes : l'opt-out du pied de
                         page, qui répond au traceur de l'iframe (voir « Intégrer dans
                         Sites Conformes »)
```

## Entre deux modèles

La v10 du modèle change trop de comportements pour être portée par-dessus la v9. L'app
a donc été vidée de ce qui dépendait de la v9, sur la branche `v10`.

| Retiré | Conservé |
| --- | --- |
| les règles publicodes, leur validation, la version du modèle au pied de page | l'interface DSFR |
| le questionnaire engendré par `@publicodes/forms` | l'écran de rattachement et son backend |
| les parcours prescripteur et secrétariat, leurs pages de résultat | la mesure d'audience Matomo, réduite aux événements de parcours |
| les tests métier et la recette du livrable | le comportement de navigation, sur un questionnaire factice |
| le contenu du catalogue de seeds | ce qu'est une seed, l'écran des seeds, les traces de debug |
| les trois CERFA : gabarits, tableaux de remplissage, téléchargement | le socle de remplissage d'un PDF |
| le mode test des règles (labo) | |

Le questionnaire n'est plus déduit d'un moteur de règles : il est **déclaré par
le modèle**. Une partie liste ses pages, une page ses questions, une question dit
quand elle se pose (`askedIf`) et de quelles réponses elle dépend (`dependsOn`).

Le modèle de l'éditeur s'intègre sur la v10.1.1, dans `front/models/eligibilite/`,
une étape après l'autre. Ses règles sont livrées en YAML : Vite les convertit en
objet à la compilation (`vite.config.ts`), et aucun analyseur YAML ne part dans
le navigateur. Le noyau est là : les règles, la déclaration des faits et des
cibles, et l'oracle de l'éditeur rejoué en faits. Le questionnaire pose P1 :
ses réponses donnent les faits du mode de transport, à trois états. De P2, il
pose la prestation (Q2.1, avec ses sous-questions f, g et h) et le trajet : la
distance, l'avion ou le bateau, la série et l'urgence (Q2.3.1 à Q2.3.4).
P2 n'est donc jamais complète, et R2 dit encore que le questionnaire ne l'est
pas.
L'avancement
est dans l'issue 50 du dépôt, les décisions dans
[`docs/knowledge/adr/journal-des-decisions-v10.md`](docs/knowledge/adr/journal-des-decisions-v10.md).

Le modèle de démonstration (`front/models/fake/`) déroule une commande de
boisson, sans rapport avec le transport sanitaire. Il est pérenne : chaque capacité du socle
y a sa page, et ses seeds ouvrent les pages à montrer. Il s'ouvre par défaut ;
les developer tools permettent de passer au modèle de l'éditeur.

Les tests du socle tournent sur leur propre factice
(`tests/socle/fixtures/modele-factice/`), petit et figé : ils ne changent ni
quand l'éditeur livre une version, ni quand la démonstration gagne une page. Il
sert à tenir en vie, et sous test, ce que le parcours réel reprendra :

| Comportement | Ce qu'il fait | Où |
| --- | --- | --- |
| Avancement automatique | Une page faite de choix uniques avance seule 200 ms après la réponse, sans bouton « Suivant ». Au retour, le bouton reprend la main ; changer la réponse avance aussitôt. | `questionnaire-engine/auto-advance.ts` |
| Brouillon | Une saisie ne compte qu'une fois la page validée. « Précédent » abandonne le brouillon. | `questionnaire-engine/questionnaire.ts` |
| Invalidation | Une réponse changée efface les réponses qui en dépendent, et elles seules. | `questionnaire-engine/page-commit.ts` |
| Verrou | Au résultat, « Précédent » rouvre le questionnaire. L'action principale verrouille : le complément est un second parcours, qui ne repose aucune question d'avant et n'a pas de « Précédent » sur sa première page. | `simulateur/Simulateur.tsx` |
| Stepper | Il compte des parties, jamais des pages. Les résultats l'affichent aussi. | `questionnaire-engine/Stepper.tsx` |
| Impression de la fiche | Le premier résultat s'imprime depuis le navigateur, en action principale. Imprimer ne verrouille rien : « Précédent » reste possible, et une fiche changée se réimprime. « Compléter » se tient dans un groupe à part. Seule la fiche s'imprime : boutons, stepper et trace sont masqués (`fr-no-print`). | `simulateur/Resultats.tsx` |
| Téléchargement du cerfa | Sous le second résultat, l'action principale télécharge le cerfa, généré dans le navigateur dès que le résultat s'affiche. Il porte la date du jour où le complément a été validé, qui ne change pas tant qu'il ne l'est pas à nouveau. Un échec s'affiche sous le résultat. Le PDF est aplati, sans aucun champ : il s'imprime depuis le lecteur, et ne s'y corrige plus. | `cerfa/CerfaDownload.tsx`, branché par `simulateur/Resultats.tsx` |
| Texte trop long | Un texte n'est jamais coupé, et ne bloque jamais le cerfa. Trop long pour son cadre, il passe de 9 à 8 pt, puis perd son commentaire facultatif : un avertissement le dit au-dessus du bouton, avant tout téléchargement. S'il ne tient toujours pas, il déborde sous son cadre, par-dessus ce qui s'y trouve, et ne descend sous 8 pt, jusqu'à 6 pt, que pour rester sur la page. | `cerfa/fill-cerfa.ts`, `cerfa/overflow.ts` |
| Résultat sans suite | Quand la préconisation ne donne aucun cerfa, le premier résultat est le dernier écran : pas de bouton pour verrouiller, et le stepper s'arrête sur lui. | `simulateur/Resultats.tsx` |

*Gardé par* `tests/socle/simulateur/`.

## Déployer

Scalingo construit et sert cette app, et déploie depuis `main`.

1. **Passer la vérification.** `pnpm verifier` doit être vert, comme en CI.
2. **Pousser sur `main`.** Scalingo part de là, sans action manuelle.
3. **Laisser construire depuis la racine du dépôt**, et non depuis
   `apps/simulateur-eligibilite/`. C'est ce qu'impose le workspace pnpm : le
   `pnpm-lock.yaml` et le `pnpm-workspace.yaml` vivent à la racine, et une construction
   lancée dans le sous-dossier n'y aurait accès à aucun des deux. Elle installerait des
   versions non verrouillées. Le réglage à tenir côté Scalingo est `PROJECT_DIR`, qui doit
   rester *vide*.
4. **Tenir la variable de production**, `GRIST_API_KEY`. Elle n'a pas de défaut, et le
   serveur refuse de démarrer sans elle (cf. [Configuration](#configuration)).
5. **Relire le pied de page en production.** Il annonce la version de l'app et le sha du
   commit livré.

Trois fichiers de la racine portent ce déploiement :

| Fichier | Ce qu'il donne à Scalingo |
| --- | --- |
| `package.json` | `packageManager` (la version de pnpm), `engines.node`, et deux scripts d'aiguillage : `build` et `start`, qui délèguent tous deux à cette app par `--filter` |
| `Procfile` | `web: pnpm --filter simulateur-eligibilite run start` |
| `pnpm-lock.yaml` | les versions exactes de toutes les apps |

Le build installe donc aussi les dépendances de `data-analyzer` et de `glossaire-notion`.
C'est le prix du lock unique, et il se compte en secondes.

## Intégrer dans Sites Conformes

Le simulateur est embarqué en iframe dans une page Sites Conformes, qui tient aussi
l'opt-out de la mesure d'audience dans son pied de page (voir
[analytics.md](docs/knowledge/adr/analytics.md), ADR-5). Tout se règle dans
l'administration du CMS :

1. **Embarquer l'app.** Dans la page, un bloc « Iframe » (syntaxe experte) dont l'URL
   est celle du simulateur. Laisser le champ « Paramètres » vide : un `sandbox` y
   casserait l'opt-out et l'API.
2. **Installer l'opt-out.** Dans Paramètres → Scripts personnalisés → « Scripts dans
   la section `<body>` », coller le contenu de
   [`cms/statistiques-simulateur.js`](cms/statistiques-simulateur.js) entre
   `<script type="module">` et `</script>`, après avoir remplacé
   `ORIGINE_SIMULATEUR` par l'origine réelle du simulateur (`https://domaine`, sans
   chemin ni barre finale).
3. **Informer.** La politique de confidentialité du site décrit la mesure par service
   et renvoie au bouton du pied de page (R-12 d'analytics.md).
4. **Recetter.** Le bouton « Désactiver la mesure d'audience du simulateur » apparaît
   à la fin du pied de page. Après un clic, plus aucune requête ne part vers
   `stats.beta.gouv.fr` depuis l'iframe, même après rechargement.

Le script vit dans les réglages du CMS, hors de tout déploiement : toute modification
du fichier se recolle à la main. Il ajoute son bouton dans la liste DSFR du pied de
page ; une montée de version de Sites Conformes qui la changerait le ferait
disparaître sans erreur, d'où l'étape de recette.
