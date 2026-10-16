// Le type de `rules/catalogue-resultats.json`, les textes de R2 que l'éditeur
// livre à côté de ses règles. Le fichier est recopié tel quel (D-103) : ce type
// en décrit la forme, et son chargement (`../catalogue-resultats.ts`) vérifie,
// à la compilation, que le fichier livré la respecte.
//
// Les noms des champs sont ceux de l'éditeur.

/** Le catalogue : sa version, ses sources, et les textes de chaque issue. */
export type CatalogueResultats = {
  readonly schema: string;
  /** La version du modèle, celle de `rules/VERSION`. */
  readonly packageVersion: string;
  /** L'empreinte SHA-256 de `rules/regles.publicodes`. */
  readonly modelSha256: string;
  readonly sourceDate: string;
  readonly sources: Readonly<Record<string, Source>>;
  readonly issues: {
    readonly ISSUE_PMT: IssuePositive;
    readonly ISSUE_DAP_SANS_URGENCE: IssuePositive & { readonly intro: Intro };
    readonly ISSUE_DAP_URGENCE_ATTESTEE: IssuePositive & {
      readonly intro: Intro;
    };
    readonly ISSUE_S3141: IssuePositive & {
      readonly permissionPhrases: readonly Texte[];
      readonly permissionAdministrative: readonly Texte[];
    };
    readonly ISSUE_CAISSE: IssuePraticien & { readonly multipleIntro: string };
    readonly ISSUE_ETABLISSEMENT: IssuePraticien;
    readonly ISSUE_PERMISSION_PATIENT: IssuePraticien;
    readonly ISSUE_CONVOCATION: IssuePraticien;
    readonly ISSUE_NON_ELIGIBLE: IssueNegative;
    readonly ISSUE_DAP_ETRANGER_A_EXAMINER: IssueEtranger;
  };
  readonly badges: {
    /** Les badges de chaque critère de Q1.2, par son numéro au catalogue. */
    readonly criteria: Readonly<Record<string, readonly string[]>>;
    readonly nonShared: string;
    readonly bari: string;
  };
};

/** La page de l'éditeur d'où vient un texte, et son empreinte. */
type Source = {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly edited: string;
  readonly sha256: string;
  readonly blank?: boolean;
  readonly parent?: string;
};

/** Un texte, et les codes de contexte qui le choisissent. */
type TexteCode = {
  readonly id: string;
  readonly codes: readonly string[];
  readonly text: string;
};

type Texte = { readonly id: string; readonly text: string };
type Extra = { readonly code: string; readonly text: string };
type Bloc = { readonly title: string; readonly text: string };
type Intro = { readonly title: string; readonly subtitle: string };

/** Une carte de mode de transport, et les critères de Q1.2 qui la montrent. */
type Carte = {
  readonly id: string;
  readonly criteria: readonly number[];
  readonly mode: string;
  readonly nonShared: boolean;
  readonly bari: boolean;
  readonly title: string;
  readonly text: string;
};

/** La fiche patient d'une issue qui ouvre une prise en charge. */
type IssuePositive = {
  /** Le titre, par libellé de mode. */
  readonly titles: Readonly<Record<string, string>>;
  readonly prescriberTitles: readonly string[];
  readonly contexts: readonly TexteCode[];
  readonly contextExtras: readonly Extra[];
  readonly dapPhrases: readonly TexteCode[];
  readonly administrativeBases: readonly TexteCode[];
  readonly administrativeExtras: readonly Extra[];
  readonly administrativeDap: readonly TexteCode[];
  readonly modus: readonly {
    readonly mode: string;
    readonly alsoFor: readonly string[];
    readonly text: string;
    readonly particularities: string;
  }[];
  readonly cards: readonly Carte[];
  readonly fixedCards: readonly Bloc[];
  readonly cardPrefixes: Readonly<Record<string, string>>;
  /** Les définitions : par contexte (`id`), et les autres termes (`name`). */
  readonly lexicon: {
    readonly hospitalisation: readonly Texte[];
    readonly atmp: readonly Texte[];
    readonly other?: readonly {
      readonly name: string;
      readonly text: string;
    }[];
  };
  readonly finance: Bloc;
  readonly blueReminder: string | null;
};

/** Le résultat praticien : un scénario par situation à confirmer. */
export type IssuePraticien = {
  readonly type: string;
  readonly title: string;
  readonly scenarios: readonly ScenarioPraticien[];
};

/** Un scénario du résultat praticien, et les paramètres qui le choisissent. */
export type ScenarioPraticien = {
  readonly id: string;
  readonly label: string;
  readonly intro: string;
  readonly whyTitle: string;
  readonly whyText: string;
  readonly factsReference: string;
  readonly sourceKeys: readonly string[];
  readonly reason: string;
  readonly actions: readonly string[];
  /** Les paramètres du scénario ; `null` : il n'en demande pas la preuve. */
  readonly params: Readonly<Record<string, string | null>>;
  /** Un scénario inactif n'est jamais montré. */
  readonly inactive: boolean;
  readonly codes: readonly string[];
  readonly questions: readonly string[];
};

/** La fiche patient d'un transport qui n'est pas pris en charge. */
type IssueNegative = {
  readonly type: string;
  readonly title: string;
  readonly prescriberTitle: string;
  readonly reasons: readonly {
    readonly id: string;
    readonly condition: string;
    readonly priority: number;
    readonly text: string;
    readonly reason: string;
    readonly inactive: boolean;
  }[];
  readonly fixedCards: readonly Bloc[];
  readonly cardIntro: Bloc;
  readonly instructions: {
    readonly intro: Intro;
    readonly body: string;
    readonly steps: readonly string[];
  };
  readonly aldAdvice: string;
  readonly finance: Bloc;
};

/** Le transport à l'étranger, que la caisse examine. */
export type IssueEtranger = {
  readonly type: string;
  readonly title: string;
  readonly intro: string;
  readonly whyTitle: string;
  readonly whyItems: readonly {
    readonly title: string;
    readonly body: string;
  }[];
  readonly questions: readonly string[];
  readonly actions: readonly string[];
  readonly notice: string;
  readonly completeLabel: string;
  readonly support: string;
  readonly financeur: string;
  readonly reason: string;
  readonly publicationReview: string;
};
