# 15: Recueillir directement les précisions utiles au document (TS973-15)

**What to build:** le prescripteur saisit directement sa précision médicale
(motif, transfert) quand elle sert au document, avec des suggestions
facultatives ; il n'est plus détourné par un choix « Autre » qui impose une
seconde sélection.

**Blocked by:** 01

**Status:** ready-for-agent

Le ticket 01 a déjà purgé les 3 clés mortes du contrat/seeds (`p2_type_hospitalisation`,
`p2_motif_detail_autre`, `p2_transfert_motif_autre`) et recopié `p2_motif_detail`
en saisie directe dans les seeds. `tests/simulateur/visibilite-des-options.test.tsx`
(« le même filtrage s'applique au détail du motif ») reste rouge : il attend
encore un `role="group"`/`radio` pour `p2_motif_detail`, qui n'existe plus —
c'est ce ticket qui doit le réécrire, une fois l'écran de saisie directe (avec
suggestions filtrées) construit.

- [ ] Une issue sans Cerfa n'est plus bloquée par un détail médical inutile à
      la décision
- [ ] Une PMT ou DAP nécessitant la précision reste non finalisée tant qu'elle
      manque
- [ ] Le texte libre valide déjà saisi est conservé
- [ ] « Autre examen ou soin » mène directement à sa précision, sans
      resélectionner « Autre »
- [ ] Les contrôles sur les séances déclarées en partie médicale restent
      actifs ; aucun libellé de séance incompatible n'est accepté
      automatiquement
