# Bloqueur : sept contradictions de la famille AUD-ROUTE-URG-DEST (ticket 04)

Le ticket 04 demande de bloquer les sept contradictions de la famille
AUD-ROUTE-URG-DEST et d'afficher la famille de lieu déduite pour une arrivée
urgences.

## Ce qui manque

La liste exacte des sept contradictions vient du livrable éditeur v9.7.3 :
`CONTRAT-RESULTATS-v9-7-3.md` et `src/application.mjs`
(`exceptionsRouteValid` / `qualificationDeclarationsValid`), déposés dans
`tmp/9.7.3/`. Ce dossier n'est pas versionné (`tmp` au `.gitignore` racine)
et n'est plus présent sur le poste. Rien d'autre dans le dépôt ne nomme les
sept cas.

Deux familles voisines sont déjà portées dans
`front/simulateur/entrees-calculees.ts` (`qualificationDeclarationsValide`) :
retour pénitentiaire incompatible (ticket 05) et exception radiothérapie
(ticket 06). Rien n'y couvre encore la cohérence de la destination urgences.

## Ce qu'il faut pour débloquer

- soit le paquet `tmp/9.7.3/` (ou au moins la section utile de
  `CONTRAT-RESULTATS-v9-7-3.md` et l'extrait correspondant
  d'`application.mjs`) redéposé par l'éditeur ;
- soit la liste des sept contradictions décrite directement, si elle est
  connue par ailleurs.

## En attendant

Le ticket 04 reste `ready-for-agent` mais ne peut pas être implémenté sans
cette source : personne ne doit deviner les sept contradictions. Un agent
qui le reprend doit relire ce fichier avant de commencer.
