// La configuration du serveur, lue et validée une fois au démarrage.
//
// Deux variables n'ont pas de valeur par défaut : `GRIST_API_KEY`, qui donne
// accès au référentiel, et `PSEUDONYMISATION_SECRET`, qui signe les refs
// envoyées à Matomo. En développement, leur absence se replie sur un référentiel
// factice et un secret public — c'est ce qui permet de lancer l'app sans secret.
// En production ce repli serait un mensonge : le serveur servirait des
// établissements inventés et signerait avec un secret que tout le monde peut
// lire. Là, on arrête le démarrage.
//
// Le schéma zod est donc double : le même socle de variables à défaut, et une
// variante de production où ces deux-là sont exigées. C'est lui qui porte la
// règle — ce fichier ne l'énonce pas deux fois.
//
// Voir le README § « Configuration » et docs/architecture/identification.md —
// ADR-5.

import { z } from "zod";

export type Env = Record<string, string | undefined>;

export type AccesGrist = { docUrl: string; cleApi: string };

export type Configuration = {
  port: number;
  /** Secret HMAC pseudonymisant l'identité prescripteur. */
  secret: string;
  /** Debug : refs Matomo en clair au lieu du HMAC. Jamais en production. */
  pseudonymesEnClair: boolean;
  /** Accès au doc Grist ; absent ⇒ référentiel snapshot factice (dev/CI). */
  grist: AccesGrist | undefined;
};

/** Ce que l'exploitant doit corriger : une variable par ligne, et pourquoi. */
export class ErreurDeConfiguration extends Error {
  readonly variables: string[];

  constructor(erreur: z.ZodError) {
    const lignes = erreur.issues.map(
      (probleme) => `  - ${String(probleme.path[0])} : ${probleme.message}`,
    );
    super(
      `Démarrage impossible — configuration invalide :\n${lignes.join("\n")}`,
    );
    this.name = "ErreurDeConfiguration";
    this.variables = erreur.issues.map((probleme) => String(probleme.path[0]));
  }
}

export function lireConfiguration(env: Env = process.env): Configuration {
  const schema = enProduction(env) ? EN_PRODUCTION : VARIABLES;
  const lu = schema.safeParse(sansValeursVides(env));
  if (!lu.success) throw new ErreurDeConfiguration(lu.error);
  const variables = lu.data;
  return {
    port: variables.PORT,
    secret: variables.PSEUDONYMISATION_SECRET ?? secretDeDeveloppement(),
    pseudonymesEnClair: enClair(variables.PSEUDONYMISATION_EN_CLAIR),
    grist: variables.GRIST_API_KEY
      ? { cleApi: variables.GRIST_API_KEY, docUrl: variables.GRIST_DOC_URL }
      : sansGrist(),
  };
}

// ---- implémentation ----

const DOC_URL_PAR_DEFAUT =
  "https://grist.numerique.gouv.fr/o/transports-sanitaires/api/docs/gbPomRAyU3M6P5NR6x6Qac";

// Les variables qui ont un défaut documenté (README § Configuration) : leur
// absence n'a jamais empêché personne de démarrer, et ne le doit pas.
const VARIABLES = z.object({
  PORT: z.coerce
    .number({ error: "doit être un numéro de port" })
    .int({ error: "doit être un entier" })
    .positive({ error: "doit être un entier positif" })
    .default(3000),
  GRIST_DOC_URL: z
    .url({ error: "doit être une URL" })
    .default(DOC_URL_PAR_DEFAUT),
  PSEUDONYMISATION_EN_CLAIR: z
    .string()
    .default("")
    .transform((flag) => ["true", "1", "oui"].includes(flag.toLowerCase())),
  GRIST_API_KEY: z.string().optional(),
  PSEUDONYMISATION_SECRET: z.string().optional(),
});

// En production, les deux variables sans défaut deviennent exigées. Le reste du
// schéma ne bouge pas : c'est la seule différence entre les deux environnements.
const SANS_DEFAUT =
  "sans valeur par défaut, elle doit être posée en production";

const EN_PRODUCTION = VARIABLES.extend({
  GRIST_API_KEY: z.string({ error: SANS_DEFAUT }),
  PSEUDONYMISATION_SECRET: z.string({ error: SANS_DEFAUT }),
});

// Scalingo fournit `PORT` et pose `NODE_ENV=production`. C'est donc lui qui
// distingue le déploiement du poste de développement, sans variable de plus.
function enProduction(env: Env): boolean {
  return env.NODE_ENV?.trim() === "production";
}

// Une variable posée mais vide vaut une variable absente : `GRIST_API_KEY=` dans
// un `.env` recopié ne doit pas passer pour une clé, ni `GRIST_DOC_URL=` pour une
// URL. Les vides retirés, le schéma applique ses défauts et exige le reste.
function sansValeursVides(env: Env): Env {
  const remplies = Object.entries(env).filter(([, brut]) => brut?.trim());
  return Object.fromEntries(remplies.map(([nom, brut]) => [nom, brut?.trim()]));
}

function secretDeDeveloppement(): string {
  console.warn(
    "[simulateur] PSEUDONYMISATION_SECRET absente — secret de dev (non sécurisé).",
  );
  return "dev-secret-non-securise";
}

function sansGrist(): undefined {
  console.warn(
    "[simulateur] GRIST_API_KEY absente — référentiel snapshot (dev/fallback).",
  );
  return undefined;
}

// Mode debug (phase de test) : renvoie les refs en clair au lieu du HMAC pour les
// lire directement dans Matomo. ⚠️ Révèle des données brutes (dont nom/prénom) —
// à n'activer que hors production.
function enClair(actif: boolean): boolean {
  if (actif) {
    console.warn(
      "[simulateur] PSEUDONYMISATION_EN_CLAIR active — refs Matomo en clair (debug, hors prod).",
    );
  }
  return actif;
}
