// Génération du CERFA de prescription, **entièrement dans le navigateur**.
//
// Le formulaire réclame des données de santé nominatives (nom, NIR, date de
// naissance, adresse du patient). Aucune ne transite ici : le simulateur ne les
// connaît pas, et les blocs d'identité sortent volontairement vierges — le
// prescripteur les complète dans son lecteur PDF, les champs restant éditables.
// Générer côté front garantit qu'aucun document nominatif ne pourra, demain,
// transiter par le backend ou s'échouer dans un log.
//
// `pdf-lib` (~400 ko) et le gabarit (~750 ko) ne sont chargés qu'au clic, par
// import dynamique et `fetch` de l'asset : le bundle initial est inchangé.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import gabaritUrl from "./gabarit/cerfa-11574-07.pdf?url";

/** Nom du fichier proposé au téléchargement, daté pour éviter les collisions. */
export function nomFichier(le: Date = new Date()): string {
  const jour = [le.getFullYear(), le.getMonth() + 1, le.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("-");
  return `prescription-medicale-transport-${jour}.pdf`;
}

/** Charge le gabarit CERFA depuis les assets de l'application. */
export async function chargerGabarit(): Promise<ArrayBuffer> {
  const réponse = await fetch(gabaritUrl);
  if (!réponse.ok) {
    throw new Error(`Gabarit CERFA indisponible (HTTP ${réponse.status}).`);
  }
  return réponse.arrayBuffer();
}

export type OptionsGénération = {
  /** Injectable pour les tests ; par défaut, l'asset servi par l'application. */
  readonly chargerGabarit?: () => Promise<ArrayBuffer>;
};

/**
 * Produit le CERFA pré-rempli pour `situation`.
 *
 * Les modules de remplissage sont importés dynamiquement : ils n'entrent dans le
 * bundle que si l'utilisateur demande réellement le document.
 *
 * @throws {CerfaNonApplicable} si la situation ne conduit pas à ce CERFA.
 */
export async function genererCerfa(
  moteur: Engine<string>,
  situation: Situation<string>,
  options: OptionsGénération = {},
): Promise<Blob> {
  const [{ saisiesDepuisSituation }, { remplirCerfa }] = await Promise.all([
    import("./depuis-simulateur.ts"),
    import("./remplir-cerfa.ts"),
  ]);

  const saisies = saisiesDepuisSituation(moteur, situation);
  const gabarit = await (options.chargerGabarit ?? chargerGabarit)();
  const pdf = await remplirCerfa(gabarit, saisies);

  // `pdf.buffer` est un ArrayBuffer que TypeScript type large : on repasse par la
  // vue pour rester dans le contrat de BlobPart.
  return new Blob([pdf as BlobPart], { type: "application/pdf" });
}

/** Déclenche le téléchargement d'un blob sous `nom`, puis libère l'URL objet. */
export function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}
