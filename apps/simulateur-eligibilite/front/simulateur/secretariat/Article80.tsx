// Article 80 — transport à la charge de l'établissement de santé. Notion à part
// entière : elle a **deux rendus**, l'un pour le patient (Bloc 2), l'autre pour le
// corps médical (Bloc 3), qui ne disent pas la même chose. Les regrouper ici évite
// que les deux volets divergent au fil des évolutions du modèle.
//
// Contenus différenciés v8.10 selon le mode retenu et les situations spécifiques
// (détenu / UHSA-UHSI…). Repris de tmp/8.10/transports-sanitaires.ui.v8-10.yaml
// → result_pages.resultat_2.blocks.article_80.

export type Article80 = {
  // "transport professionnel" | "véhicule personnel ou transports en commun" | "non applicable"
  mode: string;
  situationSpecifique: boolean;
  permissionTherapeutique: boolean;
};

// Volet patient. La variante « situation spécifique » (détenu/UHSA-UHSI) n'évoque
// jamais le véhicule personnel ni les transports en commun (contrainte ui.yaml).
export function Article80Patient({ article80 }: { article80: Article80 }) {
  const perso = article80.mode === "véhicule personnel ou transports en commun";
  return (
    <>
      {article80.permissionTherapeutique && (
        <p>
          La permission de sortie est accordée pour un motif thérapeutique. Le
          transport est à la charge de l’établissement.
        </p>
      )}
      {article80.situationSpecifique ? (
        <ul>
          <li>
            Le transport est organisé dans le cadre de votre prise en charge par
            l’établissement.
          </li>
          <li>
            Vous n’avez aucune demande de remboursement à adresser directement à
            votre caisse d’Assurance Maladie.
          </li>
        </ul>
      ) : perso ? (
        <ul>
          <li>
            N’adressez pas directement vos justificatifs de transport à votre
            caisse d’Assurance Maladie.
          </li>
          <li>
            Avant d’organiser le trajet ou d’avancer des frais, rapprochez-vous
            de l’établissement pour connaître les conditions d’autorisation, les
            justificatifs à conserver et les éventuelles modalités de
            défraiement applicables.
          </li>
        </ul>
      ) : (
        <ul>
          <li>
            Vous n’avez aucune demande de remboursement à adresser à votre
            caisse d’Assurance Maladie.
          </li>
          <li>
            L’établissement organise le transport selon sa procédure interne.
          </li>
        </ul>
      )}
    </>
  );
}

// Volet corps médical.
export function Article80CorpsMedical({ article80 }: { article80: Article80 }) {
  const perso = article80.mode === "véhicule personnel ou transports en commun";
  return (
    <>
      <p>
        Ce transport est à la charge de l’établissement chargé de la
        prescription. Il ne relève pas d’une facturation directe à la caisse
        d’Assurance Maladie.
      </p>
      {article80.situationSpecifique ? (
        <p>
          Le transport doit être organisé selon la procédure interne de
          l’établissement et les règles spécifiques applicables à la situation
          du patient.
        </p>
      ) : perso ? (
        <p>
          Avant que le patient organise le trajet ou avance des frais, il doit
          être orienté vers le service compétent de l’établissement afin de
          vérifier les conditions d’autorisation et de défraiement applicables
          au véhicule personnel ou aux transports en commun.
        </p>
      ) : (
        <p>
          Le transporteur doit adresser sa facture à l’établissement chargé de
          la prescription, selon la procédure applicable dans l’établissement.
        </p>
      )}
    </>
  );
}
