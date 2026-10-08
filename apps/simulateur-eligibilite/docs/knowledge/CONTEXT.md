# Simulateur d'éligibilité : domaine

Glossaire des termes propres à ce contexte : le parcours de simulation d'éligibilité
au transport sanitaire, et son écran de rattachement.

## Language

**Rattachement**:
L'établissement et le service que déclare un utilisateur avant d'accéder au
simulateur, sans aucune information sur qui il est. C'est une affiliation
organisationnelle déclarative, pas une identité.
_Avoid_: Identification, identité. Ces mots sont réservés à une éventuelle
authentification individuelle future (ProConnect, AgentConnect), non implémentée.
Les employer pour le rattachement laisserait croire qu'une personne est identifiée.

**Rattachement dégradé**:
Le rattachement « Autre / Autre » donné d'office quand le référentiel ne répond pas.
L'utilisateur entre quand même dans le simulateur, et l'analytics range sa visite
sous « autre ».
_Avoid_: rattachement vide, anonyme. Il est bien là, simplement non renseigné.
