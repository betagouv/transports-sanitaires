// La composition des éléments d'ordre médical (contrat EM-2, spec 0005), lue
// par la couture `saisiesDepuisSituation` sur le moteur réel : chaque
// parcours porte l'identifiant `EM-PARCOURS-*` du livrable. Les fonctions
// pures (dates, dédoublonnage, cas particuliers) sont testées à côté, dans
// `elements-medicaux-regles.test.ts`, pour tenir ce fichier sous 300 lignes.
//
// `EM-CONTRAT-CIBLES-EXISTANTES` est gardé par le type `CleDeRegle` et
// `tests/regles-front.test.ts` : les quatre clés que ce lot ajoute au contrat
// (`cible_motif_medical_deplacement`, `cible_justification_longue_distance`,
// `cible_convocation_type`, `p2_permission_speciale`) y sont confrontées au
// modèle. `EM-INDEPENDANT-DES-QUESTIONS` est porté par construction : les
// libellés de `CRITERES_MEDICAUX` sont des constantes de `libelles.ts`,
// jamais un intitulé lu sur le modèle.

import { describe, expect, it } from "vitest";
import { saisiesDepuisSituation as saisiesDap } from "../../front/outils-produit/beta/cerfa/dap/depuis-simulateur.ts";
import { CRITERES_MEDICAUX } from "../../front/outils-produit/beta/cerfa/elements-medicaux/libelles.ts";
import { saisiesDepuisSituation as saisiesPmt } from "../../front/outils-produit/beta/cerfa/pmt/depuis-simulateur.ts";
import type { Saisie } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";

const CHAMP_PMT = "comm évent";
const CHAMP_DAP = "elmedic";

function texteMédicalDe(saisies: readonly Saisie[], champ: string): string {
  const saisie = saisies.find((s) => s.champ === champ);
  return saisie && "texteMédical" in saisie ? saisie.texteMédical : "";
}

const PARCOURS_PMT = [
  [
    "EM-PARCOURS-PMT-AMBULANCE",
    "secretariat-prescription",
    "Entrée en hospitalisation",
  ],
  [
    "EM-PARCOURS-PMT-CONSULTATION",
    "secretariat-consultation-cardiologie",
    "Consultation de cardiologie",
  ],
  [
    "EM-PARCOURS-PMT-TEXTE-LIBRE",
    "secretariat-motif-texte-libre",
    "IRM de contrôle du genou.",
  ],
  [
    "EM-PARCOURS-PMT-RADIO",
    "secretariat-seance-radiotherapie",
    "Séance de radiothérapie",
  ],
  [
    "EM-PARCOURS-PMT-RARE",
    "secretariat-centre-reference-maladies-rares",
    "Orientation vers un autre centre de référence dédié à la maladie rare",
  ],
] as const;

const PARCOURS_DAP = [
  [
    "EM-PARCOURS-DAP-DISTANCE",
    "secretariat-accord-prealable-distance",
    "Justification du trajet de plus de 150 km",
  ],
  ["EM-PARCOURS-DAP-SAMSAH", "secretariat-samsah", "Transport vers le SAMSAH"],
  [
    "EM-PARCOURS-DAP-PERMISSION",
    "secretariat-permission-longue-distance",
    "Permission de sortie :",
  ],
  [
    "EM-PARCOURS-DAP-MATERNITE",
    "secretariat-maternite-eloignee",
    "Engagement maternité",
  ],
  [
    "EM-PARCOURS-DAP-PENSION",
    "secretariat-pension-militaire",
    "Soins dispensés au titre d’une pension militaire d’invalidité.",
  ],
] as const;

describe.each(PARCOURS_PMT)("%s", (_id, idDeLaSeed, attendu) => {
  it(`compose « ${attendu} » sur le PMT`, () => {
    const moteur = moteurDeTest();
    const situation = situationDe(seedParId(idDeLaSeed));
    const saisies = saisiesPmt(moteur, situation);
    expect(texteMédicalDe(saisies, CHAMP_PMT)).toContain(attendu);
  });
});

describe.each(PARCOURS_DAP)("%s", (_id, idDeLaSeed, attendu) => {
  it(`compose « ${attendu} » sur la DAP`, () => {
    const moteur = moteurDeTest();
    const situation = situationDe(seedParId(idDeLaSeed));
    const saisies = saisiesDap(moteur, situation);
    expect(texteMédicalDe(saisies, CHAMP_DAP)).toContain(attendu);
  });
});

it("CONV971-DAP-REFERENCE-CONVOCATION-ET-CONFIDENTIALITE", () => {
  // La v9.7.1 ajoute le bloc 3 pour la DAP issue d'une convocation à plus de
  // 150 km : le texte cite le type de convocation, puis la justification.
  const moteur = moteurDeTest();
  const situation = situationDe(
    seedParId("secretariat-convocation-longue-distance"),
  );
  const texte = texteMédicalDe(saisiesDap(moteur, situation), CHAMP_DAP);
  expect(texte).toContain(
    "Déplacement lié à la convocation : Convocation du contrôle médical de l’Assurance Maladie.",
  );
  expect(texte).toContain("Justification du trajet de plus de 150 km");
});

// `EM-S3141-SANS-RUBRIQUE` est porté à côté, dans
// `depuis-simulateur-s3141.test.ts` : c'est déjà là que vit le test « aucun
// champ d'urgence, d'éléments médicaux ou de centre de référence » sur le
// tableau du S3141.

it("EM-CONTRAT-CRITERES-EXHAUSTIFS", () => {
  const brut = moteurDeTest().getParsedRules().p1_criteres_transport
    ?.rawNode as { mosaique?: { options?: string[] } };
  expect(Object.keys(CRITERES_MEDICAUX)).toEqual(brut.mosaique?.options);
});

it("EM-ORDRE-INDEPENDANT-DE-LA-SERIALISATION", () => {
  // Composé depuis une situation, pas depuis un objet `answers` : l'ordre des
  // clés dans le littéral ne doit rien changer, la sortie suit toujours
  // l'ordre déclaré de `CRITERES_MEDICAUX`.
  const moteur = moteurDeTest();
  const enOrdre = situationDe(seedParId("secretariat-prescription"));
  const inversé = Object.fromEntries(Object.entries(enOrdre).reverse());
  const texteEnOrdre = texteMédicalDe(saisiesPmt(moteur, enOrdre), CHAMP_PMT);
  const texteInversé = texteMédicalDe(
    saisiesPmt(moteurDeTest(), inversé),
    CHAMP_PMT,
  );
  expect(texteEnOrdre).toBe(texteInversé);
});
