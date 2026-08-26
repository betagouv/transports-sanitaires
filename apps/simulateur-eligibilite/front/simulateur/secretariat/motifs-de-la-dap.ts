// Les motifs qui ont déclenché la demande d'accord préalable.
//
// Six causes réglementaires, six cibles du modèle. C'est lui qui décide laquelle
// s'applique : l'application les lit et rend celles qui sont vraies, sans jamais
// rejouer le raisonnement. Une DAP peut en réunir plusieurs — d'où une liste, et
// non un motif unique.

import type { Cible } from "../contrat-regles-publicodes";
import { type moteur, vrai } from "../moteur";

/**
 * Les six causes, avec le libellé que le contrat d'interface leur donne — repris
 * mot pour mot (`ui_computed_content.motifs_dap`), sigles développés compris : ce
 * sont eux que le patient et le prescripteur doivent retrouver.
 *
 * Exportée pour que `tests/simulateur/motifs-de-la-dap.test.tsx` confronte cette
 * liste aux cibles du modèle : une septième cause livrée en amont doit échouer
 * ici, et non passer inaperçue.
 */
export const MOTIFS_DE_LA_DAP: ReadonlyArray<{
  cible: Cible;
  libelle: string;
}> = [
  {
    cible: "cible_dap_motif_longue_distance",
    libelle: "Transport de longue distance de plus de 150 km aller",
  },
  {
    cible: "cible_dap_motif_serie",
    libelle: "Transports en série hors ALD (Affection de Longue Durée) validée",
  },
  {
    cible: "cible_dap_motif_avion_bateau",
    libelle: "Transport en avion ou bateau de ligne régulière",
  },
  {
    cible: "cible_dap_motif_camsp_cmpp",
    libelle:
      "Soins ou traitements dans un CAMSP (Centre d’Action Médico-Sociale Précoce) ou un CMPP (Centre Médico-Psycho-Pédagogique)",
  },
  {
    cible: "cible_dap_motif_engagement_maternite",
    libelle: "Dispositif Engagement maternité",
  },
  {
    cible: "cible_dap_motif_samsah",
    libelle:
      "Soins ou traitements dans un SAMSAH (Service d’Accompagnement Médico-Social pour Adultes Handicapés)",
  },
];

/** Les motifs retenus, dans l'ordre du contrat d'interface. Vide hors DAP. */
export function motifsDeLaDap(e: typeof moteur): string[] {
  return MOTIFS_DE_LA_DAP.filter(({ cible }) => vrai(e, cible)).map(
    ({ libelle }) => libelle,
  );
}
