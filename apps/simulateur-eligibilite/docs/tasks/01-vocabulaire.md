# 01: Vocabulaire

**What to build:** un vocabulaire unique, partagé par l'équipe, l'éditeur et le
code. Chaque notion a un mot, et aucun mot n'a deux sens.

**Blocked by:** aucun. L'alignement avec l'équipe est en cours.

**Status:** arbitré, reste à reporter dans `CONTEXT.md`

## Décisions prises

- **D-11** Préconisation : le concept qui aboutit à R2 puis à R3. Résultat : R2
  et R3.
- **D-12** Cibles et Faits, en français, comme chez l'éditeur (`cible_*`,
  `fait_*`).
- **D-13, D-38** `Questions` nomme la déclaration des questions du modèle.
  `Answers<Questions>` nomme les réponses données. Le socle garde `Answers`.
- **D-15** La liste des écarts est soumise à l'équipe :
  <https://claude.ai/artifact/UqVYbdC6XyTkMVtJwMp8Bb>. Elle compte 39 termes,
  dont 8 faux amis.
- **D-16** « Préconisation » est confirmé. L'éditeur dit « décision » pour la
  même chose, et « issue » pour sa conclusion.
- **D-17** R2 et R3 s'appellent `Resultat` dans le code.
- **D-18** Le second résultat s'appelle `cerfa`, S3141 compris, même si ce
  formulaire n'a pas de numéro Cerfa dans le livrable.
- **D-19** Questionnaire et parcours sont deux notions. Le questionnaire est
  l'ensemble des questions. Un parcours est le chemin d'un utilisateur dedans.
  Le code garde « questionnaire ».
- **D-20** « Modèle » : la version entière. « Règles » : le fichier publicodes.
- **D-21** « Référentiel » : réservé au rattachement. « Nomenclatures » : les
  corpus CCAM, NGAP, NABM et LPP.
- **D-22** « Catalogue » : toujours qualifié, « catalogue des seeds ».
- **D-23** « Trace » : toujours qualifiée, « trace de debug » ou « trace
  d'audit ».
- **D-24** « Établissement » : celui du rattachement. « Lieu de soins » pour un
  lieu du trajet. La « structure » de l'éditeur vaut notre établissement.
- **D-25** « Sortie » : écarté. On dit « cibles » et « résultats ».
- **D-42** « Cible documentaire » : une cible qui ne décide rien et ne sert
  qu'à remplir le cerfa. Le terme est de nous, l'éditeur ne distingue pas.
- **D-26** « Page » : un écran de questions à l'intérieur d'une partie (la
  « page physique » de l'éditeur : P1/1, P2/trajet). Jamais une partie, jamais
  un résultat.
- **D-27** « Lecture seule » : `readOnly` reste au remplissage PDF. Dans le
  questionnaire, une réponse reprise sans pouvoir être modifiée est une
  réponse « déduite ».

## La chaîne retenue

Questions → Faits → Cibles → Résultats.

L'ensemble des cibles d'une simulation est la Préconisation. Les cibles ne
servent pas à la calculer : elles la composent.

## Questions ouvertes

Aucune. Les retours de l'équipe sur la page publiée peuvent en rouvrir.

## Critères d'acceptation

- [ ] Chaque faux ami est tranché.
- [ ] Les termes retenus sont dans `docs/knowledge/CONTEXT.md`, avec leur
      correspondance chez l'éditeur.
- [ ] La page publiée reflète les décisions.
