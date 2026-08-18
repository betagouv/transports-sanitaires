// Mode « labo » : valider un jeu de règles de test, l'activer pour ce navigateur
// seul, et retrouver les versions déjà essayées.
//
// Il permet au produit (PM) de **tester en autonomie** une nouvelle version du
// fichier de règles, sans passer par un développeur ni un déploiement. Rien n'est
// déployé, rien ne fuite aux autres utilisateurs. L'accès est **gardé** derrière
// l'identification, comme celui de la galerie de seeds : voir
// `../deverrouillage.ts`.

import yaml from "js-yaml";
import type { RawPublicodes } from "publicodes";
import Engine from "publicodes";

// Une version de règles chargée dans le labo. Le YAML brut est conservé tel quel
// (c'est lui qui alimente le moteur au boot).
export type VersionLabo = {
  nom: string;
  date: string; // ISO
  yaml: string;
};

export type ResultatValidation =
  | { ok: true; nbRegles: number }
  | { ok: false; erreur: string };

// Valide un document publicodes : syntaxe YAML puis cohérence des règles
// (références manquantes, cycles, etc.) via l'Engine. Reproduit
// `scripts/valider-regles.ts` pour un contenu en mémoire.
export function validerRegles(contenu: string): ResultatValidation {
  let rules: RawPublicodes<string>;
  try {
    rules = yaml.load(contenu) as RawPublicodes<string>;
  } catch (e) {
    const err = e as {
      message?: string;
      mark?: { line: number; column: number };
    };
    const position = err.mark
      ? ` (ligne ${err.mark.line + 1}, colonne ${err.mark.column + 1})`
      : "";
    return {
      ok: false,
      erreur: `Erreur YAML${position} : ${err.message ?? e}`,
    };
  }

  if (rules == null || typeof rules !== "object") {
    return { ok: false, erreur: "Le fichier ne contient aucune règle." };
  }

  try {
    new Engine(rules, OPTIONS_MOTEUR);
  } catch (e) {
    return { ok: false, erreur: `Règles invalides : ${(e as Error).message}` };
  }

  return { ok: true, nbRegles: Object.keys(rules).length };
}

/**
 * YAML des règles de test actives, ou `null` si le labo est inactif. Consommé par
 * `front/simulateur/moteur.ts` au boot : les règles officielles sont embarquées
 * dans le build, celles du labo vivent dans le `localStorage` de ce navigateur et
 * les remplacent quand elles sont présentes.
 */
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

export function historiqueLabo(): VersionLabo[] {
  try {
    const brut = localStorage.getItem(CLE_HISTORIQUE);
    const liste = brut ? (JSON.parse(brut) as VersionLabo[]) : [];
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

// ---- implémentation ----

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

const CLE_ACTIVE = "labo:regles-active";
const CLE_HISTORIQUE = "labo:historique";
const MAX_HISTORIQUE = 10;

// Mêmes options que l'app (cf. `front/simulateur/moteur.ts`) : le labo doit valider
// dans les conditions exactes où les règles tourneront.
const OPTIONS_MOTEUR = {
  flag: { filterNotApplicablePossibilities: true },
} as const;
