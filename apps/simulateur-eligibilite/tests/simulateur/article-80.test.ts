// La charge de l'établissement, part de la matrice de non-régression du livrable
// v9.7.1 (tmp/9.7.1/transports-sanitaires.tests.v9-7-1.yaml).
//
// L'Article 80 et le régime pénitentiaire ont ceci de commun qu'ils déplacent la
// charge du transport : l'Assurance Maladie n'en est plus le payeur, et le
// patient ne repart avec aucun document de sa part. Le reste de la matrice est
// dans `regression.test.ts` et `accord-prealable.test.ts`.
//
// La v9.7 a refondu la qualification. Un transfert ne se déduit plus de
// l'hospitalisation du patient : il se déclare, par la raison principale puis par
// sa nature — définitive ou provisoire. Et la branche « patient détenu », qui
// portait ARTICLE80-002 et ARTICLE80-003 avec leur drapeau de situation
// spécifique, a disparu : le transfert inter-établissements est désormais
// qualifié en amont, et `p2_article_80_situation_specifique` n'existe plus.
// Ces deux cas sont donc remplacés par les deux natures de transfert.

import { describe, expect, it } from "vitest";
import { evaluerLeCas, type OptionsDuLivrable } from "./livrable";
import { type Cas, rejouerLaMatrice } from "./matrice";
import { moteurDeTest } from "./moteur";
import { CHARGE_ETABLISSEMENT, DAP, PMT, PRO } from "./situations";

const TRANSFERT = {
  p2_raison_principale:
    "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
  p2_transfert_en_cours: "oui",
};

const MODE_MEDICAL = {
  p1_autonomie: PRO,
  p1_critere_hygiene_desinfection: "oui",
  p1_critere_aucun: "non",
};

const matrice: Cas[] = [
  {
    id: "ARTICLE80-001 · transfert définitif",
    given: {
      ...MODE_MEDICAL,
      ...TRANSFERT,
      p2_nature_transfert: "'Définitif'",
    },
    expect: {
      p2_transport_charge_etablissement: true,
      cible_cas_final: CHARGE_ETABLISSEMENT,
      cible_regime_financement: "Établissement",
    },
  },
  {
    id: "ARTICLE80-002 · transfert provisoire",
    given: {
      ...MODE_MEDICAL,
      ...TRANSFERT,
      p2_nature_transfert: "'Provisoire'",
      p2_transfert_motif_detail: "'Imagerie médicale'",
    },
    expect: {
      p2_transport_charge_etablissement: true,
      cible_cas_final: CHARGE_ETABLISSEMENT,
      cible_regime_financement: "Établissement",
    },
  },
  {
    id: "ARTICLE80-003 · une exception rend le transport à l’Assurance Maladie",
    given: {
      ...MODE_MEDICAL,
      ...TRANSFERT,
      p2_nature_transfert: "'Définitif'",
      p2_exception_admission_had: "oui",
      p2_exception_aucune: "non",
    },
    expect: {
      // Le transport sort de la charge de l'établissement. Le régime, lui,
      // reste indécis : l'admission en HAD déduit le lieu de départ, dont le nom
      // n'est pas renseigné ici, et le résultat n'est donc pas encore affichable.
      p2_transport_charge_etablissement: false,
    },
  },
  {
    id: "PENITENTIAIRE-001",
    given: {
      ...MODE_MEDICAL,
      p2_contexte_retour_penitentiaire: "oui",
      p2_contexte_aucun: "non",
      // Le retour pénitentiaire déduit le lieu de départ — une structure de
      // soins, qui porte un nom — et contraint l'arrivée.
      p2_depart_nom_lieu: "'Centre hospitalier de départ'",
      p2_trajet_arrivee: "'Établissement pénitentiaire'",
      p2_arrivee_nom_lieu: "'Maison d’arrêt'",
    },
    expect: {
      p2_transport_charge_etablissement: false,
      cible_cas_final: PMT,
      cible_regime_financement: "Assurance Maladie",
    },
  },
];

describe("la charge de l’établissement", () => {
  rejouerLaMatrice(matrice);

  // ARTICLE80-002 et ARTICLE80-003 de la v9.5.1 distinguaient deux transports à
  // la charge de l'établissement par un drapeau que le modèle ne porte plus.
  // Ce test constate sa disparition : le jour où l'éditeur le rouvre, il faudra
  // rétablir les deux cas « détenu » que ce fichier portait.
  it("ne distingue plus les situations spécifiques de l’Article 80", () => {
    expect(
      "p2_article_80_situation_specifique" in moteurDeTest({}).getParsedRules(),
    ).toBe(false);
  });
});

// Les cas nommés de la matrice v9.7 sur ce sujet. Ils passent par les options du
// livrable (`livrable.ts`) plutôt que par notre vocabulaire : ce sont ses
// situations, et ses attendus.

// Un transfert qualifié met le transport à la charge de l'établissement — c'est
// la qualification positive que la v9.7 demande, là où la v9.5.1 la déduisait de
// l'hospitalisation du patient.
const TRANSFERT_DU_LIVRABLE: OptionsDuLivrable = {
  transfer: true,
  reason: "Séance de chimiothérapie",
  m0: { p1_m0_seance_chimiotherapie: "oui" },
};

/**
 * Les huit exceptions qui rendent le transport à l'Assurance Maladie malgré le
 * transfert. Sept donnent une prescription ; l'avion ou le bateau appelle en plus
 * un accord préalable, et c'est la seule à le faire.
 */
const EXCEPTIONS: ReadonlyArray<[nom: string, attendu: string]> = [
  ["aide_medicale_urgente", PMT],
  ["avion_bateau", DAP],
  ["had_hors_protocole", PMT],
  ["usld", PMT],
  ["ehpad", PMT],
  ["radiotherapie_moins_48h", PMT],
  ["dialyse_domicile", PMT],
  ["admission_had", PMT],
];

// v9.7.3 : trois exceptions exigent un fait de plus pour tenir. Une exception
// EHPAD ou USLD veut un lieu de ce type sur le trajet (TS973-07). L'exception
// radiothérapie veut une séance déclarée en partie médicale (TS973-08). Sans
// eux, le résultat est bloqué, et plus une PMT.
const FAITS_EXIGES_EN_V9_7_3: Record<string, OptionsDuLivrable> = {
  usld: { depart: "USLD" },
  ehpad: { depart: "EHPAD" },
  radiotherapie_moins_48h: {
    reason: "Examen médical",
    m0: { p1_m0_seance_radiotherapie: "oui" },
  },
};

describe("matrice du livrable — l’Article 80 et ses exceptions", () => {
  it("ARTICLE80-POSITIF — un transfert déclaré suffit", () => {
    const moteur = evaluerLeCas({ transfer: true });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      CHARGE_ETABLISSEMENT,
    );
  });

  it.each(EXCEPTIONS)("ARTICLE80-EXCEPTION-%s", (nom, attendu) => {
    const moteur = evaluerLeCas({
      ...TRANSFERT_DU_LIVRABLE,
      ...FAITS_EXIGES_EN_V9_7_3[nom],
      exceptions: { [`p2_exception_${nom}`]: "oui" },
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(attendu);
  });
});

// JULIEN-RETOUR-1 et 2 sont **synthétiques** : l'éditeur reproduit par eux deux
// mécanismes qu'il décrit — un Article 80 trop large, et un refus trop précoce —
// sans avoir pu joindre les situations d'origine. Le guide demande de rejouer
// les vraies dès qu'elles seront disponibles.
describe("matrice du livrable — les deux retours de Julien, reproduits", () => {
  it("JULIEN-RETOUR-1 — une séance seule ne met pas le transport à la charge de l’établissement", () => {
    const moteur = evaluerLeCas({
      reason: "Séance de chimiothérapie",
      m0: { p1_m0_seance_chimiotherapie: "oui" },
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(PMT);
    expect(moteur.evaluate("p2_transport_charge_etablissement").nodeValue).toBe(
      false,
    );
  });

  it("JULIEN-RETOUR-2 — la distance est recueillie avant tout refus", () => {
    // Le refus trop précoce fermait le parcours avant la distance : au-delà de
    // 150 km, c'est un accord préalable qui doit être conclu, et non un refus.
    const moteur = evaluerLeCas({ distance: 2 });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
  });
});
