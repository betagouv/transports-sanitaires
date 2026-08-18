import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { PDFCheckBox, PDFDocument, PDFName, PDFTextField } from "pdf-lib";
import { makeEngine } from "../simulateur/engine.ts";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { IDENTITÉ, MODE_TRANSPORT, PRESCRIPTION, SITUATION, TRAJET } from
  "../../front/cerfa/champs-cerfa.ts";
import { remplirCerfa } from "../../front/cerfa/remplir-cerfa.ts";
import {
  CerfaNonApplicable,
  saisiesDepuisSituation,
} from "../../front/cerfa/depuis-simulateur.ts";

const GABARIT = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../front/cerfa/gabarit/cerfa-11574-07.pdf",
  ),
);

/** Relit un PDF rempli et rend `{ nom du champ → valeur }`, champs vides exclus. */
async function relire(pdf: Uint8Array): Promise<Record<string, string>> {
  const formulaire = (await PDFDocument.load(pdf)).getForm();
  const lu: Record<string, string> = {};
  for (const champ of formulaire.getFields()) {
    if (champ instanceof PDFTextField) {
      const texte = champ.getText();
      if (texte) lu[champ.getName()] = texte;
    } else if (champ instanceof PDFCheckBox) {
      const état = champ.acroField.dict.get(PDFName.of("V"));
      if (état) lu[champ.getName()] = état.toString();
    }
  }
  return lu;
}

const engine = () => makeEngine();
const situation = (entrées: Record<string, string>) => ({ ...BASE_NEUTRE, ...entrées });

describe("gabarit CERFA n° 11574*07", () => {
  it("est un formulaire interactif dont les champs couvrent les deux volets", async () => {
    const document = await PDFDocument.load(GABARIT);
    const champs = document.getForm().getFields();

    expect(document.getPageCount()).toBe(4);
    expect(champs.length).toBe(53);

    // L'essentiel des champs porte un widget sur le Volet 1 (p3) **et** le Volet 2
    // (p4) : c'est ce qui permet de remplir les deux volets en une seule écriture.
    const partagés = champs.filter((c) => c.acroField.getWidgets().length >= 2);
    expect(partagés.length).toBeGreaterThan(45);
  });

  it("n'expose les éléments d'ordre médical que sur le Volet 1", async () => {
    const document = await PDFDocument.load(GABARIT);
    const pages = document.getPages().map((p) => p.ref);
    const champ = document.getForm().getField(PRESCRIPTION.élémentsOrdreMédical);

    const numéros = champ.acroField.getWidgets().map((w) => pages.indexOf(w.P()) + 1);
    expect(numéros).toEqual([3]); // jamais sur le Volet 2, envoyé à l'organisme
  });
});

describe("remplirCerfa", () => {
  it("écrit textes et cases, et les valeurs survivent à une relecture", async () => {
    const pdf = await remplirCerfa(GABARIT, [
      { champ: IDENTITÉ.bénéficiaireNomPrénom, texte: "DUPONT Marie" },
      { champ: IDENTITÉ.bénéficiaireNIR, texte: "2650175116005" },
      { case: MODE_TRANSPORT.brancardagePortage },
    ]);

    expect(await relire(pdf)).toMatchObject({
      [IDENTITÉ.bénéficiaireNomPrénom]: "DUPONT Marie",
      [IDENTITÉ.bénéficiaireNIR]: "2650175116005",
      [MODE_TRANSPORT.brancardagePortage.nom]: "/On",
    });
  });

  it("distingue les deux états d'un faux-radio partageant un même champ", async () => {
    const exonérante = await remplirCerfa(GABARIT, [{ case: SITUATION.aldExonérante }]);
    const nonExonérante = await remplirCerfa(GABARIT, [{ case: SITUATION.aldNonExonérante }]);

    // Même nom de champ, sémantique opposée : c'est l'état d'export qui tranche.
    expect(SITUATION.aldExonérante.nom).toBe(SITUATION.aldNonExonérante.nom);
    expect((await relire(exonérante))["ALD exo"]).toBe("/OUI");
    expect((await relire(nonExonérante))["ALD exo"]).toBe("/NON");
  });

  it("refuse une valeur plus longue que le champ plutôt que de la tronquer", async () => {
    // `clé` accepte 2 caractères : tronquer produirait une clé NIR fausse sur un
    // document opposable.
    await expect(
      remplirCerfa(GABARIT, [{ champ: IDENTITÉ.bénéficiaireClé, texte: "421" }]),
    ).rejects.toThrow(/accepte 2 caractères/);
  });

  it("aplatit les champs dont le cadre ne montre qu'une ligne", async () => {
    const pdf = await remplirCerfa(GABARIT, [
      { champ: IDENTITÉ.bénéficiaireAdresse, texte: "12 rue des Lilas\n35000 RENNES" },
    ]);
    // Un `\n` ici rognerait silencieusement la seconde ligne à l'impression.
    expect((await relire(pdf))[IDENTITÉ.bénéficiaireAdresse]).toBe(
      "12 rue des Lilas - 35000 RENNES",
    );
  });
});

describe("saisiesDepuisSituation", () => {
  it("coche l'ambulance et ses justifications, sans rien inventer d'autre", async () => {
    const saisies = saisiesDepuisSituation(
      engine(),
      situation({
        p1_motif_hospitalisation: "oui",
        p1_critere_position_allongee_demi_assise: "oui",
        p1_critere_brancardage_portage: "oui",
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      [SITUATION.entréeSortieHospitalisation.nom]: "/NON", // état d'export, pas « non »
      [MODE_TRANSPORT.positionAllongéeDemiAssise.nom]: "/On",
      [MODE_TRANSPORT.brancardagePortage.nom]: "/On",
    });
    // Justifications non retenues par le moteur : jamais cochées.
    expect(lu).not.toHaveProperty(MODE_TRANSPORT.oxygène.nom);
    expect(lu).not.toHaveProperty(MODE_TRANSPORT.asepsieRigoureuse.nom);
    // Le caractère exonérant de l'ALD n'est pas modélisé : la case reste vierge.
    expect(lu).not.toHaveProperty("ALD exo");
  });

  it("coche le transport assis et le fauteuil roulant pour un TPMR", async () => {
    const saisies = saisiesDepuisSituation(
      engine(),
      situation({
        p1_motif_hospitalisation: "oui",
        p1_critere_fauteuil_sans_transfert: "oui",
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      [MODE_TRANSPORT.assisProfessionnalisé.nom]: "/On",
      [MODE_TRANSPORT.fauteuilRoulantTPMR.nom]: "/On",
    });
  });

  it("reporte le trajet, l'urgence et l'accident issus de la Partie 2", async () => {
    const saisies = saisiesDepuisSituation(
      engine(),
      situation({
        p1_motif_hospitalisation: "oui",
        p1_critere_brancardage_portage: "oui",
        p2_trajet_aller_retour: "'Aller-retour'",
        p2_trajet_depart: "'Domicile'",
        p2_trajet_arrivee: "'Structure de soins'",
        p2_transport_urgence: "'Appel SAMU - Centre 15'",
        p2_nombre_transports_prevus: "3",
      }),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      [TRAJET.allerRetour.nom]: "/On",
      [TRAJET.départDomicile.nom]: "/On",
      [TRAJET.nombreTransportsItératifs]: "3",
      [PRESCRIPTION.urgenceSamu.nom]: "/On",
      [SITUATION.accidentTiersNon.nom]: "/NON",
    });
    // L'arrivée est une structure de soins : le type est connu, pas son adresse —
    // on ne coche donc pas « domicile » et on laisse le champ libre au prescripteur.
    expect(lu).not.toHaveProperty(TRAJET.arrivéeDomicile.nom);
    expect(lu).not.toHaveProperty(TRAJET.arrivéeStructureSoins);
  });

  it("laisse « transports itératifs » vide pour un transport en série", async () => {
    // La notice réserve cette rubrique aux transports répétés **ne correspondant
    // pas** à la définition du transport en série (≥ 4 sur deux mois, chacun à
    // plus de 50 km). Une série n'exige un accord préalable que si l'ALD n'est pas
    // validée : sous ALD validée elle reste une prescription, et arrive donc ici.
    const série = situation({
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_ald_incapacite_ou_deficience: "oui",
      p1_critere_position_allongee_demi_assise: "oui",
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    });

    // Le garde `CerfaNonApplicable` ne l'écarte pas : c'est bien une prescription.
    const moteur = engine();
    expect(moteur.setSituation(série).evaluate("p2_transport_en_serie").nodeValue).toBe(true);

    const lu = await relire(await remplirCerfa(GABARIT, saisiesDepuisSituation(engine(), série)));
    expect(lu).not.toHaveProperty(TRAJET.nombreTransportsItératifs);
  });

  it("produit un CERFA fourni depuis la seed « secretariat-prescription »", async () => {
    // Cette seed sert à voir le pré-remplissage : un document presque vide
    // n'apprendrait rien. On verrouille donc ce que sa situation doit couvrir.
    const saisies = saisiesDepuisSituation(
      engine(),
      situationDe(seedParId("secretariat-prescription")),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu).toMatchObject({
      // Deux motifs ouvrant droit cumulés.
      [SITUATION.entréeSortieHospitalisation.nom]: "/NON", // état d'export
      [SITUATION.accidentTravailMaladiePro.nom]: "/On",
      // Les cinq justifications d'ambulance.
      [MODE_TRANSPORT.positionAllongéeDemiAssise.nom]: "/On",
      [MODE_TRANSPORT.brancardagePortage.nom]: "/On",
      [MODE_TRANSPORT.surveillancePersonneQualifiée.nom]: "/On",
      [MODE_TRANSPORT.oxygène.nom]: "/On",
      [MODE_TRANSPORT.asepsieRigoureuse.nom]: "/On",
      // Trajet, urgence, accident, volumétrie.
      [TRAJET.allerRetour.nom]: "/On",
      [TRAJET.départDomicile.nom]: "/On",
      [TRAJET.nombreTransportsItératifs]: "3",
      [PRESCRIPTION.urgenceSamu.nom]: "/On",
      [SITUATION.accidentTiersOui.nom]: "/OUI",
    });
    expect(saisies).toHaveLength(12);
  });

  it("refuse de produire ce CERFA quand le cas final relève d'un autre document", () => {
    // Transport en série : le simulateur conclut à une demande d'accord préalable
    // (formulaire S3139), pas à cette prescription.
    const accordPréalable = situation({
      p1_motif_hospitalisation: "oui",
      p1_critere_brancardage_portage: "oui",
      p2_distance_aller_superieure_150km: "oui",
    });

    expect(() => saisiesDepuisSituation(engine(), accordPréalable)).toThrow(CerfaNonApplicable);
  });
});
