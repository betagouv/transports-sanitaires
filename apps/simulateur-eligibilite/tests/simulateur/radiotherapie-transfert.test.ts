// L'exception radiothérapie et ses deux conditions : un transfert provisoire
// (TS973-06) et une séance déclarée en Partie 1 (TS973-08).
//
// TS973-06 (famille AUD-ROUTE-RADIO-DURATION) : l'exception radiothérapie
// réserve son financement Assurance Maladie au transfert provisoire de moins
// de 48 heures. Un transfert définitif ne doit plus en bénéficier.
//
// Déjà couvert par la recopie du modèle (ticket 1) et sa réplique app.
// `p2_radiotherapie_exception_possible` (regles.publicodes) exige déjà
// `p2_nature_transfert = 'Provisoire'`, ce qui rend déjà l'exception non
// applicable, donc masquée dans la mosaïque (`Mosaique.tsx` respecte
// `opt.applicable !== false`), dès que le transfert est définitif.
//
// Le moteur seul ne suffit pas à revalider une réponse déjà cochée avant ce
// changement : une fois `p2_exception_radiotherapie_moins_48h` inapplicable,
// publicodes l'évalue à `null` plutôt qu'à la valeur « oui » toujours
// présente dans la situation brute, et `p2_exceptions_selection_coherente`
// (qui compare cette valeur évaluée) reste donc vraie à tort. C'est
// `qualificationDeclarationsValide` (entrees-calculees.ts), qui lit la
// situation brute plutôt que le moteur, qui referme réellement cette faille
// et revalide à chaque recalcul. Ce fichier verrouille ce comportement
// plutôt que de le refaire.

import { describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur, vrai } from "../../front/simulateur/moteur";
import { estApplicable, evalue } from "./situations-v9-7-2";

const RADIOTHERAPIE_DECLAREE = {
  p1_m0_seance_radiotherapie: "oui",
  p1_m0_aucun: "non",
};
const TRANSFERT = {
  p2_raison_principale:
    "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
};
const EXCEPTION_RADIOTHERAPIE = {
  p2_exception_radiotherapie_moins_48h: "oui",
  p2_exception_aucune: "non",
};

describe("TS973-06 (famille AUD-ROUTE-RADIO-DURATION), exception réservée au transfert provisoire", () => {
  it.each([
    ["Provisoire", "oui"],
    ["Définitif", "non"],
  ] as const)(
    "transfert %s + exception radiothérapie cochée → qualification %s",
    (nature, attendu) => {
      const situation = {
        ...BASE_NEUTRE,
        ...TRANSFERT,
        ...RADIOTHERAPIE_DECLAREE,
        ...EXCEPTION_RADIOTHERAPIE,
        p2_nature_transfert: `'${nature}'`,
      };
      const calculee = avecEntreesCalculees(situation);
      expect(calculee.p2_qualification_declarations_valides).toBe(attendu);
    },
  );
});

describe("TS973-06, l'exception suit la nature du transfert en direct", () => {
  it("n'est pas proposée pour un transfert définitif", () => {
    expect(
      estApplicable(
        evalue({
          ...TRANSFERT,
          ...RADIOTHERAPIE_DECLAREE,
          p2_nature_transfert: "'Définitif'",
        }),
        "p2_exception_radiotherapie_moins_48h",
      ),
    ).not.toBe(true);
  });

  it("reste proposée pour un transfert provisoire avec séance déclarée", () => {
    expect(
      estApplicable(
        evalue({
          ...TRANSFERT,
          ...RADIOTHERAPIE_DECLAREE,
          p2_nature_transfert: "'Provisoire'",
        }),
        "p2_exception_radiotherapie_moins_48h",
      ),
    ).toBe(true);
  });
});

// TS973-08 (famille AUD-ROUTE-RADIO-M0) : l'exception radiothérapie ne peut
// pas contredire une partie médicale qui ne déclare aucune séance.
//
// Déjà couvert par la recopie du modèle (ticket 1) et sa réplique app, au même
// titre que le ticket 6. `p2_radiotherapie_exception_possible` exige aussi
// `p1_m0_seance_radiotherapie` : sans séance déclarée, l'exception est masquée
// et le secrétariat ne peut pas la cocher. La Partie 1 étant verrouillée dès
// l'entrée au secrétariat, la contradiction n'est pas atteignable dans le
// parcours. Si elle arrive quand même (seed, labo),
// `qualificationDeclarationsValide` la refuse et aucun document n'est produit.
//
// La reprise médicale du livrable n'est pas construite : voir
// `docs/knowledge/domain/page-resultat-administratif.md`.
//
// Deux tests pour la même contradiction, à deux niveaux : la garde app seule,
// puis le document, que la garde du modèle bloque aussi. Retirer la garde app
// ne fait échouer que le premier.

const SANS_SEANCE = {
  p1_m0_seance_radiotherapie: "non",
  p1_m0_aucun: "oui",
};

// La seed précise « Séance de radiothérapie », que `p2_transfert_precision_complete`
// refuse à juste titre sans séance déclarée. Une saisie libre, valide dans les
// deux cas, laisse la séance seule en cause.
const MOTIF_NEUTRE = "'Bilan de contrôle'";

describe("TS973-08 (famille AUD-ROUTE-RADIO-M0), exception réservée à la séance déclarée", () => {
  it("la garde refuse l'exception sans séance déclarée en Partie 1", () => {
    const calculee = avecEntreesCalculees({
      ...BASE_NEUTRE,
      ...TRANSFERT,
      ...SANS_SEANCE,
      ...EXCEPTION_RADIOTHERAPIE,
      p2_nature_transfert: "'Provisoire'",
    });
    expect(calculee.p2_qualification_declarations_valides).toBe("non");
  });

  it.each([
    ["déclarée", true, RADIOTHERAPIE_DECLAREE],
    ["non déclarée", false, SANS_SEANCE],
  ] as const)(
    "transfert provisoire, séance %s → document produit : %s",
    (_seance, attendu, partieMedicale) => {
      const situation = avecEntreesCalculees({
        ...situationDe(
          seedParId("secretariat-transfert-provisoire-radiotherapie"),
        ),
        ...partieMedicale,
        p2_transfert_motif_detail: MOTIF_NEUTRE,
      });
      const positionne = moteur.setSituation(situation);
      expect(vrai(positionne, "cible_resultat_2_affichable")).toBe(attendu);
    },
  );

  it("n'est pas proposée pour un transfert provisoire sans séance déclarée", () => {
    expect(
      estApplicable(
        evalue({
          ...TRANSFERT,
          ...SANS_SEANCE,
          p2_nature_transfert: "'Provisoire'",
        }),
        "p2_exception_radiotherapie_moins_48h",
      ),
    ).not.toBe(true);
  });
});
