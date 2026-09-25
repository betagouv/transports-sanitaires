import { describe, expect, it } from "vitest";
import { SEEDS } from "../../front/outils-produit/seeds/catalogue";
import {
  evaluerSeed,
  ouvreLeQuestionnaire,
} from "../../front/outils-produit/seeds/seed";
import { moteurDeTest } from "./moteur";

// Matrice de non-régression métier (règles plates v9.5.1). Elle n'a pas de scénarios
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

describe("le moteur confirme les attendus des seeds", () => {
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

describe("couverture des cas finaux", () => {
  // La v9.7 en compte sept, contre neuf en v9.5.1. Elle a retiré « SMUR »,
  // « bariatrique seul » et « prestation non prise en charge » — les trois
  // sorties directes de la Partie 1 —, et ajouté la prescription S3141, que la
  // permission temporaire de sortie fait naître. La v9.7.1 en ajoute un
  // huitième : l'orientation vers la caisse, quand une convocation en avion ou
  // en bateau ne se rattache à aucune sous-situation de DAP.
  it("les 8 cas finaux sont atteints par le catalogue", () => {
    const attendus = [
      "prescription médicale de transport",
      "demande d’accord préalable",
      "prescription S3141",
      "convocation ou avis d’audience",
      "orientation vers la caisse pour accord préalable",
      "transport à la charge de l’établissement",
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

describe("couverture des régimes de financement", () => {
  it("les 5 régimes sont atteints par le catalogue", () => {
    // L'axe sur lequel se lit une non-conformité : un transport dont le régime
    // n'est pas « Assurance Maladie » ne doit pas lui être facturé. La v9.7 les
    // nomme d'un mot, et a retiré « urgence spécifique » avec le SMUR. La
    // v9.7.1 ajoute le régime propre à l'orientation caisse : la caisse
    // confirme encore les modalités, l'Assurance Maladie n'est pas exclue.
    const attendus = [
      "Assurance Maladie",
      "Assurance Maladie - modalités à confirmer auprès de la caisse",
      "Établissement",
      "Patient",
      "Absence de prise en charge Assurance Maladie",
    ];
    const couverts = new Set(
      COMPLETES.map(
        (seed) => evaluerSeed(moteur, seed).valeurs.cible_regime_financement,
      ),
    );
    for (const régime of attendus) expect(couverts).toContain(régime);
  });

  it("distingue les deux Article 80", () => {
    // Deux seeds concluent à une charge de l'établissement, par les deux
    // natures de transfert que la v9.7 distingue. Le drapeau qui les séparait
    // (`cible_article_80_situation_specifique`) a disparu du modèle : c'est
    // désormais la nature du transfert qui les distingue, et le cas final qui
    // les réunit.
    const casFinal = (id: string) =>
      evaluerSeed(moteur, SEEDS.find((s) => s.id === id)!).valeurs
        .cible_cas_final;
    expect(casFinal("secretariat-transfert-inter-etablissements")).toBe(
      "transport à la charge de l’établissement",
    );
    expect(casFinal("secretariat-transfert-provisoire")).toBe(
      "transport à la charge de l’établissement",
    );
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
