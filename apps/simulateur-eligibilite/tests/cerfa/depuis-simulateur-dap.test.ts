// `saisiesDepuisSituation` de la DAP : ce que le modèle permet de déduire du
// formulaire S3139h, et ce qu'il se garde d'inventer. Chaque cas part d'une
// situation complète et relit le PDF produit, plutôt que d'inspecter les saisies
// intermédiaires.
//
// Les cas propres à la spec 0008 — le pré-remplissage branché sur le mapping
// documentaire — vont dans `depuis-simulateur-dap-mapping.test.ts`, séparé pour
// rester sous 300 lignes : ce fichier-ci garde les cas déjà couverts avant ce
// lot.

import { describe, expect, it } from "vitest";
import { CerfaNonApplicable } from "../../front/outils-produit/beta/cerfa/cerfa-non-applicable.ts";
import { saisiesDepuisSituation } from "../../front/outils-produit/beta/cerfa/dap/depuis-simulateur.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import {
  AIDE_PROFESSIONNEL,
  GABARIT_DAP,
  HOSPITALISATION,
  relire,
  remplirApresRevision,
  situation,
} from "./gabarit.ts";

/** Le PDF de la seed nommée, relu champ par champ. */
async function depuisLaSeed(id: string): Promise<Record<string, string>> {
  const saisies = saisiesDepuisSituation(
    moteurDeTest(),
    situationDe(seedParId(id)),
  );
  return relire(await remplirApresRevision(GABARIT_DAP, saisies));
}

const depuisLaSituation = async (entrées: Record<string, string>) =>
  relire(
    await remplirApresRevision(
      GABARIT_DAP,
      saisiesDepuisSituation(moteurDeTest(), situation(entrées)),
    ),
  );

describe("le motif de la demande", () => {
  // Les quatre motifs que le formulaire réunit sous le champ `km`, chacun avec la
  // seed qui l'atteint. C'est l'état d'export qui les distingue, et son nom ne dit
  // pas son sens : `/non` vaut « transports en série ».
  it.each([
    ["secretariat-accord-prealable-distance", "/Oui"], // plus de 150 km
    ["secretariat-serie-hors-ald", "/non"], // transports en série
    ["secretariat-camsp-cmpp", "/camsp"],
    ["secretariat-engagement-maternite-entree", "/engag"],
    ["secretariat-maternite-eloignee", "/engag"],
  ])("%s coche « km » en %s", async (seed, état) => {
    expect((await depuisLaSeed(seed)).km).toBe(état);
  });

  it("l’avion ou le bateau a son propre champ, et sa situation liée", async () => {
    const lu = await depuisLaSeed("secretariat-avion-bateau");
    expect(lu["bat ou av"]).toBe("/Oui");
    // La notice réserve le bloc « à quelle situation est liée le transport » au
    // seul avion ou bateau, et n'en admet qu'une : ici l'hospitalisation.
    expect(lu.sit).toBe("/Oui");
    expect(lu).not.toHaveProperty("km");
  });

  it("n’a pas de case pour le SAMSAH", async () => {
    // Le formulaire ne le prévoit pas : la rubrique ❶ part vierge, et le
    // prescripteur l'écrit à la main. On le verrouille pour que ce trou reste
    // visible plutôt que de passer pour un oubli.
    const lu = await depuisLaSeed("secretariat-samsah");
    expect(lu).not.toHaveProperty("km");
    expect(lu).not.toHaveProperty("bat ou av");
  });

  it("traite tous les motifs de DAP que le modèle porte", () => {
    // Un septième motif livré par une version ultérieure doit échouer ici plutôt
    // que de disparaître du formulaire sans bruit. `MOTIFS_DU_CHAMP_KM` et
    // consorts ont cédé la place à la forme générale de la décision 1
    // (spec 0008) : la garantie reste, portée directement ici plutôt que par des
    // constantes exportées du tableau de remplissage.
    const duModèle = Object.keys(moteurDeTest().getParsedRules()).filter(
      (règle) => règle.startsWith("cible_dap_motif_"),
    );
    const motifsDuChampKm = [
      "cible_dap_motif_longue_distance",
      "cible_dap_motif_serie",
      "cible_dap_motif_camsp_cmpp",
      "cible_dap_motif_engagement_maternite",
    ];
    const motifAvionBateau = "cible_dap_motif_avion_bateau";
    // Le SAMSAH n'a pas de case à lui sur ce gabarit — décision 2 de la spec
    // 0008 — et c'est nommé ici plutôt que déduit en creux.
    const motifsSansCase = ["cible_dap_motif_samsah"];
    const traités = [...motifsDuChampKm, motifAvionBateau, ...motifsSansCase];
    expect([...traités].sort()).toEqual([...duModèle].sort());
  });

  it("ne coche qu’un motif quand le formulaire ne peut pas les dire tous", async () => {
    // Le champ `km` porte quatre motifs et ne peut en dire qu'un. Le modèle, lui,
    // n'en laisse cumuler que deux : A3.1 (plus de 150 km) ferme A3.3 et A3.4, et
    // A3.3 ferme A3.4 — restent les deux situations de la même mosaïque A3.4, un
    // CAMSP et une maternité éloignée cochés ensemble.
    const lesDeux = {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      p1_critere_aucun: "non",
      ...HOSPITALISATION,
      // Deux mosaïques distinctes depuis la v9.7 : le CAMSP est une situation
      // spéciale, l'engagement maternité un contexte réglementaire. Chacune
      // demande donc qu'on décoche sa propre sortie exclusive.
      p2_special_camsp_cmpp: "oui",
      p2_special_aucune: "non",
      p2_contexte_engagement_maternite: "oui",
      p2_contexte_aucun: "non",
    };
    const moteur = moteurDeTest().setSituation(situation(lesDeux) as never);
    expect(moteur.evaluate("cible_dap_motif_camsp_cmpp").nodeValue).toBe(true);
    expect(
      moteur.evaluate("cible_dap_motif_engagement_maternite").nodeValue,
    ).toBe(true);

    // C'est le premier de l'ordre de la notice qui l'emporte : cocher un motif
    // vrai vaut mieux que n'en cocher aucun, ce qui laisserait la demande muette.
    expect((await depuisLaSituation(lesDeux)).km).toBe("/camsp");
  });
});

describe("le reste du formulaire", () => {
  it("reporte le mode de transport comme le fait la prescription", async () => {
    // La DAP vaut prescription médicale : la rubrique ❷ est celle de la PMT.
    const lu = await depuisLaSituation({
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_oxygene: "oui",
      p1_critere_brancardage_portage: "oui",
      p1_critere_aucun: "non",
      ...HOSPITALISATION,
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",

      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
    });

    expect(lu).toMatchObject({ oxy: "/Oui", branc: "/Oui" });
    expect(lu).not.toHaveProperty("pos all");
    expect(lu).not.toHaveProperty("vsl");
  });

  it("écrit le nombre de transports même pour une série", async () => {
    // Différence avec la PMT, dont la rubrique « transports itératifs » exclut
    // justement la série : ici, la série est l'un des motifs de la demande.
    expect((await depuisLaSeed("secretariat-serie-hors-ald"))["nom tra"]).toBe(
      "4",
    );
  });

  it("laisse vierges les rubriques que la caisse renseignera", async () => {
    // C'est ce qui distingue une demande d'une prescription : l'avis médical et
    // l'avis administratif se remplissent à réception, jamais ici.
    const lu = await depuisLaSeed("secretariat-accord-prealable-distance");
    for (const champ of ["acc", "ac ad", "motif", "date avis", "date avis ad"])
      expect(lu, champ).not.toHaveProperty(champ);
  });

  it("refuse de produire cette DAP quand le cas final relève d’un autre document", () => {
    expect(() =>
      saisiesDepuisSituation(
        moteurDeTest(),
        situationDe(seedParId("secretariat-prescription")),
      ),
    ).toThrow(CerfaNonApplicable);
  });
});
