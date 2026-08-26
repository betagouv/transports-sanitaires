// Les modalités de transport dans la marche à suivre du patient : « organisez le
// transport avec… », « présentez la prescription au transporteur ».
//
// Elles sont choisies par un `Record` dont les clés sont les valeurs de
// `cible_transport_sanitaire_prescrit`. Un mode introuvable ne rend rien, et rien
// ne se voit : les deux transports assis ont porté des clés abrégées assez
// longtemps pour que la moitié des parcours perde ces phrases sans que personne
// le remarque. Ce fichier ferme les deux portes — les clés viennent bien du
// modèle, et chaque mode rend bien quelque chose à l'écran.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import {
  MODES_AVEC_MODALITE,
  MODES_SANS_MODALITE,
  ModalitesDAP,
  ModalitesPMT,
} from "../../front/simulateur/secretariat/modalites-transport";
import { ResultatFinal } from "../../front/simulateur/secretariat/ResultatFinal";

describe("les modes que le modèle nomme", () => {
  it("sont tous traités, et nommés comme lui les nomme", () => {
    // Un mode renommé en amont, ou un septième livré plus tard, doit échouer ici
    // plutôt que de vider silencieusement la marche à suivre.
    const duModele = possibilites("cible_transport_sanitaire_prescrit");
    const traites = [...MODES_AVEC_MODALITE, ...MODES_SANS_MODALITE];
    expect([...traites].sort()).toEqual([...duModele].sort());
  });
});

describe("chaque mode rend ses modalités", () => {
  // Les modes sont pris du **modèle**, et non de `MODES_AVEC_MODALITE` : partir de
  // la constante que le rendu emploie ferait un test tautologique, qui resterait
  // vert quand bien même aucune clé ne correspondrait plus.
  const MODES = possibilites("cible_transport_sanitaire_prescrit").filter(
    (mode) => !MODES_SANS_MODALITE.includes(mode as never),
  );

  it.each(MODES)("%s — prescription", (transport) => {
    render(
      <ul>
        <ModalitesPMT transport={transport} />
      </ul>,
    );
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it.each(MODES)("%s — accord préalable", (transport) => {
    render(
      <ul>
        <ModalitesDAP transport={transport} />
      </ul>,
    );
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });
});

describe("sur la Page Résultat 2", () => {
  // L'assertion qui aurait vu le défaut : le transport assis est le mode le plus
  // fréquent du catalogue, et c'est celui qui ne disait rien.
  it("un VSL sous accord préalable dit comment organiser le transport", () => {
    afficher("secretariat-serie-hors-ald");
    expect(
      screen.getByText(/Une fois l’accord obtenu, organisez le transport/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Présentez la demande au transporteur/),
    ).toBeInTheDocument();
  });

  it("un VSL sous prescription dit de la présenter au transporteur", () => {
    afficher("secretariat-urgence-pmt");
    expect(
      screen.getByText(/Présentez la prescription au transporteur/),
    ).toBeInTheDocument();
  });
});

// ---- implémentation ----

function afficher(id: string) {
  render(
    <ResultatFinal
      situation={situationDe(seedParId(id))}
      onNouvelleSimulation={() => {}}
    />,
  );
}

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, { "une possibilité"?: string[] } | undefined>;

/** Les possibilités d'une règle, débarrassées des quotes que le YAML leur met. */
function possibilites(regle: string): string[] {
  return (regles[regle]?.["une possibilité"] ?? []).map((v) => v.slice(1, -1));
}
