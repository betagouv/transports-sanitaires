// La date de prescription : celle du jour où le prescripteur arrive sur le
// Résultat 2.
//
// Le modèle ne la calcule pas, et ne le peut pas : « Le moteur ne lit jamais une
// date système implicite », dit le guide de la v9.7. C'est l'application qui la
// pose, à un moment précis — l'arrivée sur le résultat, et non l'ouverture du
// questionnaire ni l'impression du document —, et qui la conserve jusqu'à ce
// qu'une réponse la rende caduque.
//
// Le fuseau compte : une simulation menée à 23 h 30 à Paris ne doit pas dater du
// lendemain parce que le navigateur calcule en UTC. Le contrat le dit
// explicitement — date locale Europe/Paris.

/** La date du jour à Paris, au format que le document imprime (JJ/MM/AAAA). */
export function dateDePrescription(maintenant: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
}
