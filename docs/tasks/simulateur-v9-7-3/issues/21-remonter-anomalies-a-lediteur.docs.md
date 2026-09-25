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

Candidat du ticket 01 écarté au ticket 19 : le test « nom tra » prenait 5
transports couverts pour 3 prévus. `p2_configuration_trajet_complete` exige
le contraire, et `Session.submit()` refuse aussi (« Le nombre couvert ne peut
pas dépasser le total »). La contrainte est voulue, le test datait d'avant
elle : il est réécrit avec 2 couverts pour 5 prévus. Rien à remonter.

Un écart assumé au ticket 08, à signaler sans question : l'application ne
porte pas `restartMedical()`. Comme chez l'éditeur (`option_visibility`,
`allowedOptions()`), l'exception radiothérapie est masquée sans séance
déclarée : le refus de `application.mjs` n'est pas atteignable par le
parcours. « Faire une nouvelle simulation » tient lieu de reprise médicale. Le
détail est dans `docs/knowledge/domain/page-resultat-administratif.md` de
l'app.

Un écart assumé au ticket 09, à signaler sans question : tant que le total
d'une DAP de permission n'est pas répondu, l'application verse
`p2_nombre_permission_dap_valide = oui`, là où `permissionDapCountValid()`
rend `non`. Notre questionnaire suit les variables manquantes du moteur. Avec
`non`, `p2_nombre_permission_dap_complet` s'arrête au premier faux et ne
réclame plus jamais le total. Un total répondu est contrôlé comme chez
l'éditeur. Le détail est dans `docs/knowledge/domain/total-dap-permission.md`
de l'app.

Une question au ticket 15 : l'étape `p2_transfert_motif_detail` déclare des
`session_suggestions` (les séances déclarées en M0), mais `suggestionsFor()`
ne lit que `suggestions`. Laquelle des deux fait foi ? L'application suit le
YAML et propose les séances déclarées.

Un constat au ticket 15 : `p2_motif_detail_complet` compare des chaînes
exactes. « Autre », « À préciser » ou « consultation médicale » en minuscules
le rendent vrai, alors que `medicalDetailValid()` les refuse après repli.
L'application refuse ces saisies à l'écran et verse
`p2_validations_documentaires = non`.

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
