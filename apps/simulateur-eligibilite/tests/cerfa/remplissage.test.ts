// Les trois gabarits CERFA et l'écriture dedans : ce que les PDF acceptent, ce
// qu'ils refusent, ce qui survit à une relecture — et la couture entre chaque
// gabarit et son tableau de remplissage, qui doit le couvrir champ pour champ. La
// traduction d'une situation en saisies se teste à côté, dans
// `depuis-simulateur.test.ts`, `depuis-simulateur-dap.test.ts` et
// `depuis-simulateur-s3141.test.ts`. Les pièges propres au gabarit du S3141
// (décision 3 de la spec 0009) sont dans `remplissage-s3141.test.ts`, pour tenir
// ce fichier sous la limite de lignes.

import { PDFDocument, PDFTextField } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { REMPLISSAGE_DAP } from "../../front/outils-produit/beta/cerfa/dap/remplissage-dap.ts";
import { REMPLISSAGE_PMT } from "../../front/outils-produit/beta/cerfa/pmt/remplissage-pmt.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { saisiesDuTableau } from "../../front/outils-produit/beta/cerfa/remplissage.ts";
import {
  reponsesDe,
  VALEURS_COMPAREES,
} from "../../front/outils-produit/beta/cerfa/reponses.ts";
import { REMPLISSAGE_S3141 } from "../../front/outils-produit/beta/cerfa/s3141/remplissage-s3141.ts";
import { SEEDS } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import {
  GABARIT,
  GABARIT_DAP,
  GABARIT_S3141,
  relire,
  étatsDe,
} from "./gabarit.ts";

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
    const champ = document.getForm().getField("comm évent");

    const numéros = champ.acroField
      .getWidgets()
      // `P()` est optionnel dans pdf-lib ; un widget du gabarit CERFA porte
      // toujours sa page — sinon `indexOf` renverrait -1 et le test échouerait.
      .map((w) => pages.indexOf(w.P()!) + 1);
    expect(numéros).toEqual([3]); // jamais sur le Volet 2, envoyé à l'organisme
  });
});

describe("remplirCerfa", () => {
  it("écrit textes et cases, et les valeurs survivent à une relecture", async () => {
    const pdf = await remplirCerfa(GABARIT, [
      { champ: "N et P bénéficiaire", texte: "DUPONT Marie" },
      { champ: "N° immat bénéf", texte: "2650175116005" },
      { champ: "brancardage ou dun portage", coché: "On" },
    ]);

    expect(await relire(pdf)).toMatchObject({
      "N et P bénéficiaire": "DUPONT Marie",
      "N° immat bénéf": "2650175116005",
      "brancardage ou dun portage": "/On",
    });
  });

  it("distingue les deux états d'un faux-radio partageant un même champ", async () => {
    // Même nom de champ, sémantique opposée : c'est l'état d'export qui tranche.
    const exonérante = await remplirCerfa(GABARIT, [
      { champ: "ALD exo", coché: "OUI" },
    ]);
    const nonExonérante = await remplirCerfa(GABARIT, [
      { champ: "ALD exo", coché: "NON" },
    ]);

    expect((await relire(exonérante))["ALD exo"]).toBe("/OUI");
    expect((await relire(nonExonérante))["ALD exo"]).toBe("/NON");
  });

  it("refuse une valeur plus longue que le champ plutôt que de la tronquer", async () => {
    // `clé` accepte 2 caractères : tronquer produirait une clé NIR fausse sur un
    // document opposable.
    await expect(
      remplirCerfa(GABARIT, [{ champ: "clé", texte: "421" }]),
    ).rejects.toThrow(/accepte 2 caractères/);
  });

  it("aplatit les champs dont le cadre ne montre qu'une ligne", async () => {
    const pdf = await remplirCerfa(GABARIT, [
      { champ: "adresse", texte: "12 rue des Lilas\n35000 RENNES" },
    ]);
    // Un `\n` ici rognerait silencieusement la seconde ligne à l'impression.
    expect((await relire(pdf)).adresse).toBe("12 rue des Lilas - 35000 RENNES");
  });
});

describe("les tableaux de remplissage et leurs gabarits", () => {
  const TABLEAUX = [
    ["PMT", REMPLISSAGE_PMT, GABARIT, 53],
    ["DAP", REMPLISSAGE_DAP, GABARIT_DAP, 56],
    ["S3141", REMPLISSAGE_S3141, GABARIT_S3141, 46],
  ] as const;

  it.each(TABLEAUX)(
    "%s couvre les champs du formulaire, ni plus ni moins",
    async (_nom, tableau, gabarit, combien) => {
      // Un tableau est le seul inventaire des champs de son CERFA : c'est ce qui
      // permet d'y lire, pour chacun, comment il se remplit — ou qui le remplira.
      // Un champ absent passerait inaperçu, un nom mal recopié ferait lever
      // `pdf-lib` au clic du prescripteur, et pas avant.
      const champs = (await PDFDocument.load(gabarit))
        .getForm()
        .getFields()
        .map((champ) => champ.getName());

      expect(champs).toHaveLength(combien);
      expect(Object.keys(tableau).sort()).toEqual([...champs].sort());
    },
  );

  it("ne compare que des valeurs que le modèle déclare", () => {
    // Les tableaux recopient des libellés du modèle pour les comparer aux
    // réponses. Une reformulation livrée avec les règles laisserait sinon une case
    // durablement décochée, sans que rien ne le signale.
    const règles = moteurDeTest().getParsedRules();
    const brutDe = (nom: string) =>
      règles[nom]?.rawNode as
        | { "une possibilité"?: string[]; valeur?: unknown }
        | undefined;

    // Deux façons de déclarer ce qu'une règle peut rendre, et le modèle emploie
    // les deux. Une question énumère ses `une possibilité` ; une sortie calculée
    // les produit une par une, au fil de ses `variations`. La v9.7 calcule le
    // mode prescrit, là où la v9.5.1 l'énumérait.
    const litteraux = (valeur: unknown, vues = new Set<string>()): string[] => {
      if (typeof valeur === "string") {
        if (valeur.startsWith("'") && valeur.endsWith("'"))
          return [valeur.slice(1, -1)];
        if (!brutDe(valeur) || vues.has(valeur)) return [];
        vues.add(valeur);
        return [
          ...(brutDe(valeur)?.["une possibilité"] ?? []).map((v) =>
            v.slice(1, -1),
          ),
          ...litteraux(brutDe(valeur)?.valeur, vues),
        ];
      }
      if (Array.isArray(valeur))
        return valeur.flatMap((sous) => litteraux(sous, vues));
      if (valeur !== null && typeof valeur === "object")
        return Object.entries(valeur).flatMap(([cle, sous]) =>
          cle === "si" ? [] : litteraux(sous, vues),
        );
      return [];
    };

    for (const [règle, comparées] of VALEURS_COMPAREES) {
      const brut = brutDe(règle);
      // Les possibilités sont écrites entre quotes dans le YAML : on les ôte.
      const déclarées = new Set([
        ...(brut?.["une possibilité"] ?? []).map((v) => v.slice(1, -1)),
        ...litteraux(brut?.valeur),
      ]);
      for (const valeur of comparées)
        expect(déclarées, `${règle} — « ${valeur} »`).toContain(valeur);
    }
  });
});

describe("les champs qui portent plusieurs cases sous un même nom", () => {
  // Cocher, c'est écrire une valeur : ces champs-là ne peuvent dire qu'une de
  // leurs cases à la fois. Quelles cases, le nom de l'état ne le dit pas — `/non`
  // vaut « ALD exonérante » dans `sit` —, et c'est le tableau de remplissage qui
  // porte la correspondance, relevée sur les rectangles des widgets puis vérifiée
  // sur le rendu de la page. On fige ici le jeu d'états de chaque champ : un
  // gabarit remanié cocherait sinon la mauvaise case, en silence.
  it.each([
    ["km", ["Oui", "non", "camsp", "engag"]],
    ["sit", ["Oui", "non", "ald", "atmp"]],
    ["ti", ["Oui", "non"]],
    ["ald", ["Oui", "non"]],
    ["rap acc", ["Oui", "non"]],
    ["samu", ["Oui", "non"]],
    ["acc", ["Oui", "non", "ref"]],
    ["ETM", ["Oui", "NON"]],
  ])("DAP — « %s » sait rendre %j", async (champ, états) => {
    expect([...(await étatsDe(GABARIT_DAP, champ))].sort()).toEqual(
      [...états].sort(),
    );
  });

  it("PMT — les trois faux-radios gardent leurs états en majuscules", async () => {
    // La casse compte, et les deux gabarits ne s'accordent pas : `/OUI` ici,
    // `/Oui` sur la DAP. Écrire l'un pour l'autre laisserait la case vide.
    for (const champ of ["ALD exo", "oui1", "oui2"])
      expect([...(await étatsDe(GABARIT, champ))].sort(), champ).toEqual([
        "NON",
        "OUI",
      ]);
  });

  it("tout état qu'un tableau écrit, sur les seeds du catalogue, est connu de son champ", async () => {
    // Généralise le test précédent à l'ensemble des trois tableaux plutôt
    // qu'à leurs seuls faux-radios déjà connus : un champ dont l'état visé
    // n'existe pas sur le gabarit laisserait la case vide sans que rien ne
    // le signale avant le clic d'un prescripteur (`remplir-cerfa.ts` lève,
    // mais seulement à l'écriture).
    //
    // Un seul moteur, réinterrogé à chaque seed : le reconstruire à chaque
    // fois relit et recompile les règles depuis le disque, ce que 28 seeds
    // sur trois tableaux rend coûteux pour rien. Le tout reste plus lourd que
    // le reste du fichier : délai explicite plutôt que le défaut de 5 s.
    const moteur = moteurDeTest();
    const TABLEAUX = [
      ["PMT", REMPLISSAGE_PMT, GABARIT],
      ["DAP", REMPLISSAGE_DAP, GABARIT_DAP],
      ["S3141", REMPLISSAGE_S3141, GABARIT_S3141],
    ] as const;

    for (const [nom, tableau, gabarit] of TABLEAUX) {
      const étatsParChamp = new Map<string, Set<string>>();
      for (const seed of SEEDS) {
        const réponses = reponsesDe(moteur, situationDe(seed));
        for (const saisie of saisiesDuTableau(tableau, réponses)) {
          if (!("coché" in saisie)) continue;
          const états = étatsParChamp.get(saisie.champ) ?? new Set<string>();
          états.add(saisie.coché);
          étatsParChamp.set(saisie.champ, états);
        }
      }
      for (const [champ, états] of étatsParChamp) {
        const connus = await étatsDe(gabarit, champ);
        for (const état of états)
          expect(connus, `${nom} — « ${champ} » — /${état}`).toContain(état);
      }
    }
  }, 20_000);
});

describe("la taille des valeurs écrites", () => {
  it.each([
    ["PMT", GABARIT],
    ["DAP", GABARIT_DAP],
  ])("%s — tous les champs texte sont en Courier 10", async (_nom, gabarit) => {
    // `remplirCerfa` calcule si une valeur déborde de son cadre au lieu de la
    // mesurer : Courier est à chasse fixe, donc la largeur se déduit du nombre de
    // caractères. Le jour où un gabarit change de police, ce calcul devient faux
    // et une adresse repart rognée — d'où ce verrou sur l'hypothèse.
    const champs = (await PDFDocument.load(gabarit)).getForm().getFields();
    const polices = new Set(
      champs
        .filter((champ) => champ instanceof PDFTextField)
        .map((champ) => champ.acroField.getDefaultAppearance()),
    );
    expect([...polices]).toEqual(["/Cour 10 Tf 0 g"]);
  });

  it("réduit une adresse trop longue pour son cadre, et elle seule", async () => {
    // Le cadre de « arrivée struct soins » fait 182 points : une adresse composée
    // y dépasse largement, un nombre de transports non.
    const pdf = await remplirCerfa(GABARIT, [
      {
        champ: "arrivée struct soins",
        texte: "Centre hospitalier, 2 rue de l’Arrivée, 75002, Paris",
      },
      { champ: "nbr transp", texte: "3" },
    ]);
    const formulaire = (await PDFDocument.load(pdf)).getForm();
    // `pdf-lib` recompose l'apparence de tout champ écrit, dans sa police par
    // défaut — Courier n'étant pas des siennes. Ce qu'on regarde ici est la
    // taille, seule chose que le remplissage décide.
    const taille = (nom: string) => {
      const da = formulaire.getTextField(nom).acroField.getDefaultAppearance();
      return Number(/(\d+(?:\.\d+)?) Tf/.exec(da ?? "")?.[1]);
    };

    // Réduite jusqu'à tenir dans les 182 points du cadre.
    expect(taille("arrivée struct soins")).toBeLessThan(10);
    // L'autre garde celle du gabarit : en automatique, elle grossirait pour rien.
    expect(taille("nbr transp")).toBe(10);
  });
});
