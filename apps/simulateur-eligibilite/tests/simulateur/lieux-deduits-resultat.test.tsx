// TS973-11 : un lieu déduit du parcours est un fait, pas une saisie. Le
// Résultat 2 le montre avec son origine, sous les libellés du contrat v9.7.3
// (`results.resultat_2.derived_facts` du YAML UI, `CONTRAT-RESULTATS-v9-7-3.md`
// § 1). Le prescripteur y vérifie le lieu retenu, sans qu'il passe pour une
// réponse qu'il aurait donnée.

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";

beforeEach(() => sessionStorage.clear());

// `sansDepart` retire le type de départ de la base neutre : une sortie
// d'hospitalisation ne le pose jamais, et une réponse restée là ferait croire
// à un trajet domicile vers domicile.
function blocCorpsMedical(
  raison: string,
  depassements = {},
  sansDepart = false,
) {
  const { p2_trajet_depart, ...base } = BASE_NEUTRE;
  render(
    <Secretariat
      onNouvelleSimulation={() => {}}
      situationFinale={{
        ...(sansDepart ? base : BASE_NEUTRE),
        p2_raison_principale: `'${raison}'`,
        ...depassements,
      }}
    />,
  );
  const titre = screen.getByRole("heading", {
    name: /informations pour le corps médical/i,
  });
  return within(titre.closest(".fr-callout") as HTMLElement);
}

describe("TS973-11, le lieu déduit au Résultat 2", () => {
  it("montre la destination déduite d’un transport vers les urgences", () => {
    const bloc = blocCorpsMedical("Transport vers un service d’urgences");
    expect(
      bloc.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el.textContent ===
            "Type de lieu de destination : Structure de soins (déduit du transport vers un service d’urgences)",
      ),
    ).toBeInTheDocument();
  });

  it("montre la destination déduite d’une entrée en hospitalisation", () => {
    const bloc = blocCorpsMedical("Entrée en hospitalisation");
    expect(
      bloc.getByText(/déduit de l’entrée en hospitalisation/),
    ).toBeInTheDocument();
    expect(bloc.queryByText(/type de lieu de départ/i)).toBeNull();
  });

  it("montre le départ déduit d’une sortie d’hospitalisation", () => {
    const bloc = blocCorpsMedical(
      "Sortie d’hospitalisation",
      {
        p2_trajet_arrivee: "'Domicile'",
        p2_depart_nom_lieu: "'Hôpital Nord'",
      },
      true,
    );
    expect(
      bloc.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el.textContent ===
            "Type de lieu de départ : Structure de soins (déduit de la sortie d’hospitalisation)",
      ),
    ).toBeInTheDocument();
    expect(bloc.queryByText(/type de lieu de destination/i)).toBeNull();
  });

  it("ne montre rien quand les deux lieux ont été répondus", () => {
    const bloc = blocCorpsMedical("Consultation médicale");
    expect(bloc.queryByText(/type de lieu de/i)).toBeNull();
    expect(bloc.queryByText(/déduit/i)).toBeNull();
  });
});
