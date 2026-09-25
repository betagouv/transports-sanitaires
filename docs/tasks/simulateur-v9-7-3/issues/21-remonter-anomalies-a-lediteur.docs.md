# 21: Remonter les anomalies à l'éditeur

**What to build:** chaque écart constaté pendant l'intégration part chez
l'éditeur du modèle sous forme d'un fichier par sujet, écrit pour être
envoyé tel quel.

Déjà écrit, au ticket 18 : `tmp/anomalie-v9-7-3-revalidation-administrative-hors-perimetre.md`
(non versionné — à récupérer et envoyer). TS973-18 suppose une session
persistable et reprenable entre deux visites (`Session.exportState()`), que
l'application n'a pas ; la décision (documenter plutôt que construire) et
le détail sont dans `references/precedents.md` du skill
`implement-publicodes-version`.

Un candidat repéré au ticket 01 : `tests/cerfa/depuis-simulateur-dap-mapping.test.ts`
(« écrit « nom tra » depuis la cible du document, pas les transports prévus »)
vise un cas où le nombre couvert par la DAP (5) dépasse le nombre prescrit (3)
en « aller-retour différent ». `p2_configuration_trajet_complete` exige
pourtant, sur cette branche, `p2_nombre_transports_couvert_simulation <=
p2_nombre_transports_prevus` — ce qui bloque exactement le cas que le test dit
vouloir couvrir. À vérifier au moteur nu avant d'écrire le constat : est-ce
une contrainte voulue (et alors le test date d'avant elle), ou une
contradiction avec l'intention du ticket TS973-09 ?

**Blocked by:** 19 (peut démarrer dès qu'un écart est constaté, sans attendre
la fin des autres tickets)

**Status:** ready-for-agent

- [ ] Un fichier par sujet dans `tmp/`, nommé `anomalie-v9-7-3-<sujet>.md`,
      suit la structure du skill `implement-publicodes-version` (constat,
      avant/maintenant, conséquence, cause supposée, ce qu'on a constaté à
      l'exécution, ce qu'on a fait de notre côté, la question)
- [ ] Chaque constat est reproduit avant d'être écrit (au moteur, ou via les
      scénarios de la recette qui ont basculé)
- [ ] Le fait est séparé de l'hypothèse dans le ton du texte
