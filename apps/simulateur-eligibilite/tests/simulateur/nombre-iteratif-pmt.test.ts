// TS973-13 : une PMT prescrite pour un seul trajet laisse vide la rubrique des
// transports itératifs. Le mapping v9.7.3 ne la remplit que si le nombre
// dépasse un (`when: cible_nombre_transports_document > 1`). Les nombres de la
// DAP et du S3141 gardent leurs propres règles.

import { describe, expect, it } from "vitest";
import { saisiesDepuisSituation } from "../../front/outils-produit/beta/cerfa/pmt/depuis-simulateur";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { moteur, texte } from "../../front/simulateur/moteur";
import { casesRetenues } from "../../front/simulateur/secretariat/resultat/cases-documentaires";
import { GABARIT, relire, remplirApresRevision } from "../cerfa/gabarit";
import { moteurDeTest } from "./moteur";

const ITERATIFS = /Nombre de transports itératifs/;

function positionneSur(seed: string) {
  return moteur.setSituation(situationDe(seedParId(seed)));
}

function casesDe(positionne: typeof moteur): string[] {
  return casesRetenues(
    texte(positionne, "cible_cas_final"),
    positionne,
  ).flatMap((groupe) => groupe.cases);
}

async function nombreSurLePdf(seed: string): Promise<string | undefined> {
  const saisies = saisiesDepuisSituation(
    moteurDeTest(),
    situationDe(seedParId(seed)),
  );
  return (await relire(await remplirApresRevision(GABARIT, saisies)))[
    "nbr transp"
  ];
}

describe("TS973-13, la checklist du Bloc 3", () => {
  it("EM-PMT-NOMBRE-ITERATIF-SEULEMENT : PMT à un seul trajet, pas de nombre itératif", () => {
    const positionne = positionneSur("secretariat-consultation-cardiologie");
    expect(texte(positionne, "cible_nombre_transports_document")).toBe("1");
    expect(casesDe(positionne).join(" ")).not.toMatch(ITERATIFS);
  });

  it("PMT répétée, hors série : le nombre est reporté", () => {
    expect(casesDe(positionneSur("secretariat-prescription"))).toContain(
      "Nombre de transports itératifs : 3.",
    );
  });

  it("EM-NOMBRE-DAP-ET-S3141-CONSERVE : la DAP garde son nombre, même à un seul trajet", () => {
    const positionne = positionneSur("secretariat-accord-prealable-distance");
    expect(texte(positionne, "cible_nombre_transports_document")).toBe("1");
    expect(casesDe(positionne)).toContain("Nombre de transports : 1.");
  });

  it("EM-NOMBRE-DAP-ET-S3141-CONSERVE : le S3141 garde son nombre de trajets par mois", () => {
    expect(casesDe(positionneSur("secretariat-permission-s3141"))).toContain(
      "Nombre de trajets par mois : 1.",
    );
  });
});

describe("TS973-13, le PDF", () => {
  it("PMT à un seul trajet : rubrique vide, même après une génération à trois", async () => {
    // Chaque génération repart du gabarit vierge : une ancienne valeur ne
    // survit pas d'un document à l'autre.
    expect(await nombreSurLePdf("secretariat-prescription")).toBe("3");
    expect(
      await nombreSurLePdf("secretariat-consultation-cardiologie"),
    ).toBeUndefined();
  });
});
