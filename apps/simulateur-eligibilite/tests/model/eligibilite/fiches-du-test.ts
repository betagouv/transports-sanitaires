// Les aides des tests du texte de la fiche patient positive (#135) : des traces
// écrites à la main, et la lecture de la fiche qu'elles donnent.

import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import type { Cibles } from "../../../front/models/eligibilite/declarations/cibles";
import {
  type IssueAvecFichePositive,
  type TexteDeLaFichePositive,
  texteDeLaFichePositive,
} from "../../../front/models/eligibilite/texte-de-la-fiche-positive";
import type { Trace } from "../../../front/models/eligibilite/trace-du-resultat";
import { trace } from "./traces-du-praticien";

export const catalogue = await catalogueResultats();
export const pmt = catalogue.issues.ISSUE_PMT;
export const s3141 = catalogue.issues.ISSUE_S3141;

export type Ajouts = {
  readonly criteres?: readonly number[];
  readonly permissionRepeated?: boolean;
  readonly precisions?: Trace["precisions"];
};

const tracer = (cibles: Partial<Cibles>, ajouts: Ajouts = {}): Trace => ({
  ...trace(cibles, {}, ajouts.precisions),
  criteres: ajouts.criteres ?? [],
  ...(ajouts.permissionRepeated !== undefined && {
    permissionRepeated: ajouts.permissionRepeated,
  }),
});

export const fiche = (
  cibles: Partial<Cibles>,
  ajouts: Ajouts = {},
  issue: IssueAvecFichePositive = "ISSUE_PMT",
): TexteDeLaFichePositive | undefined =>
  texteDeLaFichePositive(catalogue, tracer(cibles, ajouts), issue);

export const puces = (texte: TexteDeLaFichePositive | undefined) =>
  texte?.consignes.etapes
    .flatMap(({ blocs }) => blocs)
    .flatMap((bloc) => (bloc.type === "liste" ? bloc.puces : [])) ?? [];

export const badges = (texte: TexteDeLaFichePositive | undefined) =>
  puces(texte).flatMap((puce) => puce.badges ?? []);

export const carteRetenue = (texte: TexteDeLaFichePositive | undefined) =>
  texte?.cartes.find((carte) => carte.retenue);

export const carteDuCatalogue = (id: string) => {
  const trouvee = pmt.cards.find((carte) => carte.id === id);
  if (!trouvee) throw new Error(`Carte inconnue : ${id}`);
  return trouvee.text;
};

export const TAP = { cible_mode_id: "TAP" } as const;
export const NON_PARTAGE = {
  cible_transport_partage_incompatible: true,
} as const;
export const PARTAGE = { cible_transport_partage_incompatible: false } as const;
export const TPMR = {
  cible_mode_id: "TPMR",
  cible_fauteuil_roulant: true,
} as const;
export const AMBULANCE = { cible_mode_id: "AMBULANCE" } as const;

export const AMBULANCE_NECESSAIRE = {
  ...AMBULANCE,
  cible_mode_ambulance: true,
} as const;
