# 06: Réserver l'exception radiothérapie au transfert compatible (TS973-06)

**What to build:** l'exception radiothérapie ne peut plus être invoquée pour
un transfert définitif ; elle reste disponible pour un transfert provisoire de
moins de 48 heures.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Le témoin transfert définitif ne produit plus de PMT via cette
      exception (famille AUD-ROUTE-RADIO-DURATION)
- [ ] Le témoin transfert provisoire compatible continue de fonctionner
- [ ] Le choix incompatible est masqué dans la mosaïque, et revalidé si la
      nature du transfert change après coup
