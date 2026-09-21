# 01: Porter le modèle en v9.7.3

**What to build:** le modèle publicodes v9.7.3 est chargé par l'app à la place
de la v9.7.2 : le pied de page annonce v9.7.3, `pnpm valider-regles` passe, et
`pnpm verifier` repasse au vert — quitte, pour les sujets pas encore portés
(tickets 02 à 18), à réécrire temporairement un test pour qu'il constate
l'impasse plutôt que le corriger en profondeur. Inclut TS973-01 (titre de
`p2_situations_speciales_complet` restauré), livré gratuitement par la
recopie : aucun travail front dédié.

C'est un refactor large (« expand ») : la recopie casse tout ce qui nomme une
clé déplacée ou retirée, avant que les tickets suivants ne portent chaque
sujet. Rien n'est vert tant que tout ne l'est pas.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `regles/regles.publicodes` est la recopie exacte de
      `transports-sanitaires.publicodes.flat-v9-7-3.yaml`, `regles/VERSION`
      vaut `v9.7.3`
- [ ] Les 3 clés retirées de l'usage (`p2_type_hospitalisation`,
      `p2_motif_detail_autre`, `p2_transfert_motif_autre`) sortent de
      `QUESTIONS` dans le contrat de règles, des seeds et des écrans du
      parcours
- [ ] `p2_motif_detail` et `p2_transfert_motif_detail` sont recopiés dans le
      contrat comme des saisies directes, plus comme des choix fermés
- [ ] `p2_situations_speciales_complet` porte de nouveau son titre
- [ ] Le compte de règles et de cibles est vérifié à la main (script du skill
      `implement-publicodes-version`), même si le README n'est mis à jour
      qu'au ticket 20
- [ ] `pnpm verifier` est vert
