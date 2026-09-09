// La charge de l'établissement, part de la matrice de non-régression du livrable
// v9.7 (tmp/9.7/transports-sanitaires.tests.v9-7-0.yaml).
//
// L'Article 80 et le régime pénitentiaire ont ceci de commun qu'ils déplacent la
// charge du transport : l'Assurance Maladie n'en est plus le payeur, et le
// patient ne repart avec aucun document de sa part. Le reste de la matrice est
// dans `regression-v9-7.test.ts` et `accord-prealable-v9-7.test.ts`.
//
// La v9.7 a refondu la qualification. Un transfert ne se déduit plus de
// l'hospitalisation du patient : il se déclare, par la raison principale puis par
// sa nature — définitive ou provisoire. Et la branche « patient détenu », qui
// portait ARTICLE80-002 et ARTICLE80-003 avec leur drapeau de situation
// spécifique, a disparu : le transfert inter-établissements est désormais
// qualifié en amont, et `p2_article_80_situation_specifique` n'existe plus.
// Ces deux cas sont donc remplacés par les deux natures de transfert.

import { describe, expect, it } from "vitest";
import { type Cas, rejouerLaMatrice } from "./matrice";
import { moteurDeTest } from "./moteur";
import { CHARGE_ETABLISSEMENT, PMT, PRO } from "./situations-v9-7";

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

describe("modèle v9.7 — la charge de l’établissement", () => {
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
