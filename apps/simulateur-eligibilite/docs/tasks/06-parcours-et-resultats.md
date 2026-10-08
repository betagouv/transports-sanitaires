# 06: Parcours et résultats

**What to build:** le parcours de la v10, porté par le socle et alimenté par un
modèle. L'utilisateur répond à P0, P1 et P2, lit R2, peut verrouiller, répond à
P3, puis télécharge son cerfa en R3.

**Blocked by:** 03 (le contrat), 05 (les parties).

**Status:** fait, hors impression et production du PDF (381090c).

## Décisions prises

- **D-05** Le socle porte le parcours. Le modèle ne le redéfinit pas.
- **D-08** Deux résultats : R2 et R3.
- **D-36** Le socle rend tous les boutons. Le modèle fournit les libellés des
  trois actions propres à la version, dont l'impression de la fiche.
- **D-44** En P3, `askedIf` reçoit les cibles figées au verrou.
- **D-45** Le stepper s'affiche aussi sur R2 et R3.
- **D-46** Le trajet retour différent relève du modèle.
- **D-47** Première écriture sur le factice : tout sauf la production du PDF.

## Proposé, à confirmer

- `Simulateur` reçoit le modèle en prop et ne contient plus aucun texte ni
  aucune question de la version.
- **Le bouton qui verrouille** n'apparaît que si `cerfa.form(cibles)` rend un
  formulaire. Sinon R2 est le dernier écran.
- **Le stepper** compte les parties de `transportAndEligibility`, plus une pour
  P3 quand elle existe. La v10 demande « 3 sur 3 » ou « 3 sur 4 » en R2.
- **`completedAt`** est posé quand P3 est validée, et renouvelé si elle est
  revalidée.
- **Les retours** : depuis R2, on rouvre le questionnaire. Après le verrou, on
  ne revient jamais avant P3.

## Ce qui est fait

- `Simulateur` reçoit le modèle et ne contient plus aucun texte de la version.
- Le bouton qui verrouille n'apparaît que si `cerfa.form(cibles)` rend un
  formulaire. Le factice l'éprouve avec la réponse « Rien » (C-2).
- Le stepper s'affiche sur les deux résultats.
- Le verrou fige les réponses et la préconisation. Le second résultat affiche
  les cibles figées, sans recalcul.
- La trace de debug montre les faits et les cibles.

## Ce qui reste

- L'impression de la fiche et son bouton (`printLabel`).
- La production et le téléchargement du PDF (`downloadLabel`, `template`,
  `mapping`), avec `completedAt`.

## Questions ouvertes

Aucune. L'éditeur a retiré le verrou côté serveur du livrable (D-64).

## Critères d'acceptation

- [x] Le parcours complet tourne avec le factice.
- [x] Un modèle dont `cerfa.form` rend `null` s'arrête à R2, sans bouton de
      verrou.
- [x] Les tests du verrou et de la navigation passent.
