// Les cartes de mode et les badges d'une fiche patient positive (#135). Des
// fonctions pures de la trace, sans React.
//
// Les critères viennent de Q1.2, tels que les réponses les disent
// (`trace.criteres`) : jamais d'un critère déduit. Le partage et la corpulence
// viennent des cibles, qui les prouvent. Sans professionnel (un proche seul, ou
// le véhicule personnel), Q1.2 ne s'est pas posée : il n'y a ni critère ni
// badge. Les mots viennent du catalogue.

import type {
  CatalogueResultats,
  IssuePositive,
} from "./declarations/catalogue-resultats";
import type { Cibles } from "./declarations/cibles";
import type { Trace } from "./trace-du-resultat";
import { type Partage, partageDuTransport } from "./variante-du-resultat";

/** Une carte de la fiche, et si c'est celle de la situation du patient. */
export type CarteAffichee = {
  readonly titre: string;
  readonly texte: string;
  readonly retenue: boolean;
};

/**
 * Les trois cartes de mode. Celle de la situation du patient est détaillée
 * quand le catalogue a la carte de ses critères, et reste la carte fixe sinon.
 */
export function cartesDeLaFiche(
  issue: IssuePositive,
  trace: Trace,
): readonly CarteAffichee[] {
  const rang = rangDeLaCarte(trace.cibles);
  const detail = carteDetaillee(issue, trace);
  return issue.fixedCards.map(({ title, text }, index) => {
    const retenue = index === rang;
    return retenue && detail
      ? { titre: detail.title, texte: detail.text, retenue }
      : { titre: title, texte: text, retenue };
  });
}

/**
 * Les besoins à signaler au transporteur : le partage et le fauteuil, puis la
 * corpulence, puis les critères de Q1.2 dans l'ordre. Chacun exige le fait qui
 * le justifie.
 */
export function badgesDuResultat(
  badges: CatalogueResultats["badges"],
  trace: Trace,
): readonly string[] {
  const { cibles } = trace;
  const mode = cibles.cible_mode_id;
  if (!estSanitaire(mode)) return [];
  const fauteuil = cibles.cible_fauteuil_roulant === true;
  return [
    ...(mode !== "AMBULANCE" && partageDuTransport(cibles) === "incompatible"
      ? [badges.nonShared]
      : []),
    ...(fauteuil ? [badges.criteria["6"]?.[mode === "TPMR" ? 0 : 1]] : []),
    ...(cibles.cible_ambulance_equipement_bariatrique === true
      ? [badges.bari]
      : []),
    ...criteresDeLaCarte(trace)
      .filter((numero) => numero !== 6)
      .map((numero) => badgeDuCritere(badges, numero, mode)),
  ].filter((badge) => badge !== undefined);
}

// ---- implémentation ----

type ModeSanitaire = "TAP" | "TPMR" | "AMBULANCE";

// Les critères que porte la carte de chaque mode : 1 à 5 pour un VSL ou un
// taxi, avec le fauteuil (6) pour le TPMR, 6 à 11 pour l'ambulance.
const FAMILLES: Readonly<Record<string, readonly number[]>> = {
  TAP: [1, 2, 3, 4, 5],
  TPMR: [1, 2, 3, 4, 5, 6],
  AMBULANCE: [6, 7, 8, 9, 10, 11],
};

/**
 * Les critères de Q1.2 que la carte du mode peut porter. Le fauteuil est
 * ajouté s'il est prouvé : c'est le même fait que le critère 6.
 */
function criteresDeLaCarte(trace: Trace): readonly number[] {
  const famille = FAMILLES[trace.cibles.cible_mode_id ?? ""];
  if (!famille) return [];
  const fauteuil = trace.cibles.cible_fauteuil_roulant === true;
  const criteres = new Set(trace.criteres.filter((n) => famille.includes(n)));
  if (fauteuil && famille.includes(6)) criteres.add(6);
  return [...criteres].sort((a, b) => a - b);
}

function estSanitaire(mode: Cibles["cible_mode_id"]): mode is ModeSanitaire {
  return mode === "TAP" || mode === "TPMR" || mode === "AMBULANCE";
}

// Les cartes fixes vont du déplacement par ses propres moyens à l'ambulance.
function rangDeLaCarte(cibles: Cibles): number {
  if (cibles.cible_mode_id === "AMBULANCE") return 2;
  return estSanitaire(cibles.cible_mode_id) ? 1 : 0;
}

// Un critère de Q1.2 a un ou deux libellés. Le critère 2 en a deux : en TPMR, le
// fauteuil est déjà dit par son badge, il ne reste que l'assistance.
function badgeDuCritere(
  badges: CatalogueResultats["badges"],
  numero: number,
  mode: ModeSanitaire,
): string | undefined {
  const libelles = badges.criteria[String(numero)];
  return mode === "TPMR" ? (libelles?.[1] ?? libelles?.[0]) : libelles?.[0];
}

// La carte détaillée dont le mode, le partage, la corpulence et les critères
// sont exactement ceux de la trace. Un partage que les réponses ne disent pas
// n'a pas de carte : la carte fixe, qui n'en dit rien, reste.
function carteDetaillee(issue: IssuePositive, trace: Trace) {
  const { cibles } = trace;
  const mode = cibles.cible_mode_id;
  if (!estSanitaire(mode)) return undefined;
  const partage = partageDuTransport(cibles);
  if (mode !== "AMBULANCE" && partage === "inconnu") return undefined;
  const criteres = criteresDeLaCarte(trace);
  return issue.cards.find(
    (carte) =>
      carte.mode === mode &&
      carte.nonShared === nonPartage(mode, partage) &&
      carte.bari === (cibles.cible_ambulance_equipement_bariatrique === true) &&
      memesCriteres(carte.criteria, criteres),
  );
}

function nonPartage(mode: ModeSanitaire, partage: Partage): boolean {
  return mode !== "AMBULANCE" && partage === "incompatible";
}

function memesCriteres(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((numero, rang) => numero === b[rang]);
}
