// Ce qu'est un document CERFA du parcours, et comment on le produit.
//
// Deux formulaires en sont : la prescription médicale de transport et la demande
// d'accord préalable. Ils ne diffèrent que par leur gabarit, leur tableau de
// remplissage et le cas final qui les ouvre — d'où ce descripteur, et un seul
// chemin de génération.
//
// **Entièrement dans le navigateur.** Ces formulaires réclament des données de
// santé nominatives (nom, NIR, date de naissance, adresse du patient). Aucune ne
// transite ici : le simulateur ne les connaît pas, et les blocs d'identité sortent
// volontairement vierges — le prescripteur les complète dans son lecteur PDF, les
// champs restant éditables. Générer côté front garantit qu'aucun document
// nominatif ne pourra, demain, transiter par le backend ou s'échouer dans un log.
//
// `pdf-lib` (~400 ko) et les gabarits (~750 ko et ~940 ko) ne sont chargés qu'au
// clic, par import dynamique et `fetch` de l'asset : le bundle initial est
// inchangé, et `scripts/verifier-bundle.ts` le vérifie.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import type { Saisie } from "./remplir-cerfa.ts";

export type DocumentCerfa = {
  /** Le cas final que le modèle doit conclure pour que ce formulaire s'applique. */
  readonly casFinal: string;
  /** Intitulé du formulaire, annoncé avant le clic. */
  readonly titre: string;
  /** Numéro CERFA, tel qu'il figure sur le document. */
  readonly numero: string;
  /** Racine du nom de fichier proposé au téléchargement. */
  readonly fichier: string;
  /**
   * Libellé du bouton, écrit en toutes lettres plutôt que composé : « télécharger
   * la prescription » et « télécharger la demande » ne s'accordent pas de la même
   * façon, et une phrase juste vaut mieux qu'un gabarit de phrase.
   */
  readonly libelléDuBouton: string;
  /** Ce que la simulation y a rempli. */
  readonly ceQuiEstRempli: string;
  /** Ce qui reste au prescripteur, annoncé avant d'ouvrir le PDF. */
  readonly ceQuiResteASaisir: string;
  /** Le gabarit vierge, servi comme un asset et chargé au clic. */
  readonly chargerGabarit: () => Promise<ArrayBuffer>;
  /** Les saisies déduites — importées au clic, elles tirent `pdf-lib`. */
  readonly chargerSaisies: () => Promise<
    (moteur: Engine<string>, situation: Situation<string>) => Saisie[]
  >;
};

export type OptionsGénération = {
  /**
   * Injectable pour les tests ; par défaut, l'asset servi par l'application. Le
   * document est passé en argument : il y en a deux, et un test qui les traverse
   * doit pouvoir servir le bon gabarit sans deviner lequel on lui demande.
   */
  readonly chargerGabarit?: (document: DocumentCerfa) => Promise<ArrayBuffer>;
};

/** Nom du fichier proposé au téléchargement, daté pour éviter les collisions. */
export function nomFichier(
  document: DocumentCerfa,
  le: Date = new Date(),
): string {
  const jour = [le.getFullYear(), le.getMonth() + 1, le.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("-");
  return `${document.fichier}-${jour}.pdf`;
}

/**
 * Produit le CERFA pré-rempli pour `situation`.
 *
 * @throws {CerfaNonApplicable} si la situation ne conduit pas à ce formulaire.
 */
export async function genererCerfa(
  document: DocumentCerfa,
  moteur: Engine<string>,
  situation: Situation<string>,
  options: OptionsGénération = {},
): Promise<Blob> {
  const [saisiesDepuisSituation, { remplirCerfa }] = await Promise.all([
    document.chargerSaisies(),
    import("./remplir-cerfa.ts"),
  ]);

  const saisies = saisiesDepuisSituation(moteur, situation);
  const gabarit = await (options.chargerGabarit
    ? options.chargerGabarit(document)
    : document.chargerGabarit());
  const pdf = await remplirCerfa(gabarit, saisies);

  // `pdf.buffer` est un ArrayBuffer que TypeScript type large : on repasse par la
  // vue pour rester dans le contrat de BlobPart.
  return new Blob([pdf as BlobPart], { type: "application/pdf" });
}

/** Déclenche le téléchargement d'un blob sous `nom`, puis libère l'URL objet. */
export function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const lien = window.document.createElement("a");
  lien.href = url;
  lien.download = nom;
  window.document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

/** Charge un gabarit servi comme asset de l'application. */
export async function gabaritDepuisLAsset(url: string): Promise<ArrayBuffer> {
  const réponse = await fetch(url);
  if (!réponse.ok) {
    throw new Error(`Gabarit CERFA indisponible (HTTP ${réponse.status}).`);
  }
  return réponse.arrayBuffer();
}
