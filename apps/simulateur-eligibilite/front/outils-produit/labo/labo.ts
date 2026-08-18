// Mode « labo » : permet au produit (PM) de **tester en autonomie** une nouvelle
// version du fichier de règles, sans passer par un développeur ni un déploiement.
//
// Principe : les règles officielles sont embarquées dans le build
// (`front/simulateur/engine.ts`). Le labo stocke un jeu de règles **de test** dans
// le `localStorage` du navigateur du PM ; au chargement, le moteur les utilise à la
// place des règles embarquées (cf. engine.ts). Rien n'est déployé, rien ne fuite aux
// autres utilisateurs (le `localStorage` est propre à chaque navigateur).
//
// L'accès au labo est **gardé** derrière l'identification, comme celui de la galerie
// de seeds : voir `../acces.ts`.

import Engine from "publicodes";
import type { RawPublicodes } from "publicodes";
import yaml from "js-yaml";

// Une version de règles chargée dans le labo. Le YAML brut est conservé tel quel
// (c'est lui qui alimente le moteur au boot).
export type VersionLabo = {
  nom: string;
  date: string; // ISO
  yaml: string;
};

const CLE_ACTIVE = "labo:regles-active";
const CLE_HISTORIQUE = "labo:historique";
const MAX_HISTORIQUE = 10;

const OPTIONS_ENGINE = { flag: { filterNotApplicablePossibilities: true } } as const;

// ---- Validation ----

export type ResultatValidation =
  | { ok: true; nbRegles: number }
  | { ok: false; erreur: string };

// Valide un document publicodes : syntaxe YAML puis cohérence des règles
// (références manquantes, cycles, etc.) via l'Engine — mêmes options que l'app.
// Reproduit `scripts/valider-regles.ts` pour un contenu en mémoire.
export function validerRegles(contenu: string): ResultatValidation {
  let rules: RawPublicodes<string>;
  try {
    rules = yaml.load(contenu) as RawPublicodes<string>;
  } catch (e) {
    const err = e as { message?: string; mark?: { line: number; column: number } };
    const position = err.mark
      ? ` (ligne ${err.mark.line + 1}, colonne ${err.mark.column + 1})`
      : "";
    return { ok: false, erreur: `Erreur YAML${position} : ${err.message ?? e}` };
  }

  if (rules == null || typeof rules !== "object") {
    return { ok: false, erreur: "Le fichier ne contient aucune règle." };
  }

  try {
    new Engine(rules, OPTIONS_ENGINE);
  } catch (e) {
    return { ok: false, erreur: `Règles invalides : ${(e as Error).message}` };
  }

  return { ok: true, nbRegles: Object.keys(rules).length };
}

// ---- État actif (consommé par engine.ts au boot) ----

/** YAML des règles de test actives, ou `null` si le labo est inactif. */
export function reglesLaboActives(): string | null {
  try {
    return lire()?.yaml ?? null;
  } catch {
    return null;
  }
}

/** Métadonnées de la version active (pour le bandeau), ou `null`. */
export function versionLaboActive(): VersionLabo | null {
  return lire();
}

export function laboActif(): boolean {
  return reglesLaboActives() !== null;
}

/** Active une version : la stocke et l'ajoute à l'historique. L'appelant recharge. */
export function activerLabo(version: VersionLabo): void {
  localStorage.setItem(CLE_ACTIVE, JSON.stringify(version));
  ajouterAHistorique(version);
}

/** Repasse aux règles officielles (l'historique est conservé). L'appelant recharge. */
export function desactiverLabo(): void {
  localStorage.removeItem(CLE_ACTIVE);
}

// ---- Historique ----

export function historiqueLabo(): VersionLabo[] {
  try {
    const brut = localStorage.getItem(CLE_HISTORIQUE);
    const liste = brut ? (JSON.parse(brut) as VersionLabo[]) : [];
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

// Ajoute (ou remonte) une version en tête de l'historique, dédupliquée par
// contenu YAML, plafonnée à MAX_HISTORIQUE.
function ajouterAHistorique(version: VersionLabo): void {
  const sansDoublon = historiqueLabo().filter((v) => v.yaml !== version.yaml);
  const liste = [version, ...sansDoublon].slice(0, MAX_HISTORIQUE);
  localStorage.setItem(CLE_HISTORIQUE, JSON.stringify(liste));
}

function lire(): VersionLabo | null {
  const brut = localStorage.getItem(CLE_ACTIVE);
  if (!brut) return null;
  const v = JSON.parse(brut) as VersionLabo;
  return v && typeof v.yaml === "string" ? v : null;
}
