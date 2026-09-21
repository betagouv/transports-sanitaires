# 02: Ne pas demander une adresse cachée pour une DAP non produite (TS973-02)

**What to build:** un prescripteur orienté vers la caisse (avion/bateau sans
sous-situation justifiée) n'est plus bloqué par une adresse que l'app ne
collecte pas sur ce parcours — l'app n'essaie plus de la lui arracher par un
contournement.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Les six cibles de cases DAP valent faux sans qu'aucune adresse ne soit
      citée comme manquante, sur le parcours orientation caisse
- [ ] Le fait avion/bateau reste visible dans la synthèse remise au
      prescripteur
- [ ] Une vraie DAP (sous-situation justifiée) continue d'exiger ses adresses
- [ ] Tout contournement par adresse fictive précédemment nécessaire dans le
      code est retiré
