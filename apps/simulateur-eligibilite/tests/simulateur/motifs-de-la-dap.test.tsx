// Les motifs de l'accord préalable, tels que la Page Résultat 2 les restitue.
//
// Sept causes possibles, sept cibles du modèle — et sept seeds du catalogue, une
// par cause, plus une qui en cumule deux. La page doit nommer exactement celles
// qui ont déclenché la demande, ni plus, ni moins : le prescripteur les reporte
// sur le formulaire S3139, et l'application n'a pas le droit de les déduire
// elle-même. Elle lit les cibles, c'est tout.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, within } from "@testing-library/react";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { SEEDS } from "../../front/outils-produit/seeds/catalogue";
import { type Seed, situationDe } from "../../front/outils-produit/seeds/seed";
import { MOTIFS_DE_LA_DAP } from "../../front/simulateur/secretariat/motifs-de-la-dap";
import { ResultatFinal } from "../../front/simulateur/secretariat/ResultatFinal";

// La cause que chaque seed déclenche, désignée par ce qui la distingue dans le
// libellé du contrat d'interface.
const MOTIFS_ATTENDUS: Record<string, RegExp[]> = {
  "secretariat-accord-prealable-distance": [/plus de 150 km aller/i],
  "secretariat-serie-hors-ald": [/transports en série hors ALD/i],
  "secretariat-avion-bateau": [/avion ou bateau de ligne régulière/i],
  "secretariat-camsp-cmpp": [/CAMSP/],
  "secretariat-maternite-eloignee": [/dispositif Engagement maternité/i],
  "secretariat-samsah": [/SAMSAH/],
  "secretariat-accompagnement-tiers": [/assistance d’un tiers/i],
  "secretariat-dap-motifs-cumules": [
    /avion ou bateau de ligne régulière/i,
    /CAMSP/,
  ],
};

describe("motifs de l’accord préalable", () => {
  it.each(Object.entries(MOTIFS_ATTENDUS))("%s", (id, attendus) => {
    afficher(seedParId(id));
    const rendus = within(listeDesMotifs()).getAllByRole("listitem");
    expect(rendus).toHaveLength(attendus.length);
    for (const [rang, attendu] of attendus.entries())
      expect(rendus[rang]).toHaveTextContent(attendu);
  });

  it("couvre toutes les causes que le modèle calcule", () => {
    // Une cible `cible_dap_motif_*` livrée en amont doit passer par ici : sans
    // libellé dans l'application, elle n'atteint jamais l'écran, et sans seed
    // qui la déclenche, rien ne prouverait qu'elle y atteint.
    const calculees = Object.keys(regles).filter((nom) =>
      nom.startsWith("cible_dap_motif_"),
    );
    const nommees = MOTIFS_DE_LA_DAP.map(({ cible }) => cible);
    expect([...nommees].sort()).toEqual([...calculees].sort());
    expect(Object.keys(MOTIFS_ATTENDUS)).toHaveLength(nommees.length + 1);
  });

  it("aucun motif hors d’une demande d’accord préalable", () => {
    // Les cibles sont fausses partout ailleurs : le bloc ne doit alors pas
    // exister, plutôt que s'afficher vide.
    afficher(seedParId("secretariat-prescription"));
    expect(screen.queryByRole("list", { name: /motif ou motifs/i })).toBeNull();
  });
});

// ---- implémentation ----

function seedParId(id: string): Seed {
  const seed = SEEDS.find((candidate) => candidate.id === id);
  if (!seed) throw new Error(`seed inconnue : ${id}`);
  return seed;
}

function afficher(seed: Seed) {
  render(
    <ResultatFinal
      situation={situationDe(seed)}
      onNouvelleSimulation={() => {}}
    />,
  );
}

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, unknown>;

const listeDesMotifs = () =>
  screen.getByRole("list", { name: /motif ou motifs de l’accord préalable/i });
