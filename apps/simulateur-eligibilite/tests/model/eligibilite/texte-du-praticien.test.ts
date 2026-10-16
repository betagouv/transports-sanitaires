// Le texte du résultat des cinq issues sans fiche patient (#133, D-112). Les
// phrases attendues sont recopiées du catalogue de l'éditeur : un texte qui
// change sans que son oracle change échoue ici.

import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import {
  estSansFiche,
  type IssueSansFiche,
  texteDuPraticien,
} from "../../../front/models/eligibilite/texte-du-praticien";
import { traceDuResultat } from "../../../front/models/eligibilite/trace-du-resultat";
import { ciblesDe } from "./reponses-de-la-permission";
import { faux, trace, vrai } from "./traces-du-praticien";

const catalogue = await catalogueResultats();

const texteDeLaSeed = (id: string, issue: IssueSansFiche) => {
  const seed = SEEDS.find((candidate) => candidate.id === id);
  if (!seed) throw new Error(`Seed inconnue : ${id}`);
  const depuis = traceDuResultat(seed.answers, ciblesDe(seed.answers));
  return texteDuPraticien(catalogue, issue, depuis);
};

describe("le texte des seeds", () => {
  it("dit l'établissement, comme le scénario transfert-provisoire", () => {
    expect(texteDeLaSeed("issue-etablissement", "ISSUE_ETABLISSEMENT")).toEqual(
      {
        titre: "Ce transport relève de la prise en charge de l’établissement",
        introduction:
          "Le trajet a été qualifié comme un transfert entre établissements de moins de 48 heures. Aucune exception applicable n’a été établie : l’établissement est le financeur identifié. Contactez son service de coordination pour organiser le déplacement ; aucun formulaire Assurance Maladie n’est à compléter dans ce simulateur.",
        pourquoi: {
          titre: "Pourquoi cette orientation ?",
          elements: [
            {
              titre: "Situation retenue",
              texte:
                "Le trajet a été qualifié comme un transfert entre établissements pendant une prise en charge hospitalière. Il s’agit d’un déplacement provisoire de moins de 48 heures, avec retour vers l’établissement d’origine lorsque ce retour a été confirmé. Aucune exception applicable n’a été établie pour ce trajet.",
            },
          ],
        },
        questions: [],
        actions: [
          "Contacter le service prescripteur ou la cellule de coordination des transports de l’établissement d’origine.",
          "Faire confirmer l’organisation du transfert, les horaires et, si applicable, le retour par les établissements concernés.",
          "Ne pas générer de PMT ou de DAP Assurance Maladie à partir de ce résultat.",
        ],
      },
    );
  });

  it("dit la permission à la charge du patient, comme le scénario demande-adulte", () => {
    expect(
      texteDeLaSeed("issue-permission-patient", "ISSUE_PERMISSION_PATIENT"),
    ).toEqual({
      titre: "Le transport lié à cette permission est à la charge du patient",
      introduction:
        "La permission concerne un patient adulte et une prestation exceptionnelle expressément demandée, dont la facturation au patient est établie. Informez-le des conditions tarifaires et contactez le service de l’établissement pour organiser la sortie ; aucun formulaire de transport remboursable n’est produit dans ce simulateur.",
      pourquoi: {
        titre: "Pourquoi les frais relèvent-ils du patient ?",
        elements: [
          {
            titre: "Qualification de la permission",
            texte:
              "La permission concerne un patient âgé d’au moins 20 ans. Une prestation exceptionnelle a été demandée expressément par le patient, sans fondement médical distinct ouvrant droit à une prise en charge du transport ; sa facturation personnelle a été confirmée.",
          },
        ],
      },
      questions: [],
      actions: [
        "Confirmer avec le service concerné les modalités de sortie et informer le patient de la prise en charge financière retenue.",
        "Vérifier le tarif et, si nécessaire, faire établir un devis avant de réserver un transport payant.",
        "Ne pas éditer de prescription PMT/DAP Assurance Maladie pour ce trajet.",
      ],
    });
  });

  it("dit la convocation, comme le scénario controle", () => {
    expect(texteDeLaSeed("issue-convocation", "ISSUE_CONVOCATION")).toEqual({
      titre:
        "Ce déplacement relève d’une convocation ou d’un appareillage réglementaire",
      introduction:
        "Le déplacement a été qualifié comme une convocation du contrôle médical de l’Assurance Maladie. Conservez la convocation, l’avis ou le justificatif approprié et vérifiez les modalités auprès de l’organisme émetteur. Aucun formulaire de prescription n’est à compléter dans ce simulateur.",
      pourquoi: {
        titre: "Pourquoi ce résultat ?",
        elements: [
          {
            titre: "Situation reconnue",
            texte:
              "Le trajet est motivé par une convocation du contrôle médical de l’Assurance Maladie. Cette catégorie relève des situations réglementaires de convocation prévues pour le transport. La pièce justificative de référence est la convocation émise par le contrôle médical de l’Assurance Maladie.",
          },
        ],
      },
      questions: [],
      actions: [
        "Vérifier que la convocation ou l’avis mentionne bien la date, le lieu et l’objet du déplacement.",
        "Indiquer au patient de conserver cette pièce et de se rapprocher de l’organisme émetteur ou de sa caisse pour les modalités pratiques de remboursement. Ne pas générer de PMT ou DAP.",
      ],
    });
  });

  // L'oracle a une ALD de base inconnue ; la seed a un transfert du Centre 15.
  it("dit la caisse, comme le scénario centre15", () => {
    expect(texteDeLaSeed("issue-caisse", "ISSUE_CAISSE")).toEqual({
      titre: "Un point précis reste à vérifier auprès de l’Assurance Maladie",
      introduction:
        "Le simulateur a identifié le point déterminant qui reste à confirmer : la règle de financement d’un transport entre établissements demandé par le Centre 15. Cette incertitude peut modifier le financeur ou le document applicable ; une vérification ciblée permet de poursuivre l’orientation en sécurité.",
      pourquoi: {
        titre: "Point à confirmer",
        elements: [
          {
            titre: "L’effet de la demande du Centre 15 doit être clarifié",
            texte:
              "Un transport entre établissements, hors SMUR, a été demandé dans le cadre de l’aide médicale urgente par le Centre 15. Son articulation avec le financement des transferts hospitaliers n’est pas tranchée par le simulateur.",
          },
        ],
      },
      questions: [
        "La demande du Centre 15 hors SMUR constitue-t-elle, pour ce transfert, une exception au financement par l’établissement ?",
        "Quel financeur et quel document doivent être retenus pour ce cas précis ?",
      ],
      actions: [
        "Contacter l’Assurance Maladie et faire préciser le financeur, l’éventuel accord et la pièce à utiliser.",
        "Ne pas déduire une prise en charge positive ou un refus du seul point resté incertain.",
      ],
    });
  });

  it("dit le transport à l'étranger, sans promesse de prise en charge", () => {
    expect(
      texteDeLaSeed(
        "issue-dap-etranger-a-examiner",
        "ISSUE_DAP_ETRANGER_A_EXAMINER",
      ),
    ).toEqual({
      titre:
        "La prise en charge de ce transport à l’étranger doit être examinée par l’Assurance Maladie",
      introduction:
        "Le départ ou l’arrivée du trajet se situe hors de France. Le simulateur ne peut pas confirmer la prise en charge de ce transport. Adressez une demande d’examen à l’Assurance Maladie pour connaître les conditions, le circuit et les justificatifs applicables.",
      pourquoi: {
        titre: "Pourquoi ce résultat ?",
        elements: [
          {
            titre: "Une demande d’examen du transport",
            texte:
              "Dans cette situation, la caisse doit préciser les conditions applicables au transport. Le document S3139h préparé par le simulateur constitue une demande d’examen, pas un accord de remboursement. La prise en charge des soins à l’étranger relève de ses propres démarches.",
          },
        ],
      },
      questions: [
        "Ce trajet peut-il être pris en charge et à quelles conditions ?",
        "Quel circuit et quels justificatifs utiliser pour faire examiner cette demande ?",
      ],
      actions: [
        "Contacter la caisse du patient avant l’organisation du transport pour faire préciser les conditions de prise en charge et les justificatifs attendus.",
        "Préparer la demande S3139h avec les informations du trajet, en suivant les instructions de la caisse. Le document devra être complété et signé par le médecin ; sa préparation ou son envoi ne vaut pas accord.",
      ],
      avertissement:
        "Une réponse explicite de la caisse est nécessaire dans cette branche du simulateur. N’appliquez pas la règle d’accord tacite après 15 jours ni la dispense d’attente d’une DAP ordinaire sur la seule base de l’urgence.",
    });
  });
});

describe("le texte de repli", () => {
  it("garde le repli de l'établissement quand le contexte manque", () => {
    const texte = texteDuPraticien(catalogue, "ISSUE_ETABLISSEMENT", trace({}));
    expect(texte.introduction).toBe(
      "Le trajet a été qualifié comme un transport hospitalier relevant du financement de l’établissement. Aucune exception applicable n’a été établie : l’établissement est le financeur identifié. Contactez son service de coordination pour organiser le déplacement ; aucun formulaire Assurance Maladie n’est à compléter dans ce simulateur.",
    );
  });
});

describe("le texte de la caisse quand plusieurs points sont ouverts", () => {
  const ald = { cible_preuve_ald_inconnue_decisive: true } as const;
  const htnm = {
    fait_htnm_hors_maternite: vrai,
    fait_htnm_segment_verifie: faux,
  } as const;

  // L'oracle a un scénario de cumul pour l'ALD et l'hébergement.
  it("prend le scénario de cumul que l'éditeur a écrit pour ces deux points", () => {
    const texte = texteDuPraticien(catalogue, "ISSUE_CAISSE", trace(ald, htnm));
    expect(texte.introduction).toMatch(
      /^Le simulateur a identifié deux points/,
    );
    expect(texte.pourquoi).toEqual({
      titre: "Points à confirmer",
      elements: [
        {
          titre: "La catégorie de l’ALD n’est pas vérifiée",
          texte:
            "Un lien entre les soins et une ALD a été déclaré, mais sa catégorie réglementaire ne peut pas être établie à partir des réponses disponibles. Cette information peut conditionner le droit au transport ou une dispense d’accord préalable.",
        },
        {
          titre:
            "Le segment d’hébergement temporaire nécessite une qualification",
          texte:
            "Le trajet comporte un segment lié à un hébergement temporaire non médicalisé, hors dispositif Engagement maternité. La règle applicable à ce segment exact n’est pas suffisamment vérifiée pour conclure sur son financement.",
        },
      ],
    });
    expect(texte.questions).toHaveLength(4);
    expect(texte.actions).toHaveLength(2);
  });

  // Aucun scénario de cumul n'existe pour trois points.
  it("donne l'introduction pour plusieurs points, puis chaque scénario", () => {
    const trois = trace(ald, { ...htnm, fait_motif_samsah: vrai });
    const texte = texteDuPraticien(catalogue, "ISSUE_CAISSE", trois);
    expect(texte.introduction).toBe(
      "Plusieurs points restent à confirmer auprès de l’Assurance Maladie avant de déterminer la prise en charge de ce transport. Les éléments établis du dossier restent pris en compte ; aucune conclusion n’est déduite des informations manquantes.",
    );
    expect(texte.pourquoi?.titre).toBe("Points à confirmer");
    expect(texte.pourquoi?.elements.map(({ titre }) => titre)).toEqual([
      "La catégorie de l’ALD n’est pas vérifiée",
      "Le circuit documentaire du SAMSAH doit être précisé",
      "Le segment d’hébergement temporaire nécessite une qualification",
    ]);
    expect(texte.questions).toHaveLength(6);
    expect(texte.actions).toEqual([
      "Contacter l’Assurance Maladie et faire préciser le financeur, l’éventuel accord et la pièce à utiliser.",
      "Ne pas déduire une prise en charge positive ou un refus du seul point resté incertain.",
    ]);
  });

  // Les règles disent la caisse sans qu'un point se relise : le catalogue n'a
  // aucun texte à montrer, et rien n'est inventé. Le titre seul reste.
  it("ne montre que le titre quand aucun point ne se relit", () => {
    expect(texteDuPraticien(catalogue, "ISSUE_CAISSE", trace({}))).toEqual({
      titre: "Un point précis reste à vérifier auprès de l’Assurance Maladie",
      questions: [],
      actions: [],
    });
  });
});

describe("les issues sans fiche patient", () => {
  it("sont cinq, parmi les dix du catalogue", () => {
    const sans = Object.keys(catalogue.issues).filter(estSansFiche);
    expect(sans.sort()).toEqual([
      "ISSUE_CAISSE",
      "ISSUE_CONVOCATION",
      "ISSUE_DAP_ETRANGER_A_EXAMINER",
      "ISSUE_ETABLISSEMENT",
      "ISSUE_PERMISSION_PATIENT",
    ]);
  });
});
