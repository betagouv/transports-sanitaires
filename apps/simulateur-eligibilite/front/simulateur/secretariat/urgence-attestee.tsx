// Ce que l'urgence médicale attestée change à la Page Résultat 2.
//
// Née de la v9.5.1, qui l'expose enfin : `cible_urgence_attestee` dit qu'un appel
// au SAMU, une autre urgence attestée par le prescripteur ou l'exception d'aide
// médicale urgente sont établis, et `cible_attente_accord_prealable_requise` dit
// si la décision de l'Assurance Maladie doit être attendue.
//
// L'urgence ne supprime pas le document — une DAP reste une DAP dès qu'un motif
// réglementaire existe — mais elle supprime l'attente. Les deux variantes du
// résultat sont donc **mutuellement exclusives** : une DAP urgente ne doit porter
// aucune phrase d'attente, de réserve ou de délai de 15 jours.
//
// Les contenus sont repris mot pour mot du contrat d'interface v9.5.1
// (`result_block_urgence`, `patient_block_urgence`, `medical_block_urgence`,
// `urgent_information`).

import { SousTitre } from "../resultat/InformationPatient";

/** Corps du verdict d'une DAP dispensée d'attente (Bloc 1). */
export function VerdictDapUrgente({ transport }: { transport: string }) {
  return (
    <>
      <p>
        Le transport relève habituellement d’une demande d’accord préalable,
        mais l’urgence médicale attestée permet sa réalisation sans attendre la
        réponse de l’Assurance Maladie.
      </p>
      <p>
        Transport sanitaire prescrit : <strong>{transport}</strong>.
      </p>
      <p>
        Document à remettre au patient :{" "}
        <strong>Demande d’Accord Préalable valant prescription médicale</strong>
        .
      </p>
    </>
  );
}

/** Marche à suivre du patient pour une DAP dispensée d'attente (Bloc 2). */
export function EtapesDapUrgente({ transport }: { transport: string }) {
  return (
    <ol>
      <li>
        Votre médecin vous remet le formulaire <strong>S3139h</strong>, établi
        avec la mention d’urgence : il vaut prescription médicale.
      </li>
      <li>
        Vérifiez que le transport demandé correspond bien au transport retenu :{" "}
        <strong>{transport}</strong>.
      </li>
      <li>
        Vous n’avez pas à attendre la réponse de l’Assurance Maladie ni le délai
        de 15 jours avant la réalisation du transport.
      </li>
    </ol>
  );
}

/**
 * L'urgence attestée sur une prescription médicale de transport (Bloc 2). Elle
 * n'y change aucune démarche — il n'y avait rien à attendre — mais le patient
 * doit savoir que le motif d'urgence a été retenu.
 */
export function InformationUrgencePmt() {
  return (
    <>
      <SousTitre icone="fr-icon-alarm-warning-line">
        Information relative à l’urgence
      </SousTitre>
      <p>
        L’urgence médicale est attestée. Aucun accord préalable n’est à attendre
        pour ce transport.
      </p>
    </>
  );
}

/** Ce que l'urgence attestée demande au corps médical (Bloc 3). */
export function NoteUrgenceCorpsMedical({ casFinal }: { casFinal: string }) {
  const Note = NOTES[casFinal];
  return Note ? (
    <div className="fr-mt-2w">
      <p className="fr-mb-1v">
        <strong>Prescription en contexte d’urgence</strong>
      </p>
      <Note />
    </div>
  ) : null;
}

// ---- implémentation ----

function NoteUrgenceDap() {
  return (
    <>
      <p>
        Établissez le formulaire S3139h valant prescription médicale en
        reprenant le mode retenu et le motif de DAP (Demande d’Accord
        Préalable).
      </p>
      <p>
        Renseignez la rubrique « Urgence » : cochez « appel du SAMU (Service
        d’Aide Médicale Urgente) - Centre 15 » ou précisez l’autre urgence
        médicale attestée, selon la situation.
      </p>
      <p>
        Le transport peut être réalisé sans attendre la réponse de l’Assurance
        Maladie. Lorsque le transport a déjà été réalisé, la prescription peut
        être établie a posteriori dans les conditions prévues pour l’urgence
        médicale.
      </p>
    </>
  );
}

function NoteUrgencePmt() {
  return (
    <>
      <p>
        Établissez la PMT (Prescription Médicale de Transport) en mentionnant le
        contexte d’urgence.
      </p>
      <p>
        Lorsque le transport a déjà été réalisé, la prescription peut être
        établie a posteriori dans les conditions prévues pour l’urgence
        médicale.
      </p>
    </>
  );
}

const NOTES: Record<string, () => React.ReactElement> = {
  "prescription médicale de transport": NoteUrgencePmt,
  "demande d’accord préalable": NoteUrgenceDap,
};
