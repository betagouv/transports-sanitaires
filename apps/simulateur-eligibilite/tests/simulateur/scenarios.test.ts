import { describe, expect, it } from "vitest";
import { SEEDS } from "../../front/outils-produit/seeds/catalogue";
import {
  evaluerSeed,
  ouvreLeQuestionnaire,
} from "../../front/outils-produit/seeds/seed";
import { moteurDeTest } from "./moteur";

// Matrice de non-régression métier (règles plates v9.5.0). Elle n'a pas de scénarios
// à elle : elle rejoue le **catalogue de seeds** (`front/outils-produit/seeds/`), qui est
// aussi ce qu'affiche la galerie dev. Ajouter une situation de référence, c'est
// donc l'ajouter au catalogue — elle devient du même geste testée et consultable.

const moteur = moteurDeTest();

// Le catalogue porte deux natures de seed. Les **complètes** décident toutes
// leurs cibles et forment la matrice de non-régression. Celles qui **ouvrent le
// questionnaire** s'arrêtent volontairement en chemin : elles ne décident rien,
// et ne prétendent rien — ce sont des raccourcis vers un écran. Les confondre
// ferait porter les attendus des unes sur le vide des autres.
const COMPLETES = SEEDS.filter((seed) => !ouvreLeQuestionnaire(seed));
const ARRETS = SEEDS.filter(ouvreLeQuestionnaire);

describe("modèle v9.5.0 — le moteur confirme les attendus des seeds", () => {
  for (const seed of COMPLETES) {
    it(seed.id, () => {
      const { manquantes, ecarts } = evaluerSeed(moteur, seed);
      // La base neutre répond à tout le questionnaire : aucune cible ne doit
      // rester indécise, sans quoi les attendus porteraient sur du vide.
      expect(manquantes, `${seed.id} — cibles à variables manquantes`).toEqual(
        [],
      );
      expect(ecarts, `${seed.id} — écarts avec les attendus`).toEqual([]);
    });
  }
});

describe("modèle v9.5.0 — couverture des cas finaux", () => {
  it("les 9 cas finaux sont atteints par le catalogue", () => {
    const attendus = [
      "prescription médicale de transport",
      "demande d’accord préalable",
      "convocation ou avis d’audience",
      "transport à la charge de l’établissement",
      "prestation non prise en charge par l’Assurance Maladie",
      "SMUR",
      "bariatrique seul",
      "permission de sortie sans motif médical",
      "non éligible à une prise en charge par l’Assurance Maladie",
    ];
    const couverts = new Set(
      COMPLETES.map(
        (seed) => evaluerSeed(moteur, seed).valeurs.cible_cas_final as string,
      ),
    );
    for (const cas of attendus) expect(couverts).toContain(cas);
  });
});

describe("modèle v9.5.0 — couverture des régimes de financement", () => {
  it("les 5 régimes sont atteints par le catalogue", () => {
    // L'axe sur lequel se lit une non-conformité : un transport dont le régime
    // n'est pas « assurance maladie » ne doit pas lui être facturé.
    const attendus = [
      "Assurance Maladie",
      "établissement prescripteur",
      "patient",
      "urgence spécifique",
      "aucune prise en charge dans ce parcours",
    ];
    const couverts = new Set(
      COMPLETES.map(
        (seed) => evaluerSeed(moteur, seed).valeurs.cible_regime_financement,
      ),
    );
    for (const régime of attendus) expect(couverts).toContain(régime);
  });

  it("distingue les deux Article 80", () => {
    // Deux seeds concluent à une charge de l'établissement pour deux raisons
    // différentes : sans ce drapeau, elles seraient indiscernables. La v9.1 a
    // retiré le second volet (permission de sortie thérapeutique), devenu un cas
    // particulier médical qui tranche dès la Partie 1.
    const spécifique = (id: string) =>
      evaluerSeed(moteur, SEEDS.find((s) => s.id === id)!).valeurs
        .cible_article_80_situation_specifique;
    expect(spécifique("secretariat-detenu-inter-etablissements")).toBe(true);
    expect(spécifique("secretariat-charge-etablissement")).toBe(false);
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
    const connues = new Set(Object.keys(moteurDeTest().getParsedRules()));
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
    for (const seed of COMPLETES) {
      expect(seed.attendu.cible_cas_final, `${seed.id}`).toBeTruthy();
      expect(seed.attendu.cible_regime_financement, `${seed.id}`).toBeTruthy();
    }
  });
});

describe("seeds qui ouvrent le questionnaire", () => {
  it.each(ARRETS.map((seed) => seed.id))("%s s'arrête bien en chemin", (id) => {
    const seed = ARRETS.find((s) => s.id === id)!;
    // Une seed qui déciderait tout ouvrirait un résultat, quoi qu'elle déclare :
    // c'est la question laissée sans réponse qui la fait atterrir plus tôt.
    expect(
      evaluerSeed(moteur, seed).manquantes,
      `${id} — aucune cible indécise, le questionnaire n'aurait rien à demander`,
    ).not.toEqual([]);
    // Et rien à annoncer : ses cibles n'ont pas de valeur à confronter.
    expect(
      seed.attendu,
      `${id} — attendus sur une situation incomplète`,
    ).toEqual({});
    // La reprise passe par la passation, que seul le secrétariat lit.
    expect(
      seed.outil,
      `${id} — atterrissage impossible côté prescripteur`,
    ).toBe("secretariat");
  });
});
