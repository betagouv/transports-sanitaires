// Article 80 — transport à la charge de l'établissement de santé. Notion à part
// entière : elle a **deux rendus**, l'un pour le patient (Bloc 2), l'autre pour le
// corps médical (Bloc 3), qui ne disent pas la même chose. Les regrouper ici évite
// que les deux volets divergent au fil des évolutions du modèle.
//
// Contenus différenciés selon le seul mode retenu.
//
// La v9.1 a retiré du modèle la permission de sortie thérapeutique : elle n'est
// plus une variante de l'Article 80 mais un cas particulier médical (M0) qui
// tranche dès la Partie 1. La v9.7 a retiré la seconde variante, la « situation
// spécifique » du patient détenu : sa branche entière a disparu du modèle, le
// transfert inter-établissements étant désormais qualifié en amont.

export type Article80 = {
  // "véhicule personnel" | "transport en commun terrestre" | un mode sanitaire
  mode: string;
};

// Volet patient. La variante « situation spécifique » (détenu/UHSA-UHSI) n'évoque
// jamais le véhicule personnel ni les transports en commun (contrainte ui.yaml).
export function Article80Patient({ article80 }: { article80: Article80 }) {
  return <ConsignesPatient article80={article80} />;
}

// Volet corps médical.
export function Article80CorpsMedical({ article80 }: { article80: Article80 }) {
  return (
    <>
      <p>
        Ce transport est à la charge de l’établissement chargé de la
        prescription. Il ne relève pas d’une facturation directe à la caisse
        d’Assurance Maladie.
      </p>
      <ConsigneCorpsMedical article80={article80} />
    </>
  );
}

// ---- implémentation ----

function ConsignesPatient({ article80 }: { article80: Article80 }) {
  if (estVehiculePersonnel(article80)) return <PatientVehiculePersonnel />;
  return <PatientProcedureInterne />;
}

function PatientVehiculePersonnel() {
  return (
    <ul>
      <li>
        N’adressez pas directement vos justificatifs de transport à votre caisse
        d’Assurance Maladie.
      </li>
      <li>
        Avant d’organiser le trajet ou d’avancer des frais, rapprochez-vous de
        l’établissement pour connaître les conditions d’autorisation, les
        justificatifs à conserver et les éventuelles modalités de défraiement
        applicables.
      </li>
    </ul>
  );
}

function PatientProcedureInterne() {
  return (
    <ul>
      <li>
        Vous n’avez aucune demande de remboursement à adresser à votre caisse
        d’Assurance Maladie.
      </li>
      <li>L’établissement organise le transport selon sa procédure interne.</li>
    </ul>
  );
}

function ConsigneCorpsMedical({ article80 }: { article80: Article80 }) {
  if (estVehiculePersonnel(article80)) {
    return (
      <p>
        Avant que le patient organise le trajet ou avance des frais, il doit
        être orienté vers le service compétent de l’établissement afin de
        vérifier les conditions d’autorisation et de défraiement applicables au
        véhicule personnel ou aux transports en commun.
      </p>
    );
  }
  return (
    <p>
      Le transporteur doit adresser sa facture à l’établissement chargé de la
      prescription, selon la procédure applicable dans l’établissement.
    </p>
  );
}

// La v9.7 a scindé le mode non professionnalisé en deux : le véhicule personnel
// et le transport en commun terrestre. La consigne, elle, vaut pour les deux.
function estVehiculePersonnel(article80: Article80): boolean {
  return (
    article80.mode === "véhicule personnel" ||
    article80.mode === "transport en commun terrestre"
  );
}
