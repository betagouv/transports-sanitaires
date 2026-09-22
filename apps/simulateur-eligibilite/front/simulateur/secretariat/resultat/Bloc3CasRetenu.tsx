// Bloc 3 de la Page Résultat 2 — informations pour le corps médical : le cas
// retenu et les cases documentaires à reporter sur le formulaire. Chaque case n'est
// listée que si la simulation l'a établie, d'où le moteur en paramètre.

import { type moteur, vrai } from "../../moteur";
import type { GroupeRetenu } from "../case-de-formulaire";
import { type Article80, Article80CorpsMedical } from "./Article80";
import { casesRetenues } from "./cases-documentaires";
import { NoteUrgenceCorpsMedical } from "./urgence-attestee";

type Props = {
  e: typeof moteur;
  casFinal: string;
  transport: string;
  doc: string;
  article80: Article80;
  /** Le jour où le prescripteur est arrivé sur le Résultat 2. */
  datePrescription: string;
};

export function Bloc3CasRetenu({
  e,
  casFinal,
  transport,
  doc,
  article80,
  datePrescription,
}: Props) {
  return (
    <div className="fr-callout" style={{ marginBottom: "2rem" }}>
      <h3 className="fr-callout__title">
        <span className="fr-icon-hospital-line fr-mr-1w" aria-hidden="true" />
        Informations pour le corps médical
      </h3>

      <div className="fr-callout__text">
        <ARecopierSurLeFormulaire
          casFinal={casFinal}
          transport={transport}
          doc={doc}
          datePrescription={datePrescription}
        />
        <NoteCorpsMedical casFinal={casFinal} article80={article80} />
        {vrai(e, "cible_urgence_attestee") && (
          <NoteUrgenceCorpsMedical casFinal={casFinal} />
        )}
        <QualificationDuMotifAld e={e} />
        <TracabiliteDuMotifAld e={e} casFinal={casFinal} />
        <CasesACompleter groupes={casesRetenues(casFinal, e)} />
      </div>
    </div>
  );
}

// ---- implémentation ----

// Les quatre lignes que le corps médical recopie sur le formulaire, et rien
// d'autre : ce qui suit dans le bloc explique, quand celles-ci se transcrivent.
function ARecopierSurLeFormulaire({
  casFinal,
  transport,
  doc,
  datePrescription,
}: Pick<Props, "casFinal" | "transport" | "doc" | "datePrescription">) {
  return (
    <>
      <p>
        <strong>Cas retenu :</strong> {CAS_RETENU[casFinal] ?? casFinal}
      </p>
      <p>
        <strong>Transport sanitaire prescrit :</strong> {transport}
      </p>
      {/*
        Le modèle ne date rien : « Le moteur ne lit jamais une date système
        implicite ». C'est l'application qui pose ce jour-là, à l'arrivée sur cet
        écran, et le report sur le formulaire s'y réfère.
      */}
      <p>
        <strong>Date de prescription :</strong> {datePrescription}
      </p>
      <p>
        <strong>Document à remettre au patient :</strong> {doc}
      </p>
    </>
  );
}

// Libellé du cas retenu tel qu'attendu par le corps médical (plus explicite que
// la valeur brute de `cas_final`).
const CAS_RETENU: Record<string, string> = {
  "prescription médicale de transport":
    "PMT (Prescription Médicale de Transport)",
  "prescription S3141":
    "S3141 — prescription de transport pour permission temporaire de sortie",
  "demande d’accord préalable": "DAP (Demande d’Accord Préalable)",
  "convocation ou avis d’audience":
    "Convocation ou avis d’audience valant prescription médicale de transport",
  // Texte livré mot pour mot (contrat v9.7.3, `case_label`) — sans ancrage
  // « convocation » depuis TS973-03, qui étend ce cas final à l'avion/bateau
  // hors convocation.
  "orientation vers la caisse pour accord préalable":
    "Transport en avion ou bateau : orientation vers la caisse",
  "transport à la charge de l’établissement":
    "Transport à charge de l’établissement de santé",
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
  if (!vrai(e, "p1_m0_ald") || vrai(e, "cible_situation_ald")) return null;
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

// Le pendant du bloc précédent, quand l'ALD *est* retenue : dire d'où vient le
// motif, et rappeler que le droit ne s'arrête pas là — l'acte doit encore être
// tarifé. Né avec la v9.5.0, qui a vu des ALD reconnues servir à ouvrir un droit
// que la prestation ne portait pas.
function TracabiliteDuMotifAld({ e, casFinal }: Pick<Props, "e" | "casFinal">) {
  const documente =
    casFinal === "prescription médicale de transport" ||
    casFinal === "demande d’accord préalable";
  if (!documente || !vrai(e, "cible_situation_ald")) return null;
  return (
    <div className="fr-mt-2w">
      <p className="fr-mb-1v">
        <strong>Traçabilité du motif ALD (Affection de Longue Durée)</strong>
      </p>
      <p>
        Les soins ou examens à l’origine du déplacement concernent le
        traitement, le suivi ou les conséquences d’une ALD (Affection de Longue
        Durée) reconnue pour le patient.
      </p>
      <p>
        La prise en charge du transport reste conditionnée au caractère tarifé
        et remboursable de l’acte ou de la prestation dans le cadre concerné.
      </p>
    </div>
  );
}

function CasesACompleter({ groupes }: { groupes: GroupeRetenu[] }) {
  if (groupes.length === 0) return null;
  return (
    <>
      <hr className="fr-mt-3w fr-pb-1v" />
      <p className="fr-mb-3w">
        <strong>Cases à compléter ou cocher :</strong>
      </p>
      {/* Trois colonnes sur grand écran, deux sur tablette, empilées sur mobile.
          Le nombre de rubriques suit le formulaire — sept pour la DAP — et une
          colonne par rubrique les rendrait illisibles : elles s'enroulent. */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {groupes.map((groupe) => (
          <div key={groupe.titre} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
            <GroupeDeCases groupe={groupe} />
          </div>
        ))}
      </div>
    </>
  );
}

function GroupeDeCases({ groupe }: { groupe: GroupeRetenu }) {
  return (
    <>
      <p className="fr-mb-1v">
        <span className={`${groupe.icone} fr-mr-1w`} aria-hidden="true" />
        <strong>{groupe.titre}</strong>
      </p>
      <ul>
        {groupe.cases.map((laCase) => (
          <li key={laCase}>{laCase}</li>
        ))}
      </ul>
    </>
  );
}
