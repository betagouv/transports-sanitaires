# Le dépôt : vocabulaire

Glossaire des termes qui valent pour tout le dépôt : ses apps, son outillage et
le suivi du travail. Le vocabulaire métier d'une app est dans son propre
`docs/knowledge/CONTEXT.md`.

## Language

### Les apps

**App**:
Un dossier de `apps/`, indépendant de code des autres, avec son `package.json`
et son `verifier`.
_Avoid_: module, paquet, projet.

**Action**:
Ce qu'on peut lancer sur une app : `install`, `build`, `start`, `test`, `dev`,
`verifier`. Une app ne les porte pas toutes.
_Avoid_: commande, qui désigne ce qu'on tape, action et arguments compris.

**Feature**:
Ce qu'une app sait faire, vu par celui qui s'en sert.
_Avoid_: capacité, fonctionnalité. « Capacité » est réservé au métier du
simulateur, où il désigne ce que peut le patient.

### Les règles

**Recueil**:
Un fichier de règles numérotées de `docs/knowledge/contributing/`, sous un même
préfixe. Il y en a deux : `code` (`QUAL-*`) et `git` (`GIT-*`).
_Avoid_: module, qui est un champ du gabarit de spec.

### Le suivi du travail

**Spec**:
Le cadrage d'un chantier, un fichier d'un tracker `docs/specs/`. Elle porte un
id unique dans le dépôt et change d'état en changeant de dossier.
_Avoid_: ticket, issue.

**Tâche**:
Un morceau livrable d'une spec, un fichier de `docs/tasks/`.
_Avoid_: ticket.

**Ticket**:
Une ligne de la base Notion `[BDD] Tasks`, lue par l'équipe produit. Une spec en
a au plus un.
_Avoid_: tâche, carte.
