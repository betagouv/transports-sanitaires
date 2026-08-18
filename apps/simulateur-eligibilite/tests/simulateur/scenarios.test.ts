import { describe, it, expect } from "vitest";
import { makeEngine } from "./engine";
import { SEEDS } from "../../seeds/catalogue";
import { evaluerSeed } from "../../seeds/seed";

// Matrice de non-régression métier (règles plates v8.10). Elle n'a pas de scénarios
// à elle : elle rejoue le **catalogue de seeds** (`seeds/catalogue.ts`), qui est
// aussi ce qu'affiche la galerie dev. Ajouter une situation de référence, c'est
// donc l'ajouter au catalogue — elle devient du même geste testée et consultable.

const moteur = makeEngine();

describe("modèle v8.10 — le moteur confirme les attendus des seeds", () => {
  for (const seed of SEEDS) {
    it(seed.id, () => {
      const { manquantes, ecarts } = evaluerSeed(moteur, seed);
      // La base neutre répond à tout le questionnaire : aucune cible ne doit
      // rester indécise, sans quoi les attendus porteraient sur du vide.
      expect(manquantes, `${seed.id} — cibles à variables manquantes`).toEqual([]);
      expect(ecarts, `${seed.id} — écarts avec les attendus`).toEqual([]);
    });
  }
});

describe("modèle v8.10 — couverture des cas finaux", () => {
  it("les 9 cas finaux sont atteints par le catalogue", () => {
    const attendus = [
      "prescription médicale de transport",
      "demande accord préalable",
      "convocation ou avis audience",
      "transport charge établissement",
      "prestation non prise en charge par assurance maladie",
      "SMUR",
      "bariatrique seul",
      "permission sortie sans motif médical",
      "non éligible assurance maladie dans ce parcours",
    ];
    const couverts = new Set(
      SEEDS.map((seed) => evaluerSeed(moteur, seed).valeurs.cible_cas_final as string)
    );
    for (const cas of attendus) expect(couverts).toContain(cas);
  });
});

describe("modèle v8.10 — couverture des régimes de financement", () => {
  it("les 5 régimes sont atteints par le catalogue", () => {
    // L'axe sur lequel se lit une non-conformité : un transport dont le régime
    // n'est pas « assurance maladie » ne doit pas lui être facturé.
    const attendus = [
      "assurance maladie",
      "établissement prescripteur",
      "patient",
      "urgence spécifique",
      "à qualifier",
    ];
    const couverts = new Set(
      SEEDS.map((seed) => evaluerSeed(moteur, seed).valeurs.cible_regime_financement)
    );
    for (const régime of attendus) expect(couverts).toContain(régime);
  });

  it("distingue les deux volets de l'Article 80", () => {
    // Trois seeds concluent à une charge de l'établissement pour trois raisons
    // différentes : sans ces deux drapeaux, elles seraient indiscernables.
    const drapeaux = (id: string) => {
      const { valeurs } = evaluerSeed(moteur, SEEDS.find((s) => s.id === id)!);
      return [
        valeurs.cible_article_80_situation_specifique,
        valeurs.cible_article_80_permission_sortie_therapeutique,
      ];
    };
    expect(drapeaux("secretariat-detenu-inter-etablissements")).toEqual([true, false]);
    expect(drapeaux("secretariat-permission-therapeutique")).toEqual([false, true]);
    expect(drapeaux("secretariat-charge-etablissement")).toEqual([false, false]);
  });
});

describe("catalogue de seeds", () => {
  it("n'a ni identifiant ni libellé en double", () => {
    expect(new Set(SEEDS.map((s) => s.id)).size).toBe(SEEDS.length);
    expect(new Set(SEEDS.map((s) => s.libelle)).size).toBe(SEEDS.length);
  });

  it("ne déclare que des entrées connues du moteur", () => {
    // Une clé inconnue ferait lever `setSituation` au premier usage — en test comme
    // dans la galerie. On le dit ici, où le message pointe la seed fautive.
    const connues = new Set(Object.keys(makeEngine().getParsedRules()));
    for (const seed of SEEDS) {
      for (const clé of Object.keys(seed.entrees)) {
        expect(connues, `${seed.id} — entrée « ${clé} »`).toContain(clé);
      }
    }
  });

  it("annonce au moins le cas final et le régime de financement de chaque seed", () => {
    // C'est ce que la galerie affiche en colonne « Attendu » : une seed muette n'y
    // apprendrait rien, et ne verrouillerait rien non plus. Le régime est exigé de
    // toutes : c'est lui qui dit d'un mot si le transport est à la charge de
    // l'Assurance Maladie — donc si la situation est conforme ou non.
    for (const seed of SEEDS) {
      expect(seed.attendu.cible_cas_final, `${seed.id}`).toBeTruthy();
      expect(seed.attendu.cible_regime_financement, `${seed.id}`).toBeTruthy();
    }
  });
});
