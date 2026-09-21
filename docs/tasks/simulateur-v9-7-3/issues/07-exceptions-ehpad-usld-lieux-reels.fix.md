# 07: Relier les exceptions EHPAD/USLD aux lieux réels (TS973-07)

**What to build:** une exception EHPAD ou USLD ne permet plus une PMT quand
aucun lieu renseigné ne correspond réellement à cet établissement ; le
prescripteur est renvoyé vers la réponse à corriger plutôt que vers un refus
de prise en charge.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Les quatre cas contradictoires `ROUTE-EXCEPTION-*-INVALID-*` ne
      finalisent plus une PMT
- [ ] Les trajets valides avec EHPAD/USLD continuent de fonctionner dans les
      deux sens autorisés
- [ ] HAD conserve sa qualification propre, non affectée par ce contrôle
- [ ] Le message affiché explique quelle réponse corriger, sans jamais
      présenter la contradiction comme un refus de droit
