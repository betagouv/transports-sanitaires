// Configuration de l'app d'identification.
//
// URL de base du simulateur vers lequel rediriger après identification.
// Résolue dans cet ordre (du plus « facile à changer » au moins) :
//   1. runtime — balise `<meta name="simulateur-url" content="…">` dans
//      `index.html` : modifiable directement sur l'artefact déployé, sans rebuild
//      (pratique pour l'embarquement iframe multi-environnements) ;
//   2. build — variable d'environnement Vite `VITE_SIMULATEUR_URL` (CI/CD) ;
//   3. défaut de développement.

const DEFAULT_SIMULATEUR_URL = "http://localhost:5173";

export function simulateurBaseUrl(): string {
  const runtime = document
    .querySelector<HTMLMetaElement>('meta[name="simulateur-url"]')
    ?.content.trim();
  if (runtime) return runtime;

  const buildTime = import.meta.env.VITE_SIMULATEUR_URL?.trim();
  if (buildTime) return buildTime;

  return DEFAULT_SIMULATEUR_URL;
}
