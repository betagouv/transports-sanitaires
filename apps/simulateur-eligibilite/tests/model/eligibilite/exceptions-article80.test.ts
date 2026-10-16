// Les exceptions de l'article 80 (Q2.6.a et Q2.6) : leurs options, et le fait de
// chacune. Une exception proposée vaut « oui » cochée, « non » sinon. Une
// exception qui ne s'est pas proposée prend un prédicat structurel (D-106).

import { describe, expect, it } from "vitest";
import { cible } from "../../../front/models/eligibilite/evaluation-des-regles";
import { validatedQuestions } from "../../../front/socle/questionnaire-engine/asked-questions";
import {
  definitif,
  EXCEPTIONS,
  faits,
  pages,
  posee,
  proposees,
  provisoire,
  SEJOUR,
  URGENCES,
  valeurs,
} from "./reponses-du-transfert";

describe("une exception cochée", () => {
  const had = definitif(["5_HAD"]);

  it("vaut « oui », les autres « non », et l'article 80 s'applique", () => {
    expect(valeurs(had, EXCEPTIONS)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(cible(faits(had), "cible_exception_article80")).toBe(true);
  });

  it("garde la trace de la case cochée et de celle écartée", () => {
    expect(
      faits(had).fait_exception_article80_had_intercurrent.provenance,
    ).toBe("Q2.6 : « 5_HAD » cochée.");
    expect(faits(had).fait_exception_article80_usld.provenance).toBe(
      "Q2.6 : « 6_USLD » proposée, non cochée.",
    );
  });

  it("des exceptions cochées ensemble valent chacune « oui »", () => {
    const deux = definitif(["6_USLD", "9_DIALYSE_A_DOMICILE"]);
    expect(
      valeurs(deux, [
        "fait_exception_article80_usld",
        "fait_exception_article80_dialyse_domicile",
        "fait_exception_article80_ehpad",
      ]),
    ).toEqual([true, true, false]);
  });
});

describe("les options de Q2.6", () => {
  it("un transfert définitif depuis un séjour : ni 2, ni 8", () => {
    expect(proposees(definitif([]))).toEqual([
      "3_CENTRE_QUINZE",
      "4_AIR_MER",
      "5_HAD",
      "6_USLD",
      "7_EHPAD",
      "9_DIALYSE_A_DOMICILE",
      "10_ADMISSION_HAD",
    ]);
  });

  it("un transfert définitif sans séjour propose l'option 2, pas la 8", () => {
    const options = proposees(definitif([], URGENCES));
    expect(options).toContain("2_ADMISSION_SANS_SEJOUR");
    expect(options).not.toContain("8_RADIOTHERAPIE");
  });

  it("un transfert provisoire retire la 2 et propose la 8", () => {
    const options = proposees(provisoire([], URGENCES));
    expect(options).not.toContain("2_ADMISSION_SANS_SEJOUR");
    expect(options).toContain("8_RADIOTHERAPIE");
    expect(options).toContain("3_CENTRE_QUINZE");
  });

  it("un autre déplacement propose la 8, pas la 2 ni la 3", () => {
    const options = proposees({
      ...SEJOUR,
      "Q2.5": "2_AUTRE_DEPLACEMENT",
    });
    expect(options).toContain("8_RADIOTHERAPIE");
    expect(options).not.toContain("2_ADMISSION_SANS_SEJOUR");
    expect(options).not.toContain("3_CENTRE_QUINZE");
  });

  it("l'option « Aucune » est exclusive, et Q2.6 attend le type", () => {
    const sansType = { ...SEJOUR, "Q2.5": "1_TRANSFERT" } as const;
    expect(posee("P2/exceptions", "Q2.6.a", sansType)).toBeDefined();
    expect(posee("P2/exceptions", "Q2.6", sansType)).toBeUndefined();
    const question = posee("P2/exceptions", "Q2.6", definitif([]));
    expect(
      question?.kind === "multiple choice" && question.exclusiveOption?.value,
    ).toBe("11_AUCUNE");
  });

  it("une réponse que le type retire à l'écran est perdue à la validation", () => {
    const reponses = provisoire(["2_ADMISSION_SANS_SEJOUR"], URGENCES);
    expect(validatedQuestions(pages, reponses)["Q2.6"]).toBeUndefined();
    const valide = validatedQuestions(
      pages,
      definitif(["2_ADMISSION_SANS_SEJOUR"], URGENCES),
    );
    expect(valide["Q2.6"]?.answer).toEqual(["2_ADMISSION_SANS_SEJOUR"]);
  });
});

describe("ce que les exceptions non proposées valent", () => {
  it("l'option 2 est « non » avec un séjour initial coché", () => {
    expect(
      faits(definitif(["11_AUCUNE"]))
        .fait_exception_article80_admission_sans_sejour,
    ).toEqual({
      value: false,
      provenance: expect.stringMatching(/séjour initial/),
    });
  });

  it("l'option 2 est « non » pour un transfert provisoire", () => {
    const fait = faits(
      provisoire(["11_AUCUNE"], URGENCES),
    ).fait_exception_article80_admission_sans_sejour;
    expect(fait.value).toBe(false);
    expect(fait.provenance).toMatch(/transfert provisoire/);
  });

  it("l'option 2 est « non » pour un autre déplacement", () => {
    const autre = {
      ...SEJOUR,
      "Q2.5": "2_AUTRE_DEPLACEMENT",
      "Q2.6": ["11_AUCUNE"],
    } as const;
    expect(
      faits(autre).fait_exception_article80_admission_sans_sejour.value,
    ).toBe(false);
  });

  it("l'option 8 est « non » pour un transfert définitif", () => {
    const fait = faits(
      definitif(["11_AUCUNE"]),
    ).fait_exception_article80_radiotherapie;
    expect(fait.value).toBe(false);
    expect(fait.provenance).toMatch(/transfert définitif/);
  });

  it("l'option 8 cochée pour un transfert provisoire vaut « oui »", () => {
    expect(
      faits(provisoire(["8_RADIOTHERAPIE"], URGENCES))
        .fait_exception_article80_radiotherapie.value,
    ).toBe(true);
  });
});

describe("l'avion ou le bateau (Q2.3.2)", () => {
  // L'avion ou le bateau pose l'urgence en Q2.3.4, avant le transfert.
  const ligne = definitif(["11_AUCUNE"], {
    ...SEJOUR,
    "Q2.3.2": true,
    "Q2.3.4": "2_NON",
  });

  it("retire l'option 4 et rappelle la ligne régulière", () => {
    expect(proposees(ligne)).not.toContain("4_AIR_MER");
    expect(posee("P2/exceptions", "Q2.6", ligne)?.reminder).toBe(
      "Déjà indiqué : une partie du trajet se fera en avion ou en bateau de ligne régulière.",
    );
  });

  it("réutilise la ligne régulière sans revote : l'exception vaut « oui »", () => {
    expect(faits(ligne).fait_exception_article80_air_mer).toEqual({
      value: true,
      provenance: "Q2.3.2 : ligne régulière, réutilisée sans revote.",
    });
  });
});

describe("l'option 3, le Centre 15", () => {
  it("cochée, établit le transfert interétablissements et l'appel", () => {
    expect(
      valeurs(definitif(["3_CENTRE_QUINZE"]), [
        "fait_centre15_interetablissements",
        "fait_appel_centre15",
      ]),
    ).toEqual([true, true]);
  });

  it("proposée et non cochée, écarte les deux", () => {
    expect(
      valeurs(definitif(["11_AUCUNE"]), [
        "fait_centre15_interetablissements",
        "fait_appel_centre15",
      ]),
    ).toEqual([false, false]);
  });
});
