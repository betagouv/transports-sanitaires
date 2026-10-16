// Les deux pages de la permission, après les exceptions de l'article 80 : Q2.7
// pour la tranche d'âge et le cadre, puis Q2.8 pour le patient de moins de
// 20 ans, sur une seule page (D-107).

import {
  type Answers,
  optionsFrom,
  type QuestionnairePart,
  type Validated,
} from "../../socle";
import {
  commenceAvantLeQuatorzieme,
  commenceAvantLHospitalisation,
  depasseQuaranteHuitHeures,
  finNonPosterieure,
  periodeAvantLaFinDeLaPermission,
} from "./dates-de-la-permission";
import { OPTIONS, type Questions } from "./declarations/questions";
import {
  mineurDeVingtAns,
  optionsAdultesAProposer,
  permissionAcquise,
} from "./permission";

type Page = QuestionnairePart<Questions, undefined>["pages"][number];

// Q2.7 se pose dès que la permission est acquise. Un patient de moins de 18
// ans en Q1.3 ne se propose pas adulte. Q2.7.a confirme la facturation d'un
// transport exceptionnel, sous le choix qui l'ouvre.
export const PAGE_DE_LA_PERMISSION: Page = {
  id: "P2/permission",
  questions: [
    {
      id: "Q2.7",
      kind: "single choice",
      label:
        "Dans quelle tranche d’âge se situe le patient pendant la période prescrite et quel est le cadre de la permission ?",
      askedIf: (_answers, _cibles, validated) => permissionAcquise(validated),
      options: optionsFrom<Questions["Q2.7"], Questions, undefined>(
        OPTIONS["Q2.7"],
        {
          "3_ADULTE_AUTORISEE": { offeredIf: adultesAProposer },
          "4_ADULTE_A_SA_CHARGE": { offeredIf: adultesAProposer },
        },
      ),
    },
    {
      id: "Q2.7.a",
      kind: "single choice",
      label:
        "L’établissement confirme-t-il que ce transport correspond à une prestation exceptionnelle facturable au patient ?",
      hint: "La seule préférence personnelle ne suffit pas. Vérifier la demande écrite, l’absence de fondement médical, l’absence de couverture par les tarifs de l’établissement et l’information du patient sur le prix et la facturation.",
      askedIf: (answers) => answers["Q2.7"] === "4_ADULTE_A_SA_CHARGE",
      dependsOn: ["Q2.7"],
      options: optionsFrom(OPTIONS["Q2.7.a"]),
    },
  ],
};

// Les caractéristiques de la permission d'un patient de moins de 20 ans : tout
// le lot sur une page. Chaque contrôle se déclare sur la plus tardive des
// deux questions qu'il compare.
export const PAGE_DE_LA_PERMISSION_DU_MINEUR: Page = {
  id: "P2/permission-mineur",
  questions: [
    {
      id: "Q2.8.1",
      kind: "date",
      label: "Depuis quelle date le patient est-il hospitalisé ?",
      askedIf: mineurAPoser,
    },
    {
      id: "Q2.8.2",
      kind: "datetime",
      label: "Quand commence la première permission ?",
      askedIf: mineurAPoser,
      inconsistenciesFrom: (answers) => [
        ...(commenceAvantLHospitalisation(answers["Q2.8.1"], answers["Q2.8.2"])
          ? [
              "La permission ne peut pas commencer avant le début de l’hospitalisation.",
            ]
          : []),
        ...(commenceAvantLeQuatorzieme(answers["Q2.8.1"], answers["Q2.8.2"])
          ? [
              "La première permission doit commencer au 14e jour d’hospitalisation ou après.",
            ]
          : []),
      ],
    },
    {
      id: "Q2.8.3",
      kind: "datetime",
      label: "Quand se termine cette première permission ?",
      askedIf: mineurAPoser,
      inconsistenciesFrom: (answers) => [
        ...(finNonPosterieure(answers["Q2.8.2"], answers["Q2.8.3"])
          ? ["La fin de la permission doit venir après son début."]
          : []),
        ...(depasseQuaranteHuitHeures(answers["Q2.8.2"], answers["Q2.8.3"])
          ? ["Une permission dure au plus 48 heures."]
          : []),
      ],
    },
    {
      id: "Q2.8.4",
      kind: "single choice",
      label:
        "Cette permission a-t-elle été autorisée par l’établissement après avis favorable du médecin chef de service ?",
      askedIf: mineurAPoser,
      options: optionsFrom(OPTIONS["Q2.8.4"]),
    },
    {
      id: "Q2.8.4.a",
      kind: "single choice",
      label: "Quel est le cadre de cette permission ?",
      hint: "Chez un patient de moins de 20 ans, une demande personnelle n’établit pas à elle seule une charge patient ; appliquer les conditions S3141.",
      askedIf: mineurAPoser,
      options: optionsFrom(OPTIONS["Q2.8.4.a"]),
    },
    {
      id: "Q2.8.5",
      kind: "single choice",
      label: "La prescription couvre-t-elle plusieurs permissions ?",
      askedIf: mineurAPoser,
      options: optionsFrom(OPTIONS["Q2.8.5"]),
    },
    {
      id: "Q2.8.6",
      kind: "date",
      label: "Quand se termine la période couverte par la prescription ?",
      askedIf: plusieursPermissions,
      dependsOn: ["Q2.8.5"],
      inconsistenciesFrom: (answers) =>
        periodeAvantLaFinDeLaPermission(answers["Q2.8.6"], answers["Q2.8.3"])
          ? [
              "La période ne peut pas se terminer avant la fin de la première permission.",
            ]
          : [],
    },
    {
      id: "Q2.8.6.a",
      kind: "number",
      label:
        "Une permission aller-retour est prévue toutes les combien de semaines ?",
      hint: "1 = chaque semaine ; 2 = toutes les deux semaines. Pour des permissions irrégulières, qualifier séparément les périodes concernées.",
      integer: true,
      min: 1,
      unit: "semaine(s)",
      askedIf: plusieursPermissions,
      dependsOn: ["Q2.8.5"],
    },
    {
      id: "Q2.8.6.b",
      kind: "single choice",
      label:
        "Le patient restera-t-il âgé de moins de 20 ans durant toute la période ?",
      askedIf: plusieursPermissions,
      dependsOn: ["Q2.8.5"],
      options: optionsFrom(OPTIONS["Q2.8.6.b"], {
        "2_NON": {
          blocks:
            "La période doit se terminer avant le vingtième anniversaire du patient. Raccourcissez-la, puis faites une autre simulation pour la période suivante.",
        },
      }),
    },
  ],
};

// ---- implémentation ----

type Reponses = Answers<Questions>;
type Valides = Validated<Questions>;

function adultesAProposer(
  _answers: Reponses,
  _cibles: undefined,
  validated: Valides,
): boolean {
  return optionsAdultesAProposer(validated);
}

function mineurAPoser(
  _answers: Reponses,
  _cibles: undefined,
  validated: Valides,
): boolean {
  return mineurDeVingtAns(validated);
}

function plusieursPermissions(
  answers: Reponses,
  cibles: undefined,
  validated: Valides,
): boolean {
  return (
    mineurAPoser(answers, cibles, validated) && answers["Q2.8.5"] === "1_OUI"
  );
}
