// La composition des éléments d'ordre médical : réencodage TypeScript du
// contrat EM-1 (`composeMedicalText`, `tmp/9.7.1/src/medical-text.mjs`), douze
// blocs assemblés dans un ordre fixe, jamais depuis un texte inventé — cf. la
// décision 2 de la spec 0005 pour le choix de réencoder plutôt que charger le
// module de l'éditeur.
//
// Chaque bloc lit `Reponses`, jamais la situation brute : c'est le moteur qui
// rend une question non applicable comme absente, à l'identique de
// `adresseSurLaLigne` dans `mapping.ts` (décision 3 de la spec 0005).
//
// Le bloc du type d'hospitalisation a disparu avec `p2_type_hospitalisation`
// (retiré en v9.7.3, ticket 10). Le passage au contrat EM-2 (texte médical
// intégral, sans annexe) reste à faire — ticket 12.

import type { CleDeRegle } from "../../../../simulateur/contrat-regles-publicodes.ts";
import type { Reponses } from "../reponses.ts";
import { dateEtHeureDePermission, dateMedicale } from "./dates.ts";
import { CRITERES_MEDICAUX, SEANCES } from "./libelles.ts";

/** Les douze blocs, dans l'ordre du contrat, dédupliqués et joints par un `\n`. */
export function composerElementsMedicaux(réponses: Reponses): string {
  const blocs = [
    blocTransfert(réponses),
    réponses.texte("cible_motif_medical_deplacement"),
    blocConvocation(réponses),
    ...blocsSeances(réponses),
    ...blocsCriteres(réponses),
    blocCentreRare(réponses),
    blocSamsah(réponses),
    blocLongueDistance(réponses),
    blocPermission(réponses),
    blocPensionMilitaire(réponses),
    ...blocsMaterniteEtHtnm(réponses),
  ];
  return dédupliqués(blocs);
}

// ---- implémentation ----

type Bout = "depart" | "arrivee";

// Les quatre composants d'une adresse liée au trajet, dans l'ordre où
// `boundAddress` (EM-1) les assemble.
const COMPOSANTS_ADRESSE: Record<
  Bout,
  readonly [CleDeRegle, CleDeRegle, CleDeRegle, CleDeRegle]
> = {
  depart: [
    "p2_depart_nom_lieu",
    "p2_depart_adresse",
    "p2_depart_code_postal",
    "p2_depart_commune",
  ],
  arrivee: [
    "p2_arrivee_nom_lieu",
    "p2_arrivee_adresse",
    "p2_arrivee_code_postal",
    "p2_arrivee_commune",
  ],
};

function blocTransfert(réponses: Reponses): string {
  const raison = réponses.texte("p2_raison_principale");
  const nature = réponses.texte("p2_nature_transfert");
  const dejaQualifie =
    réponses.vrai("p2_transfert_en_cours") || raison.startsWith("Transfert");
  if (!dejaQualifie || !["Provisoire", "Définitif"].includes(nature)) return "";
  return `Transfert ${nature.toLowerCase()}`;
}

function blocConvocation(réponses: Reponses): string {
  const type = réponses.texte("cible_convocation_type");
  return type === "" ? "" : `Déplacement lié à la convocation : ${type}`;
}

function blocsSeances(réponses: Reponses): string[] {
  return SEANCES.filter(([clé]) => réponses.vrai(clé)).map(
    ([, libellé]) => libellé,
  );
}

function blocsCriteres(réponses: Reponses): string[] {
  return Object.entries(CRITERES_MEDICAUX)
    .filter(([clé]) => réponses.vrai(clé as CleDeRegle))
    .map(([, libellé]) => libellé);
}

function blocCentreRare(réponses: Reponses): string {
  if (!réponses.vrai("cible_situation_centre_reference_maladies_rares"))
    return "";
  const bout = boutDuCentreDeSoins(réponses);
  const nom = bout ? réponses.texte(COMPOSANTS_ADRESSE[bout][0]) : "";
  return (
    "Orientation vers un autre centre de référence dédié à la maladie rare" +
    (nom ? ` : ${nom}` : ".")
  );
}

function boutDuCentreDeSoins(réponses: Reponses): Bout | undefined {
  const centreDeSoins = ["Structure de soins", "USLD"];
  if (centreDeSoins.includes(réponses.texte("cible_lieu_arrivee_type")))
    return "arrivee";
  if (centreDeSoins.includes(réponses.texte("cible_lieu_depart_type")))
    return "depart";
  return undefined;
}

function blocSamsah(réponses: Reponses): string {
  if (!réponses.vrai("cible_dap_motif_samsah")) return "";
  const nom = réponses.texte("p2_arrivee_nom_lieu");
  return `Transport vers le SAMSAH${nom ? ` : ${nom}` : "."}`;
}

function blocLongueDistance(réponses: Reponses): string {
  if (!réponses.vrai("cible_dap_motif_longue_distance")) return "";
  const justification = réponses.texte("cible_justification_longue_distance");
  return justification
    ? `Justification du trajet de plus de 150 km : ${justification}`
    : "";
}

function blocPermission(réponses: Reponses): string {
  if (!réponses.vrai("p2_permission_speciale")) return "";
  const détails = détailsDePermission(réponses);
  if (détails.length === 0) return "";
  const joints = détails.join(" ; ").replace(" ; jusqu’au ", ", jusqu’au ");
  return `Permission de sortie : ${joints}.`;
}

function détailsDePermission(réponses: Reponses): string[] {
  const détails: string[] = [];
  const débutHospitalisation = réponses.texte(
    "p2_permission_debut_hospitalisation",
  );
  if (débutHospitalisation) {
    détails.push(
      `hospitalisation commencée le ${dateMedicale(débutHospitalisation)}`,
    );
  }
  const début = réponses.texte("p2_permission_debut");
  const fin = réponses.texte("p2_permission_fin");
  if (début && fin) {
    détails.push(
      `première permission du ${dateEtHeureDePermission(début)} au ${dateEtHeureDePermission(fin)}`,
    );
  }
  const fréquence = réponses.valeur("p2_permission_ar_par_mois");
  if (
    typeof fréquence === "number" &&
    Number.isInteger(fréquence) &&
    fréquence > 0
  ) {
    détails.push(
      `${fréquence} allers-retours par mois au maximum, dans la limite d’un par semaine`,
    );
  }
  const finDePériode = réponses.texte("p2_permission_periode_fin");
  if (finDePériode) détails.push(`jusqu’au ${dateMedicale(finDePériode)}`);
  return détails;
}

function blocPensionMilitaire(réponses: Reponses): string {
  return réponses.vrai("cible_situation_pension_militaire")
    ? "Soins dispensés au titre d’une pension militaire d’invalidité."
    : "";
}

function blocsMaterniteEtHtnm(réponses: Reponses): string[] {
  if (!réponses.vrai("p2_contexte_engagement_maternite")) return [];
  const niveau = réponses.texte("p2_maternite_niveau");
  const adresse = adresseLiée(
    réponses,
    réponses.texte("p2_maternite_lieu"),
    "p2_maternite_nom",
    "p2_maternite_adresse",
  );
  const maternité =
    "Engagement maternité" +
    (niveau ? ` - ${niveau}` : "") +
    (adresse ? ` : ${adresse}` : ".");
  const lieuHtnm = réponses.texte("p2_htnm_lieu");
  if (!lieuHtnm || lieuHtnm === "Non") return [maternité];
  const adresseHtnm = adresseLiée(
    réponses,
    lieuHtnm,
    "p2_htnm_nom",
    "p2_htnm_adresse",
  );
  return adresseHtnm
    ? [maternité, `Hébergement temporaire non médicalisé : ${adresseHtnm}`]
    : [maternité];
}

// Une adresse du trajet, désignée par un des deux couples de libellés que
// `p2_maternite_lieu` et `p2_htnm_lieu` emploient chacun pour le même bout —
// ou une adresse saisie à part quand ni l'un ni l'autre ne s'applique.
function adresseLiée(
  réponses: Reponses,
  où: string,
  cléNom: CleDeRegle,
  cléAdresse: CleDeRegle,
): string {
  const bout: Bout | undefined = ["Départ", "Adresse de départ"].includes(où)
    ? "depart"
    : ["Arrivée", "Adresse d’arrivée"].includes(où)
      ? "arrivee"
      : undefined;
  const composants = bout
    ? COMPOSANTS_ADRESSE[bout].map((clé) => réponses.texte(clé))
    : [réponses.texte(cléNom), réponses.texte(cléAdresse)];
  return composants.filter((morceau) => morceau !== "").join(", ");
}

function dédupliqués(blocs: readonly string[]): string {
  const nettoyés = blocs.map(nettoyé).filter((bloc) => bloc !== "");
  return [...new Set(nettoyés)].join("\n");
}

function nettoyé(bloc: string): string {
  return bloc.replace(/\r\n?/g, "\n").normalize("NFC").trim();
}
