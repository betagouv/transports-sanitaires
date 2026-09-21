# 19: Porter la recette v9.7.3

**What to build:** la suite de recette du repo reconnaît la v9.7.3 sous son
propre nom (fichiers renommés), et chaque scénario nouveau de la matrice
livrée (`AUD-*`, `ROUTE-*`, `PERM-*`) y a son test, sous son identifiant.

**Blocked by:** 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18

**Status:** ready-for-agent

- [ ] Les fichiers de recette sont renommés `-v9-7-3` (`git mv`), imports et
      commentaires recopiés à l'identique
- [ ] Chaque `test_case` neuf de la matrice livrée a son test, sous
      l'identifiant du livrable
- [ ] Les contrôles non transposables au moteur nu ou à notre mécanique de
      reprise sont documentés comme tels dans leur test, pas forcés à passer
      sur un aveu
- [ ] `pnpm verifier` reste vert
