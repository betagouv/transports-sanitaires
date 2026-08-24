# Journal des versions

Ce qui change d'une version à l'autre. Le titre renvoie à la release GitHub ;
chaque ligne renvoie à son commit et commence par un verbe, comme le sujet du
commit lui-même.

Le simulateur affiche en bas de page la version qu'il exécute, le commit déployé
et la version du modèle de règles.

## [0.1.2](https://github.com/betagouv/transports-sanitaires/releases/tag/simulateur-eligibilite%400.1.2) — 24 août 2026

Correctif d'outillage. Le simulateur ne change pas : le commit livré ne touche
pas l'app, mais la configuration de la CI qui la garde.

### TL;DR

- La détection de secrets bloquait toute livraison sur un faux positif : elle
  prenait un nom de règle du contrat publicodes pour une clé d'API.
- Aucun secret n'a fuité, et rien ne change pour un prescripteur.

### 🐛 Corrections

- [658f586](https://github.com/betagouv/transports-sanitaires/commit/658f586) : cesse de prendre les noms de règles du contrat publicodes pour des secrets. `p2_exception_radiotherapie_moins_48h` déclenchait la règle générique de gitleaks, qui voyait une clé d'API dans ses trente-six caractères, et la CI restait rouge. L'exception est cantonnée à cette règle et à ce seul fichier : la clé Grist, le secret de pseudonymisation et le jeton Matomo y restent surveillés.

## [0.1.1](https://github.com/betagouv/transports-sanitaires/releases/tag/simulateur-eligibilite%400.1.1) — 24 août 2026

Version de documentation. Le simulateur ne change pas : les deux commits livrés
ne touchent que l'`AGENTS.md` de l'app, qui n'est embarqué nulle part. Rien dans
`front/`, `server/`, `shared/` ni `regles/`.

### TL;DR

- Aucun changement de comportement, aucune règle touchée. Le pied de page
  annonce 0.1.1 parce que c'est une autre livraison, pas un autre produit.
- L'AGENTS.md de l'app dit désormais comment une version se livre.

### 📝 Documentation

- [264870c](https://github.com/betagouv/transports-sanitaires/commit/264870c) : réécrit l'AGENTS.md de l'app dans la langue du dépôt et lui ajoute la section « Versions » qui manquait — où vit le numéro, comment se nomme le tag, où s'écrit ce journal.
- [bc72d81](https://github.com/betagouv/transports-sanitaires/commit/bc72d81) : renvoie de cette section vers la marche à suivre de livraison, qui décrit les cinq gestes d'une version et pourquoi ils ne se séparent pas.

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

- [8c1788e](https://github.com/betagouv/transports-sanitaires/commit/8c1788e) : passe le modèle en v9.4.1 et corrige trois anomalies qu'on avait remontées à l'éditeur : une qualification administrative qui se rouvrait alors que le cas était tranché, l'ordre des questions d'adresse, et la description de la question A2.1.
- [c0302a1](https://github.com/betagouv/transports-sanitaires/commit/c0302a1) : laisse le modèle décider quel document proposer, ce qui affiche la demande d'accord préalable au même titre que la prescription.
- [b68cdb5](https://github.com/betagouv/transports-sanitaires/commit/b68cdb5) : pré-remplit la demande d'accord préalable (formulaire S3139h), le second document du parcours.
- [0704d3c](https://github.com/betagouv/transports-sanitaires/commit/0704d3c) : reprend du modèle les bornes de saisie et deux libellés, jusque-là écrits dans l'interface.
- [de42793](https://github.com/betagouv/transports-sanitaires/commit/de42793) : couvre la seconde entrée du dispositif Engagement maternité, la question A2.4.
- [91fed9b](https://github.com/betagouv/transports-sanitaires/commit/91fed9b) : explique pourquoi une ALD reconnue n'est pas retenue quand il manque une incapacité ou une déficience.
- [4a66ef3](https://github.com/betagouv/transports-sanitaires/commit/4a66ef3) : liste sur la page de résultat les motifs qui justifient une demande d'accord préalable, au lieu de dire seulement qu'il en faut une.
- [7b3bdc1](https://github.com/betagouv/transports-sanitaires/commit/7b3bdc1) : passe le modèle en v9.4.0, qui remplace la v9.3.0 qu'on n'avait pas intégrée.
- [095caa3](https://github.com/betagouv/transports-sanitaires/commit/095caa3) : affiche les phrases d'aide des questions à choix multiple et met une majuscule aux réponses de la question A4.1.
- [6c09dee](https://github.com/betagouv/transports-sanitaires/commit/6c09dee) : ajoute un bouton « Précédent » sur la page du document, quel que soit le chemin par lequel on y arrive.
- [4f25416](https://github.com/betagouv/transports-sanitaires/commit/4f25416) : ajoute une seed qui ouvre le questionnaire directement sur la saisie des adresses, plutôt que d'avoir à traverser tout le parcours à la main.
- [90ac9aa](https://github.com/betagouv/transports-sanitaires/commit/90ac9aa) : rappelle à l'entrée de la partie administrative ce que les réponses qui suivent ne peuvent plus changer.
- [7ab0d2e](https://github.com/betagouv/transports-sanitaires/commit/7ab0d2e) : rappelle sur la question Q1 qu'elle porte sur un seul sens du trajet.
- [a16a25c](https://github.com/betagouv/transports-sanitaires/commit/a16a25c) : passe le modèle en v9.2.1 et retire le correctif qu'on maintenait de notre côté, l'éditeur l'ayant intégré.
- [416f24b](https://github.com/betagouv/transports-sanitaires/commit/416f24b) : affiche en bas de page le commit déployé et la version des règles.
- [f404e4d](https://github.com/betagouv/transports-sanitaires/commit/f404e4d) : applique le contrat d'interface 2.0.0 : les champs libres s'affichent, les pages à choix unique avancent seules, et la décision médicale ne se verrouille qu'au passage à la suite.
- [2baaaef](https://github.com/betagouv/transports-sanitaires/commit/2baaaef) : passe le modèle en v9.1, ce qui change l'ordre du questionnaire médical et toutes les valeurs de sortie.

### 🐛 Corrections

- [4f905a8](https://github.com/betagouv/transports-sanitaires/commit/4f905a8) : retire le message qui annonçait le verrouillage de la décision médicale.
- [f5191eb](https://github.com/betagouv/transports-sanitaires/commit/f5191eb) : garde les pages suivantes quand on revient en arrière corriger une réponse.
- [294dd2b](https://github.com/betagouv/transports-sanitaires/commit/294dd2b) : répare le téléchargement du CERFA avec le serveur de développement.
- [86ba720](https://github.com/betagouv/transports-sanitaires/commit/86ba720) : répartit les adresses sur deux pages, une par lieu, au lieu d'un écran de douze champs.
- [69b5a4b](https://github.com/betagouv/transports-sanitaires/commit/69b5a4b) : pose enfin les quatre champs d'adresse que le questionnaire sautait, le complément et le pays, que le CERFA lisait vides.
- [bb337aa](https://github.com/betagouv/transports-sanitaires/commit/bb337aa) : garde le bandeau de version en bas de la fenêtre quand la page est courte.
- [9892554](https://github.com/betagouv/transports-sanitaires/commit/9892554) : cesse de considérer comme rempli un champ d'adresse obligatoire qu'on a vidé.

### ♻️ Sous le capot

- [876dae5](https://github.com/betagouv/transports-sanitaires/commit/876dae5) : remplace la cascade de fonctions du remplissage CERFA par un tableau d'une ligne par champ.
- [303ef2d](https://github.com/betagouv/transports-sanitaires/commit/303ef2d) : range chaque CERFA dans son sous-dossier, gabarit compris.
- [1111954](https://github.com/betagouv/transports-sanitaires/commit/1111954) : confie aux règles du modèle la complétude des pages d'adresse, jusque-là décidée par une liste dans le code.
- [886aae0](https://github.com/betagouv/transports-sanitaires/commit/886aae0) : renomme les fichiers de la recette d'après la version du livrable qu'ils testent.

### ✅ Tests

- [587a379](https://github.com/betagouv/transports-sanitaires/commit/587a379) : compare un parcours dont on corrige Q1 après coup à une simulation neuve.
- [f86d041](https://github.com/betagouv/transports-sanitaires/commit/f86d041) : empêche le pilote de parcours des tests de déborder sur la page suivante quand la machine est chargée.
- [7146e47](https://github.com/betagouv/transports-sanitaires/commit/7146e47) : vérifie qu'on ne peut pas revenir au questionnaire médical une fois dans la partie administrative.
- [8e419d9](https://github.com/betagouv/transports-sanitaires/commit/8e419d9) : couvre le coche/décoche des cinq questions à choix multiple.

### 📝 Documentation

- [c054ff5](https://github.com/betagouv/transports-sanitaires/commit/c054ff5) : autorise la branche pour un changement structurant qu'aucun feature flag ne peut masquer.
- [f11b3be](https://github.com/betagouv/transports-sanitaires/commit/f11b3be) : documente la page des adresses.
- [fa04b83](https://github.com/betagouv/transports-sanitaires/commit/fa04b83) : met les deux specs produit à jour pour la v9.1.
