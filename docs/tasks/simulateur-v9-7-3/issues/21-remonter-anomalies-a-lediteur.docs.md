# 21: Remonter les anomalies à l'éditeur

**What to build:** chaque écart constaté pendant l'intégration — dont,
potentiellement, TS973-18 — part chez l'éditeur du modèle sous forme d'un
fichier par sujet, écrit pour être envoyé tel quel.

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
