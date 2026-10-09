# Features de tsp

> Ce que la CLI sait faire, vu par celui qui s'en sert. `tsp features cli`
> affiche ce tableau. Le mode d'emploi est dans le [README](../../README.md).

| Feature | Ce qu'elle fait |
|---|---|
| Préparation de la machine | `tsp setup` installe mise, le toolchain, les dépendances, les hooks et les `.env`, puis rend `tsp` appelable de partout. Rejouable. |
| Diagnostic | `tsp doctor` dit ce qui manque et la commande qui le répare. |
| Actions par app | `install`, `build`, `start`, `test`, `dev` et `verifier`, sous le même nom pour chaque app. Sans app, sur toutes celles qui portent l'action. |
| Inventaire des apps | `tsp apps` liste les apps, leur version et leurs actions. `tsp features` liste ce que chacune sait faire. |
| Lecture des règles | `tsp rules` liste les recueils, les règles d'un recueil, ou le texte d'une règle par son identifiant. |
| Lecture des skills | `tsp skills` liste les modes d'emploi du dépôt, ou en affiche un. |
| Lecture de la documentation | `tsp docs` liste les ADR et les connaissances métier, à la racine et par app. |
| Travail en cours | `tsp wip` rassemble les PR ouvertes, les branches sans PR, les tâches, les specs en cours et les tickets Notion. |
| Travail à prendre | `tsp next` liste les specs en `todo` et en `backlog`, et les tickets Notion prêts à développer. |
| Tenue des specs | `tsp spec new` crée une spec avec le prochain id. `tsp spec move` la change d'état et tient « bloquée par » à jour. |
| Ticket Notion d'une spec | `tsp spec sync` crée le ticket d'une spec puis le garde à jour, sans réécrire son corps ni faire reculer son statut. |
| Branches et PR | `tsp branch` tire une branche de `staging`. `tsp pr` ouvre la PR vers `staging`. `tsp pr status` montre sa CI. |
| Sortie pour agents | Les commandes de lecture acceptent `--json`. |
