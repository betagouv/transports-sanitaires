// `saisiesDepuisSituation` (S3141) : ce que le modèle permet de déduire de ce
// troisième CERFA, et ce qu'il se garde d'inventer — décisions 3, 4 et 5 de la
// spec 0009 comprises. Même couture que `depuis-simulateur-dap-mapping.test.ts` :
// moteur réel, tableau réel, situations construites sur la seed du catalogue.

import { describe, expect, it } from "vitest";
import { CerfaNonApplicable } from "../../front/outils-produit/beta/cerfa/cerfa-non-applicable.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { saisiesDepuisSituation } from "../../front/outils-produit/beta/cerfa/s3141/depuis-simulateur.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import {
  AIDE_PROFESSIONNEL,
  GABARIT_S3141,
  relire,
  situation,
} from "./gabarit.ts";

// La seed `secretariat-permission-s3141` du catalogue, recopiée ici : ce qui
// amène `cible_cas_final` sur « prescription S3141 » avant toute variante.
const S3141 = {
  p2_raison_principale: "'Permission temporaire de sortie'",
  p2_permission_age: "'De 16 à 19 ans'",
  p2_permission_rang_jour: "15",
  p2_permission_duree_heures: "8",
};

const depuisLaSituation = async (entrées: Record<string, string>) =>
  relire(
    await remplirCerfa(
      GABARIT_S3141,
      saisiesDepuisSituation(moteurDeTest(), situation(entrées)),
    ),
  );

describe("saisiesDepuisSituation — S3141 (0009)", () => {
  it("lève CerfaNonApplicable quand la situation ne conclut pas à « prescription S3141 »", () => {
    // La base neutre conclut sur une prescription médicale de transport.
    expect(() => saisiesDepuisSituation(moteurDeTest(), situation({}))).toThrow(
      CerfaNonApplicable,
    );
  });

  it("sort les dates de début d’hospitalisation et de fin de période en JJMMAAAA", async () => {
    const lu = await depuisLaSituation(S3141);
    // Huit cases, comme tous les champs de date de ce gabarit — aucun n'en fait
    // dix, à la différence de deux champs de la DAP.
    expect(lu["date deb hosp"]).toBe("05012026");
    expect(lu["dat freq per"]).toBe("31032026");
  });

  it("laisse « tr mois » vierge, décision 4", async () => {
    const lu = await depuisLaSituation(S3141);
    expect(lu).not.toHaveProperty("tr mois");
  });

  it("coche « all » en « /Oui » sur une position allongée, et rien d'autre n'écrit « all »", async () => {
    const lu = await depuisLaSituation({
      ...S3141,
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_position_allongee_demi_assise: "oui",
      p1_critere_aucun: "non",
    });
    expect(lu.all).toBe("/Oui");
    // L'ambulance ne coche ni le transport assis ni un moyen non professionnalisé.
    expect(lu).not.toHaveProperty("assis");
    expect(lu).not.toHaveProperty("mt");
  });

  it("coche « assis » pour un mode assis professionnalisé, et laisse « all » vierge", async () => {
    const lu = await depuisLaSituation({
      ...S3141,
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      p1_critere_aucun: "non",
    });
    expect(lu.assis).toBe("/Oui");
    expect(lu).not.toHaveProperty("all");
  });

  it("écrit « mt » en « /Oui » pour un moyen individuel", async () => {
    // La base neutre est un patient autonome : le mode individuel est le défaut,
    // sans qu'il faille répondre à la question du mode non professionnalisé.
    const lu = await depuisLaSituation(S3141);
    expect(lu.mt).toBe("/Oui");
  });

  it("écrit « mt » en « /non » pour un transport en commun, jamais les deux", async () => {
    const lu = await depuisLaSituation({
      ...S3141,
      p1_mode_non_professionnalise: "'Transports en commun'",
    });
    expect(lu.mt).toBe("/non");
  });

  it("coche « ald exo » sur une ALD validée exonérante", async () => {
    const lu = await depuisLaSituation({
      ...S3141,
      p1_autonomie:
        "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'",
      p1_m0_ald: "oui",
      p1_m0_aucun: "non",
      p1_type_ald: "'Exonérante'",
    });
    expect(lu["ald exo"]).toBe("/Oui");
  });

  it("coche « etm » et remplit « dat AT/MP » sur un accident du travail ou une maladie professionnelle", async () => {
    const lu = await depuisLaSituation({
      ...S3141,
      p2_contexte_at_mp: "oui",
      p2_contexte_aucun: "non",
      p2_date_at_mp: "'2026-02-10'",
    });
    expect(lu.etm).toBe("/Oui");
    expect(lu["dat AT/MP"]).toBe("10022026"); // huit cases, sans séparateur
  });

  it("écrit « exo » en « /Oui » ou « /non » selon l'exonération du ticket modérateur", async () => {
    // Le S3141 a sa propre mosaïque d'exonération (`p2_tm_s3141_*`), distincte
    // de celle de la DAP : `p2_tm_dap_*` ne s'applique que sur le formulaire DAP.
    const exonéré = await depuisLaSituation({
      ...S3141,
      p2_tm_s3141_acte: "oui",
      p2_tm_s3141_aucun: "non",
    });
    expect(exonéré.exo).toBe("/Oui");

    // Aucune situation particulière : la base neutre laisse `aucun` à « oui ».
    const nonExonéré = await depuisLaSituation(S3141);
    expect(nonExonéré.exo).toBe("/non");
  });

  it("ne porte aucun champ d'urgence, d'éléments médicaux ou de centre de référence", async () => {
    // Décision 5 : le livrable le répète deux fois, et le gabarit n'a d'ailleurs
    // pas de champ pour ces rubriques — un tableau qui en nommerait un
    // échouerait déjà au test de couverture de `remplissage.test.ts`.
    const lu = await depuisLaSituation(S3141);
    for (const champ of ["urgence_appel15", "comm évent", "malrare"])
      expect(lu).not.toHaveProperty(champ);
  });

  it("ne produit aucune saisie pour le bloc prescripteur ni le cadre transporteur", async () => {
    // Identité externe et cadre manuel : ces lignes n'ont pas de `source`, donc
    // `depuisLeMapping` les renvoie systématiquement au prescripteur ou au
    // transporteur plutôt que de les écrire.
    const lu = await depuisLaSituation(S3141);
    for (const champ of [
      "nom med",
      "rpps",
      "rais soc",
      "adress struct",
      "siret",
      "raison sociale",
      "adresse",
      "fait lieu",
      "dat fait le",
      "num ident transport",
    ])
      expect(lu).not.toHaveProperty(champ);
    // La date de prescription, elle, est posée par l'application hors mapping :
    // seul champ du bloc prescripteur que le simulateur écrit.
    expect(lu).toHaveProperty("dat pmt");
  });
});
