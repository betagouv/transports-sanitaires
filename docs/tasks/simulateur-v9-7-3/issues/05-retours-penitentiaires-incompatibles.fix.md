# 05: Éviter les retours pénitentiaires incompatibles (TS973-05)

**What to build:** une entrée en hospitalisation ou une permission ne peut
plus être combinée à un retour pénitentiaire incompatible et bloquer le
parcours ; un vrai retour pénitentiaire reste possible et affiche une
destination cohérente.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Entrée et permission ne produisent plus les combinaisons incompatibles
      de la famille AUD-ROUTE-PRISON-CONTEXT
- [ ] Le contexte retour pénitentiaire est filtré avec les options courantes,
      y compris à la reprise (pas d'ancien choix conservé en arrière-plan)
- [ ] Dans le parcours transfert, le retour pénitentiaire se recueille au
      niveau des exceptions pertinentes
- [ ] Un vrai retour pénitentiaire donne une destination pénitentiaire
      cohérente, visible au récapitulatif
