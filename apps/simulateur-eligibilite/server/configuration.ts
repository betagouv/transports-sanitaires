// La configuration du serveur, lue et validée une fois au démarrage.
//
// Une variable n'a pas de valeur par défaut : `GRIST_API_KEY`, qui donne accès au
// référentiel. En développement, son absence se replie sur un référentiel factice,
// ce qui permet de lancer l'app sans secret. En production ce repli serait un
// mensonge : le serveur servirait des établissements inventés. Là, on arrête le
// démarrage.
//
// Le schéma zod est donc double : le même socle de variables à défaut, et une
// variante de production où la clé est exigée. C'est lui qui porte la règle, ce
// fichier ne l'énonce pas deux fois.
//
// Voir le README § « Configuration » et docs/knowledge/adr/identification.md —
// ADR-5.

import { z } from "zod";

export type Env = Record<string, string | undefined>;

export type AccesGrist = { docUrl: string; cleApi: string };

export type Configuration = {
  port: number;
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
  GRIST_API_KEY: z.string().optional(),
});

// En production, la variable sans défaut devient exigée. Le reste du schéma ne
// bouge pas : c'est la seule différence entre les deux environnements.
const SANS_DEFAUT =
  "sans valeur par défaut, elle doit être posée en production";

const EN_PRODUCTION = VARIABLES.extend({
  GRIST_API_KEY: z.string({ error: SANS_DEFAUT }),
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

function sansGrist(): undefined {
  console.warn(
    "[simulateur] GRIST_API_KEY absente — référentiel snapshot (dev/fallback).",
  );
  return undefined;
}
