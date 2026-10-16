// La permission : quand Q2.7 et Q2.8 se posent, et les faits que leurs pages
// établissent (D-107).
//
// Chaque fait suit `CONTRAT_REPONSES_FAITS.json` du paquet de l'éditeur. Une
// permission acquise écarte le transfert et le Centre 15, dès la question qui
// la pose. Sans Q2.7 validée, rien d'autre n'est établi : la permission écartée
// a déjà posé ses deux faits à « non » (contextes). Le cadre de Q2.8.4.a ne
// change aucun fait. Ces fonctions ne lisent que les questions validées.

import type { Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";

type Valides = Validated<Questions>;

/** La permission est-elle acquise, par Q2.1 ou par Q2.2.1.a ? */
export function permissionAcquise(validated: Valides): boolean {
  return (
    validated["Q2.1"]?.answer === "11_PERMISSION" ||
    validated["Q2.2.1.a"]?.answer === "1_OUI"
  );
}

/** Q2.7 dit-elle un patient de moins de 20 ans ? Q2.8 se pose alors. */
export function mineurDeVingtAns(validated: Valides): boolean {
  const tranche = validated["Q2.7"]?.answer;
  return (
    tranche === "1_MOINS_DE_SEIZE_ANS" || tranche === "2_SEIZE_A_DIX_NEUF_ANS"
  );
}

/**
 * Les options adultes de Q2.7 se proposent-elles ? Pas si Q1.3 dit un patient
 * de moins de 18 ans : un fait acquis retire les choix qu'il contredit.
 */
export function optionsAdultesAProposer(validated: Valides): boolean {
  return !validated["Q1.3"]?.answer?.includes("8_MINEUR_SOINS_CONTINUS");
}

/**
 * Les faits que les pages de la permission établissent. Un fait dont la
 * question n'est pas validée reste comme il était.
 */
export function faitsDeLaPermission(validated: Valides): Partial<Faits> {
  return { ...faitsDuTransfertEcarte(validated), ...faitsDeQ27(validated) };
}

// ---- implémentation ----

// Une permission n'est ni un transfert ni un déplacement pour soins : la
// question qui la pose a écarté l'option 9 de Q2.1 (choix unique), ou l'option 2
// de Q2.2.1.a. Q2.5 ne se pose pas alors ; si elle est validée, elle décide.
function faitsDuTransfertEcarte(validated: Valides): Partial<Faits> {
  if (validated["Q2.5"]) return {};
  const raison =
    validated["Q2.1"]?.answer === "11_PERMISSION"
      ? "Q2.1 : « 11_PERMISSION » ; une permission n'est ni un transfert ni un déplacement pour soins (option 9 écartée)."
      : validated["Q2.2.1.a"]?.answer === "1_OUI"
        ? "Q2.2.1.a : « 1_OUI » ; une permission n'est ni un transfert ni un déplacement pour soins (option 2 écartée)."
        : undefined;
  if (raison === undefined) return {};
  return {
    fait_transfert_article80: non(raison),
    fait_centre15_interetablissements: non(raison),
  };
}

function faitsDeQ27(validated: Valides): Partial<Faits> {
  const tranche = validated["Q2.7"]?.answer;
  if (tranche === undefined) return {};
  const source = `Q2.7 : « ${tranche} ».`;
  if (mineurDeVingtAns(validated)) {
    return {
      fait_permission_charge_patient: non(
        `${source} La charge patient ne vaut que pour 20 ans ou plus.`,
      ),
      ...(validated["Q2.8.4"] && {
        fait_permission_mineur_admissible: admissibilite(validated),
      }),
    };
  }
  return {
    fait_permission_charge_patient:
      tranche === "4_ADULTE_A_SA_CHARGE"
        ? chargeDuPatient(validated)
        : non(source),
    fait_permission_mineur_admissible: non(
      `${source} L'admissibilité ne vaut que pour moins de 20 ans.`,
    ),
  };
}

function oui(provenance: string): Fait {
  return { value: true, provenance };
}

function non(provenance: string): Fait {
  return { value: false, provenance };
}

function absent(provenance: string): Fait {
  return { provenance };
}

// Un adulte à sa charge : l'établissement confirme, ou ne peut pas le vérifier.
function chargeDuPatient(validated: Valides): Fait {
  const confirmation = validated["Q2.7.a"]?.answer;
  const source = `Q2.7.a : « ${confirmation} ».`;
  switch (confirmation) {
    case "1_OUI":
      return oui(source);
    case "2_NON":
      return non(source);
    case "3_NE_SAIT_PAS":
      return absent(`${source} À vérifier.`);
    default:
      return absent(
        "Q2.7 : « 4_ADULTE_A_SA_CHARGE » ; Q2.7.a attend sa réponse.",
      );
  }
}

// Un patient de moins de 20 ans : l'autorisation de Q2.8.4 décide. Les dates,
// la durée, la fréquence et l'âge sont garantis par les blocages de la page.
function admissibilite(validated: Valides): Fait {
  const autorisation = validated["Q2.8.4"]?.answer;
  const source = `Q2.8.4 : « ${autorisation} ».`;
  switch (autorisation) {
    case "1_OUI":
      return oui(source);
    case "2_NON":
      return non(`${source} Permission non autorisée selon R.1112-56.`);
    case "3_NE_SAIT_PAS":
      return absent(`${source} À vérifier.`);
    default:
      return absent("Q2.8.4 attend sa réponse.");
  }
}
