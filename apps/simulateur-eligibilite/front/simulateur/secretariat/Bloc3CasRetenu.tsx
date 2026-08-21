// Bloc 3 de la Page Résultat 2 — informations pour le corps médical : le cas
// retenu et les cases documentaires à reporter sur le formulaire. Chaque case n'est
// listée que si la simulation l'a établie, d'où le moteur en paramètre.

import { type moteur, vrai } from "../moteur";
import { type Article80, Article80CorpsMedical } from "./Article80";
import type { Groupe } from "./cases-documentaires";
import { casesRetenues, texteDeCase } from "./cases-documentaires";

type Props = {
  e: typeof moteur;
  casFinal: string;
  transport: string;
  doc: string;
  article80: Article80;
};

export function Bloc3CasRetenu({
  e,
  casFinal,
  transport,
  doc,
  article80,
}: Props) {
  return (
    <div className="fr-callout" style={{ marginBottom: "2rem" }}>
      <h3 className="fr-callout__title">
        <span className="fr-icon-hospital-line fr-mr-1w" aria-hidden="true" />
        Informations pour le corps médical
      </h3>

      <div className="fr-callout__text">
        <p>
          <strong>Cas retenu :</strong> {CAS_RETENU[casFinal] ?? casFinal}
        </p>
        <p>
          <strong>Transport sanitaire prescrit :</strong> {transport}
        </p>
        <p>
          <strong>Document à remettre au patient :</strong> {doc}
        </p>
        <NoteCorpsMedical casFinal={casFinal} article80={article80} />
        <QualificationDuMotifAld e={e} />
        <CasesACompleter groupes={casesRetenues(casFinal, e, transport)} />
      </div>
    </div>
  );
}

// ---- implémentation ----

// Libellé du cas retenu tel qu'attendu par le corps médical (plus explicite que
// la valeur brute de `cas_final`).
const CAS_RETENU: Record<string, string> = {
  "prescription médicale de transport":
    "PMT (Prescription Médicale de Transport)",
  "demande d’accord préalable": "DAP (Demande d’Accord Préalable)",
  "convocation ou avis d’audience":
    "Convocation ou avis d’audience valant prescription médicale de transport",
  "transport à la charge de l’établissement":
    "Transport à charge de l’établissement de santé",
  "prestation non prise en charge par l’Assurance Maladie":
    "Prestation à l’origine du déplacement non prise en charge par l’Assurance Maladie",
  SMUR: "Transport par équipe SMUR",
  "bariatrique seul":
    "Contrainte bariatrique seule insuffisante pour une prise en charge Assurance Maladie",
  "permission de sortie sans motif médical":
    "Permission de sortie demandée par le patient, sans motif médical",
  "non éligible à une prise en charge par l’Assurance Maladie":
    "Non éligible Assurance Maladie dans ce parcours",
};

// Note corps médical propre à certains cas : rendue en complément de la
// checklist. Contenus repris de ui.yaml → result_pages.resultat_2.blocks.
function NoteCorpsMedical({
  casFinal,
  article80,
}: {
  casFinal: string;
  article80: Article80;
}) {
  if (casFinal === "prestation non prise en charge par l’Assurance Maladie") {
    return (
      <div className="fr-mt-2w">
        <p>
          L’absence de prise en charge de la consultation, du soin, de l’examen
          ou de la prestation à l’origine du déplacement exclut la prise en
          charge du transport dans ce parcours.
        </p>
        <p>
          Cette règle est prioritaire sur le mode de transport retenu, y compris
          lorsqu’une ambulance est médicalement justifiée.
        </p>
        <p>
          Ne pas établir de PMT ou de DAP ouvrant droit à une prise en charge
          par l’Assurance Maladie pour ce déplacement.
        </p>
      </div>
    );
  }
  if (casFinal === "transport à la charge de l’établissement") {
    return (
      <div className="fr-mt-2w">
        <Article80CorpsMedical article80={article80} />
      </div>
    );
  }
  return null;
}

// Le pendant médical de l'information patient sur l'ALD : dire que le motif n'est
// pas retenu, et surtout borner la portée de cette conclusion — elle ne touche ni
// le mode verrouillé, ni les autres motifs réglementaires.
function QualificationDuMotifAld({ e }: Pick<Props, "e">) {
  if (!vrai(e, "cible_ald_non_retenue_absence_incapacite_deficience"))
    return null;
  return (
    <div className="fr-mt-2w">
      <p className="fr-mb-1v">
        <strong>Qualification du motif ALD (Affection de Longue Durée)</strong>
      </p>
      <p>
        Le motif ALD (Affection de Longue Durée) n’est pas retenu, car aucune
        incapacité ou déficience définie par le référentiel n’a été identifiée.
      </p>
      <p>
        Cette conclusion ne modifie pas le mode médical verrouillé et n’empêche
        pas l’application d’un autre motif réglementaire.
      </p>
    </div>
  );
}

function CasesACompleter({ groupes }: { groupes: Groupe[] }) {
  if (groupes.length === 0) return null;
  return (
    <>
      <hr className="fr-mt-3w fr-pb-1v" />
      <p className="fr-mb-3w">
        <strong>Cases à compléter ou cocher :</strong>
      </p>
      {/* Une colonne par groupe sur écran large (3 sections PMT ⇒ 3 colonnes),
          empilées sur mobile. */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {groupes.map((groupe) => (
          <div
            key={groupe.titre ?? "sans-titre"}
            className={`fr-col-12 fr-col-md-${Math.floor(12 / groupes.length)}`}
          >
            <GroupeDeCases groupe={groupe} />
          </div>
        ))}
      </div>
    </>
  );
}

function GroupeDeCases({ groupe }: { groupe: Groupe }) {
  return (
    <>
      {groupe.titre && (
        <p className="fr-mb-1v">
          {groupe.icone && (
            <span className={`${groupe.icone} fr-mr-1w`} aria-hidden="true" />
          )}
          <strong>{groupe.titre}</strong>
        </p>
      )}
      <ul>
        {groupe.cases.map((laCase) => (
          <li key={texteDeCase(laCase)}>{texteDeCase(laCase)}</li>
        ))}
      </ul>
    </>
  );
}
