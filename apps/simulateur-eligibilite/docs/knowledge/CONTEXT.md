# Simulateur d'éligibilité : domaine

Glossaire des termes propres à ce contexte : le parcours de simulation d'éligibilité
au transport sanitaire, et son écran-porte.

## Language

**Rattachement**:
L'établissement et le service que déclare un utilisateur avant d'accéder au
simulateur, sans aucune information sur qui il est. C'est une affiliation
organisationnelle déclarative, pas une identité.
_Avoid_: Identification, identité. Ces mots sont réservés à une éventuelle
authentification individuelle future (ProConnect, AgentConnect), non implémentée.
Les employer pour le rattachement laisserait croire qu'une personne est identifiée.

**Prescripteur (outil)**:
L'un des deux parcours du simulateur, pour le professionnel de santé qui prescrit
le transport. L'autre est le secrétariat, qui gère la suite administrative.
_Avoid_: le confondre avec l'ancien prescripteur du référentiel, une personne
nommée choisie dans une liste. Celui-là a disparu de l'écran-porte ; ce qui reste
s'appelle l'outil ou le parcours prescripteur, jamais une identité.

**Ref**:
Pseudonyme HMAC à sens unique d'un élément du référentiel (établissement, service),
calculé côté serveur et transmis à l'analytics. Non réversible sans le secret.
_Avoid_: identifiant, id. Ce sont les identifiants bruts du référentiel, qui ne
sortent jamais tels quels.
