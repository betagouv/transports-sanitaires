# Journal des versions

Ce qui change d'une version à l'autre. Le titre renvoie à la release GitHub ;
chaque ligne renvoie à son commit et commence par un verbe, comme le sujet du
commit lui-même.

Le simulateur affiche en bas de page la version qu'il exécute, le commit déployé
et la version du modèle de règles.

## [0.2.0](https://github.com/betagouv/transports-sanitaires/releases/tag/simulateur-eligibilite%400.2.0) — 27 août 2026

Deux montées du modèle d'éligibilité, de la v9.4.1 à la v9.5.1, et le passage du
dépôt en workspace pnpm. Dix-neuf commits depuis la 0.1.2.

### TL;DR

- Le modèle passe de la v9.4.1 à la v9.5.1 : 188 règles, 42 cibles.
- Le questionnaire se resserre : Q1 absorbe l'urgence vitale SMUR, A2.1 et A2.2 fondent en une seule question, A3.8 disparaît.
- L'urgence médicale attestée ne supprime pas la demande d'accord préalable, elle supprime l'attente de la décision.
- L'accompagnement par un proche n'impose plus à lui seul une demande d'accord préalable : c'était une régression de la v9.5.0, remontée à l'éditeur et corrigée par la v9.5.1.
- Les deux transports assis retrouvent la marche à suivre du patient, muette sur treize seeds sur vingt.
- La trace du parcours s'ouvre au service produit, y compris en production.
- Le serveur refuse désormais de démarrer en production sans ses secrets, au lieu de se replier en silence.
- La suite de tests passe de 403 à 473 tests.

### ✨ Nouveautés

- [28b95fd](https://github.com/betagouv/transports-sanitaires/commit/28b95fd) : ouvre la trace du parcours au service produit, sur tous les environnements. Le prescripteur qui signalait un séquencement inattendu ne pouvait rien montrer : la trace du chemin parcouru et des réponses saisies n'existait pas dans le build déployé. Elle devient le troisième outil produit, derrière la même porte que la galerie de seeds et le labo.
- [3246572](https://github.com/betagouv/transports-sanitaires/commit/3246572) : distingue l'urgence médicale attestée de l'attente d'une décision. Une cause réglementaire de demande d'accord préalable en reste une, mais l'urgence lève le délai de quinze jours : la page de résultat dit alors le S3139h valant prescription, la réalisation immédiate et la prescription a posteriori. Les cases d'urgence des deux CERFA lisent désormais le type d'urgence que le modèle tranche, l'exception d'aide médicale urgente comprise.
- [0836f83](https://github.com/betagouv/transports-sanitaires/commit/0836f83) : passe le modèle en v9.5.1, qui défait la régression qu'on avait remontée à l'éditeur. L'accompagnement par un proche n'impose plus à lui seul une demande d'accord préalable : les motifs exposés passent de sept à six, et une prescription peut de nouveau porter un accompagnant. A2.4 gagne au passage la définition validée du dispositif Engagement maternité.
- [1de1038](https://github.com/betagouv/transports-sanitaires/commit/1de1038) : rend les quatre contenus que le contrat d'interface de la v9.5.0 ajoute ou réécrit. Le verdict médical dit la portée de sa décision au lieu de parler de coût, le verdict bariatrique dit ce qui manque plutôt que ce que la contrainte n'est pas, la page administrative trace le motif ALD quand il est retenu, et la case du nombre de transports porte le chiffre exact au lieu de le laisser à recopier.
- [afc1052](https://github.com/betagouv/transports-sanitaires/commit/afc1052) : passe le modèle en v9.5.0, soit 187 règles et 40 cibles. Q1 absorbe l'urgence vitale SMUR en quatrième réponse et M0 devient inapplicable derrière elle, A2.1 et A2.2 fondent en une seule question dont seul « Aucun de ces cas » poursuit le parcours, et A3.8 disparaît de même.
- [f7d5a84](https://github.com/betagouv/transports-sanitaires/commit/f7d5a84) : arrête le serveur au démarrage si une variable manque en production. Sans `GRIST_API_KEY` ni `PSEUDONYMISATION_SECRET`, il se repliait en silence sur un référentiel factice et sur un secret que tout le monde peut lire : le simulateur aurait servi des établissements inventés et signé ses refs Matomo avec un secret public. Hors production, les deux replis et leurs avertissements ne bougent pas.

### 🐛 Corrections

- [404cb01](https://github.com/betagouv/transports-sanitaires/commit/404cb01) : rétablit la marche à suivre des deux transports assis. Deux clés écrites en abrégé ne correspondaient plus à ce que le modèle nomme, et un mode introuvable ne rend rien sans rien dire : sur treize seeds sur vingt, l'écran s'arrêtait avant les deux phrases qui disent quoi faire du document, organiser le transport et présenter la prescription au transporteur.

### ♻️ Sous le capot

- [9829cb8](https://github.com/betagouv/transports-sanitaires/commit/9829cb8) : passe le dépôt en workspace pnpm. Les trois apps tenaient trois installations npm indépendantes, où rien n'empêchait Biome, TypeScript, vitest et knip de diverger ; les versions partagées vivent désormais dans un `catalog:` unique, et la divergence n'est plus exprimable. Les apps restent indépendantes de code, et le déploiement Scalingo se fait maintenant depuis la racine.

### ✅ Tests

- [5eff34f](https://github.com/betagouv/transports-sanitaires/commit/5eff34f) : porte la recette v9.5.1, six scénarios nés du correctif. Deux verrouillent la régression défaite, et quatre décrivent l'urgence médicale attestée : sans motif réglementaire elle conclut à une prescription, avec un motif elle laisse la demande en place mais lève l'attente.
- [1914314](https://github.com/betagouv/transports-sanitaires/commit/1914314) : porte la recette v9.5.0, six familles que rien ne couvrait encore. Elles constatent à l'écran qu'aucune vue ne propose plus le SMUR en M0 ni ne redemande l'accompagnement, que la huitième réponse d'A2.1 est la seule à poursuivre le parcours, et croisent le nombre de transports avec l'exception ALD et les seuils de 50 et 150 km.

### 📝 Documentation

- [8493730](https://github.com/betagouv/transports-sanitaires/commit/8493730) : allège le README du simulateur et le met dans l'ordre de lecture. Commandes, Configuration et Structure passent en tête, les commandes deviennent un tableau, et les sous-sections qui racontaient un correctif désormais amont sont retirées.
- [33e0c9f](https://github.com/betagouv/transports-sanitaires/commit/33e0c9f) : met le README à l'heure de la v9.5.1, de ses 188 règles et de ses 42 cibles.
- [c7f9f69](https://github.com/betagouv/transports-sanitaires/commit/c7f9f69) : extrait en skill la marche à suivre d'une intégration de modèle. L'intégration de la v9.5.0 avait redécouvert ce que celle de la v9.4.1 avait déjà appris, faute que ce soit écrit ailleurs que dans des messages de commit.
- [7bc16d7](https://github.com/betagouv/transports-sanitaires/commit/7bc16d7) : met le README à l'heure de la v9.5.0, et nomme les quatre fichiers qui portent désormais la recette du livrable.
- [f59b14c](https://github.com/betagouv/transports-sanitaires/commit/f59b14c) : refait les 38 liens de commit de ce journal, que la réécriture des messages avait laissés sur des commits hors de l'historique. La correspondance a été établie par la date d'auteur et le sujet, puis recoupée par le hash d'arbre.
- [3a30fee](https://github.com/betagouv/transports-sanitaires/commit/3a30fee) : sort les vingt-trois règles de code et de commit d'AGENTS.md vers `docs/contributing/`, et rend le style de la documentation exécutable. `verifier-documentation.ts` refuse désormais le tiret cadratin, la phrase de plus de vingt-cinq mots et le paragraphe de plus de quatre phrases.
- [efd55d8](https://github.com/betagouv/transports-sanitaires/commit/efd55d8) : réécrit les commentaires de l'analytics, des seeds et du pilote de parcours, sans toucher une ligne de code.
- [06cbaf4](https://github.com/betagouv/transports-sanitaires/commit/06cbaf4) : réécrit les commentaires du contrat partagé et du backend, en disant en toutes lettres les invariants qui comptent : le secret reste au serveur, le nom ne circule jamais en clair, l'annuaire complet ne sort pas de Grist.
- [be001cf](https://github.com/betagouv/transports-sanitaires/commit/be001cf) : réécrit les deux README dans la langue du dépôt, sans qu'aucun fait change.

## [0.1.2](https://github.com/betagouv/transports-sanitaires/releases/tag/simulateur-eligibilite%400.1.2) — 24 août 2026

Correctif d'outillage. Le simulateur ne change pas : le commit livré ne touche
pas l'app, mais la configuration de la CI qui la garde.

### TL;DR

- La détection de secrets bloquait toute livraison sur un faux positif : elle
  prenait un nom de règle du contrat publicodes pour une clé d'API.
- Aucun secret n'a fuité, et rien ne change pour un prescripteur.

### 🐛 Corrections

- [25b2b68](https://github.com/betagouv/transports-sanitaires/commit/25b2b68) : cesse de prendre les noms de règles du contrat publicodes pour des secrets. `p2_exception_radiotherapie_moins_48h` déclenchait la règle générique de gitleaks, qui voyait une clé d'API dans ses trente-six caractères, et la CI restait rouge. L'exception est cantonnée à cette règle et à ce seul fichier : la clé Grist, le secret de pseudonymisation et le jeton Matomo y restent surveillés.

## [0.1.1](https://github.com/betagouv/transports-sanitaires/releases/tag/simulateur-eligibilite%400.1.1) — 24 août 2026

Version de documentation. Le simulateur ne change pas : les deux commits livrés
ne touchent que l'`AGENTS.md` de l'app, qui n'est embarqué nulle part. Rien dans
`front/`, `server/`, `shared/` ni `regles/`.

### TL;DR

- Aucun changement de comportement, aucune règle touchée. Le pied de page
  annonce 0.1.1 parce que c'est une autre livraison, pas un autre produit.
- L'AGENTS.md de l'app dit désormais comment une version se livre.

### 📝 Documentation

- [1c469f3](https://github.com/betagouv/transports-sanitaires/commit/1c469f3) : réécrit l'AGENTS.md de l'app dans la langue du dépôt et lui ajoute la section « Versions » qui manquait — où vit le numéro, comment se nomme le tag, où s'écrit ce journal.
- [9370bdc](https://github.com/betagouv/transports-sanitaires/commit/9370bdc) : renvoie de cette section vers la marche à suivre de livraison, qui décrit les cinq gestes d'une version et pourquoi ils ne se séparent pas.

## [0.1.0](https://github.com/betagouv/transports-sanitaires/releases/tag/simulateur-eligibilite%400.1.0) — 24 août 2026

Première version étiquetée. Elle rassemble les 35 commits mergés depuis
`staging` et `feat/prefill-cerfa-pmt`, entre l'intégration du modèle de règles
v9.1 et celle de la v9.4.1.

### TL;DR

- Le modèle d'éligibilité passe de la v8.10 à la v9.4.1 : 186 règles, 39 cibles,
  neuf cas finaux.
- Le simulateur pré-remplit les deux CERFA dans le navigateur, la prescription
  médicale de transport et la demande d'accord préalable.
- On peut revenir en arrière partout, y compris depuis la page du document, sans
  perdre ses réponses.
- Les pages de résultat expliquent leurs conclusions au lieu de les asséner.
- Les adresses se saisissent un lieu par écran.
- Un pied de page indique la version, le commit déployé et la version des règles.
- La suite de tests passe de 219 à 403 tests.

### ✨ Nouveautés

- [128bbfa](https://github.com/betagouv/transports-sanitaires/commit/128bbfa) : passe le modèle en v9.4.1 et corrige trois anomalies qu'on avait remontées à l'éditeur : une qualification administrative qui se rouvrait alors que le cas était tranché, l'ordre des questions d'adresse, et la description de la question A2.1.
- [1430db2](https://github.com/betagouv/transports-sanitaires/commit/1430db2) : laisse le modèle décider quel document proposer, ce qui affiche la demande d'accord préalable au même titre que la prescription.
- [5462bee](https://github.com/betagouv/transports-sanitaires/commit/5462bee) : pré-remplit la demande d'accord préalable (formulaire S3139h), le second document du parcours.
- [15d4d1f](https://github.com/betagouv/transports-sanitaires/commit/15d4d1f) : reprend du modèle les bornes de saisie et deux libellés, jusque-là écrits dans l'interface.
- [dca73ec](https://github.com/betagouv/transports-sanitaires/commit/dca73ec) : couvre la seconde entrée du dispositif Engagement maternité, la question A2.4.
- [e0043f6](https://github.com/betagouv/transports-sanitaires/commit/e0043f6) : explique pourquoi une ALD reconnue n'est pas retenue quand il manque une incapacité ou une déficience.
- [b7dce50](https://github.com/betagouv/transports-sanitaires/commit/b7dce50) : liste sur la page de résultat les motifs qui justifient une demande d'accord préalable, au lieu de dire seulement qu'il en faut une.
- [0a4ab38](https://github.com/betagouv/transports-sanitaires/commit/0a4ab38) : passe le modèle en v9.4.0, qui remplace la v9.3.0 qu'on n'avait pas intégrée.
- [2cff8e6](https://github.com/betagouv/transports-sanitaires/commit/2cff8e6) : affiche les phrases d'aide des questions à choix multiple et met une majuscule aux réponses de la question A4.1.
- [5465d2d](https://github.com/betagouv/transports-sanitaires/commit/5465d2d) : ajoute un bouton « Précédent » sur la page du document, quel que soit le chemin par lequel on y arrive.
- [8a37cb0](https://github.com/betagouv/transports-sanitaires/commit/8a37cb0) : ajoute une seed qui ouvre le questionnaire directement sur la saisie des adresses, plutôt que d'avoir à traverser tout le parcours à la main.
- [8700c36](https://github.com/betagouv/transports-sanitaires/commit/8700c36) : rappelle à l'entrée de la partie administrative ce que les réponses qui suivent ne peuvent plus changer.
- [b08a30b](https://github.com/betagouv/transports-sanitaires/commit/b08a30b) : rappelle sur la question Q1 qu'elle porte sur un seul sens du trajet.
- [f4da5b7](https://github.com/betagouv/transports-sanitaires/commit/f4da5b7) : passe le modèle en v9.2.1 et retire le correctif qu'on maintenait de notre côté, l'éditeur l'ayant intégré.
- [70e4efb](https://github.com/betagouv/transports-sanitaires/commit/70e4efb) : affiche en bas de page le commit déployé et la version des règles.
- [b3336dc](https://github.com/betagouv/transports-sanitaires/commit/b3336dc) : applique le contrat d'interface 2.0.0 : les champs libres s'affichent, les pages à choix unique avancent seules, et la décision médicale ne se verrouille qu'au passage à la suite.
- [b5614d8](https://github.com/betagouv/transports-sanitaires/commit/b5614d8) : passe le modèle en v9.1, ce qui change l'ordre du questionnaire médical et toutes les valeurs de sortie.

### 🐛 Corrections

- [75214d2](https://github.com/betagouv/transports-sanitaires/commit/75214d2) : retire le message qui annonçait le verrouillage de la décision médicale.
- [96f6992](https://github.com/betagouv/transports-sanitaires/commit/96f6992) : garde les pages suivantes quand on revient en arrière corriger une réponse.
- [34239ed](https://github.com/betagouv/transports-sanitaires/commit/34239ed) : répare le téléchargement du CERFA avec le serveur de développement.
- [fdcf035](https://github.com/betagouv/transports-sanitaires/commit/fdcf035) : répartit les adresses sur deux pages, une par lieu, au lieu d'un écran de douze champs.
- [a14146f](https://github.com/betagouv/transports-sanitaires/commit/a14146f) : pose enfin les quatre champs d'adresse que le questionnaire sautait, le complément et le pays, que le CERFA lisait vides.
- [38d00eb](https://github.com/betagouv/transports-sanitaires/commit/38d00eb) : garde le bandeau de version en bas de la fenêtre quand la page est courte.
- [48d2d18](https://github.com/betagouv/transports-sanitaires/commit/48d2d18) : cesse de considérer comme rempli un champ d'adresse obligatoire qu'on a vidé.

### ♻️ Sous le capot

- [cadc8b3](https://github.com/betagouv/transports-sanitaires/commit/cadc8b3) : remplace la cascade de fonctions du remplissage CERFA par un tableau d'une ligne par champ.
- [32d1e1b](https://github.com/betagouv/transports-sanitaires/commit/32d1e1b) : range chaque CERFA dans son sous-dossier, gabarit compris.
- [2eb8b67](https://github.com/betagouv/transports-sanitaires/commit/2eb8b67) : confie aux règles du modèle la complétude des pages d'adresse, jusque-là décidée par une liste dans le code.
- [486a71c](https://github.com/betagouv/transports-sanitaires/commit/486a71c) : renomme les fichiers de la recette d'après la version du livrable qu'ils testent.

### ✅ Tests

- [32e3409](https://github.com/betagouv/transports-sanitaires/commit/32e3409) : compare un parcours dont on corrige Q1 après coup à une simulation neuve.
- [5e131d7](https://github.com/betagouv/transports-sanitaires/commit/5e131d7) : empêche le pilote de parcours des tests de déborder sur la page suivante quand la machine est chargée.
- [eff9866](https://github.com/betagouv/transports-sanitaires/commit/eff9866) : vérifie qu'on ne peut pas revenir au questionnaire médical une fois dans la partie administrative.
- [6ed0161](https://github.com/betagouv/transports-sanitaires/commit/6ed0161) : couvre le coche/décoche des cinq questions à choix multiple.

### 📝 Documentation

- [de08542](https://github.com/betagouv/transports-sanitaires/commit/de08542) : autorise la branche pour un changement structurant qu'aucun feature flag ne peut masquer.
- [7b8ff08](https://github.com/betagouv/transports-sanitaires/commit/7b8ff08) : documente la page des adresses.
- [31f1107](https://github.com/betagouv/transports-sanitaires/commit/31f1107) : met les deux specs produit à jour pour la v9.1.
