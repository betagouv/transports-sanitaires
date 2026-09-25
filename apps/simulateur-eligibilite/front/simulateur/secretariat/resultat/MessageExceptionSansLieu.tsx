// L'écran qui remplace « informations insuffisantes » quand une exception EHPAD
// ou USLD ne correspond à aucun type de lieu du trajet (TS973-07).
//
// Rien ne manque : deux réponses se contredisent. Le message les nomme et
// laisse le prescripteur choisir laquelle est fausse. Ce n'est jamais un refus
// de prise en charge : le droit n'est pas encore tranché. Il parle de types de
// lieu, pas d'adresse, parce que l'application ne vérifie aucune adresse.

import type { ExceptionSansLieu } from "../../exception-sans-lieu";

export function MessageExceptionSansLieu({
  contradiction,
}: {
  contradiction: ExceptionSansLieu;
}) {
  const { exception, depart, arrivee } = contradiction;
  return (
    <div className="fr-alert fr-alert--warning">
      <h3 className="fr-alert__title">
        Le trajet ne correspond pas à l’exception {exception}
      </h3>
      <p>
        Vous avez coché l’exception « {exception} », mais le type de lieu de
        départ est « {depart.type} » et celui d’arrivée « {arrivee.type} ».
      </p>
      <p>{correction(contradiction)}</p>
    </div>
  );
}

// ---- implémentation ----

// Un lieu déduit n'a pas de question où le changer : on ne propose de choisir
// le type que pour un lieu répondu. Retirer l'exception reste toujours
// possible.
function correction({ exception, depart, arrivee }: ExceptionSansLieu) {
  if (!depart.deduit && !arrivee.deduit)
    return `Choisissez « ${exception} » pour le départ ou l’arrivée, ou retirez l’exception.`;
  if (!depart.deduit)
    return `Choisissez « ${exception} » pour le départ, ou retirez l’exception.`;
  if (!arrivee.deduit)
    return `Choisissez « ${exception} » pour l’arrivée, ou retirez l’exception.`;
  return "Le départ et l’arrivée sont déduits de vos autres réponses. Retirez l’exception, ou revoyez ces réponses.";
}
