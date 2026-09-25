# 09: Contrôler la quantité DAP des permissions (TS973-09)

**What to build:** le nombre de trajets déclarés pour une permission est
vérifié contre la période, la fréquence maximale et les sens couverts ; une
saisie incompatible est signalée et reste modifiable, jamais remplacée
silencieusement par un plafond.

**Blocked by:** 01

**Status:** ready-for-agent

Le ticket 01 a câblé `p2_nombre_permission_dap_valide` avec un défaut
permissif (`"oui"`, toute quantité acceptée — le comportement d'avant la
v9.7.3) pour ne pas bloquer les autres scénarios. Le réencodage réel se base
sur `permissionDapCapacity`/`permissionDapCountValid` (`src/application.mjs`,
v9.7.3) : la capacité compatible avec la période, les semaines, le plafond
mensuel et les sens couverts, puis la parité pour les allers-retours
identiques.

- [ ] Une permission du 4 au 6 septembre accepte 2 trajets, refuse 4 et 999
      (famille PERM-DAP-TOTAL-INCOMPATIBLE)
- [ ] Des allers-retours identiques refusent un total impair (1, 3, 11)
- [ ] 12 trajets en aller-retour et 11 trajets simples restent acceptés sur
      une période suffisante
- [ ] Un total inférieur au maximum compatible reste accepté (pas de plafond
      ni de nombre mensuel imposé)
- [ ] L'erreur affichée conserve la saisie à corriger
