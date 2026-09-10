// Le pré-remplissage lu depuis le mapping documentaire, plutôt que redérivé.
//
// `front/simulateur/secretariat/` porte la transcription complète du YAML
// documentaire de la v9.7 — la checklist du Bloc 3 n'en lit que la moitié utile
// à l'écran. Ce module lit l'autre moitié : à partir d'un id de la feuille, il
// rend directement un `Remplissage` de `remplissage.ts`, sans reconstruire de
// règle réglementaire à partir de l'interface.
//
// Le Cerfa a son propre `Engine` et sa propre `Situation` (`reponses.ts`) : il ne
// peut pas importer le moteur singleton du secrétariat
// (`scripts/verifier-bundle.ts` l'interdit). D'où le lecteur construit ici, sur
// `Reponses` plutôt que sur `typeof moteur` — cf. la décision 3 de la spec 0006.

import type { CleDeRegle } from "../../../simulateur/contrat-regles-publicodes.ts";
import {
  type CaseDeFormulaire,
  casesParId,
  destinataireDe,
  type Lecteur,
  origineDe,
  quandSatisfaite,
  type Rubrique,
} from "../../../simulateur/secretariat/case-de-formulaire";
import type { ÉtatCoché } from "./remplir-cerfa.ts";
import {
  auPrescripteur,
  auTransporteur,
  type Remplissage,
  àLaCaisse,
} from "./remplissage.ts";
import type { Reponses } from "./reponses.ts";

/**
 * Le `Remplissage` d'un champ, lu depuis la ligne `id` du mapping.
 *
 * `état` est l'état d'export à écrire quand la case coche — celui que le champ
 * AcroForm visé connaît, relevé par introspection comme les autres (cf.
 * `remplir-cerfa.ts`). Par défaut `"On"`, le cas courant.
 *
 * Une ligne d'origine `externe`, `manuel`, ou `application` sans règle qui la
 * tranche rend le `laisséÀ` correspondant : c'est la feuille qui dit désormais
 * pourquoi le champ reste vierge, et à qui, plutôt qu'une raison écrite à la
 * main dans un tableau de remplissage.
 */
export function depuisLeMapping(
  rubriques: readonly Rubrique[],
  id: string,
  état: ÉtatCoché = "On",
): Remplissage {
  const laCase = casesDeLaFeuille(rubriques, id);
  if (!laCase.source) return laisséÀ(laCase);
  const source = laCase.source;
  return (réponses) => {
    const lecteur = lecteurDeReponses(réponses);
    if (!quandSatisfaite(laCase, lecteur)) return undefined;
    return valeurDe(rubriques, laCase, source, état, réponses, lecteur);
  };
}

/**
 * Les six composants d'adresse d'une ligne `address_line_selector`, assemblés
 * sur l'unique ligne que le formulaire lui donne. `id` désigne le sélecteur —
 * `depart_structure`, `arrivee_autre` — dont le préfixe (`depart` ou `arrivee`)
 * nomme les six lignes-composants à lire (`${préfixe}_nom`,
 * `${préfixe}_adresse`, …), portées par `rubriques-trajet.ts`.
 */
export function adresseSurLaLigne(
  rubriques: readonly Rubrique[],
  id: string,
  réponses: Reponses,
): string {
  const préfixe = id.startsWith("depart") ? "depart" : "arrivee";
  const index = casesParId(rubriques);
  return ["nom", "adresse", "complement", "code_postal", "commune", "pays"]
    .map((suffixe) => index.get(`${préfixe}_${suffixe}`)?.source)
    .filter((source): source is CleDeRegle => source !== undefined)
    .map((source) => réponses.texte(source).trim())
    .filter((morceau) => morceau !== "")
    .join(", ");
}

// ---- implémentation ----

// Le libellé d'origine dit pourquoi une case reste vierge ; ce module en tire
// une raison générique, faute de recopier le tableau de remplissage champ par
// champ — la 0007 et la 0008 pourront l'affiner sans changer ce contrat.
const RAISON_PAR_ORIGINE: Record<"externe" | "manuel" | "application", string> =
  {
    externe: "donnée hors du simulateur, anonyme par construction",
    manuel: "case remplie à la main, hors du simulateur",
    application: "calculé par l’application hors de ce mapping",
  };

function casesDeLaFeuille(
  rubriques: readonly Rubrique[],
  id: string,
): CaseDeFormulaire {
  const laCase = casesParId(rubriques).get(id);
  if (!laCase) {
    throw new Error(`Aucune ligne « ${id} » dans le mapping documentaire.`);
  }
  return laCase;
}

// Une ligne sans source : externe, manuelle, ou application sans règle qui la
// tranche (les éléments d'ordre médical, cf. spec 0005). `publicodes` n'y
// figure jamais — dans ce mapping, une ligne d'origine `publicodes` porte
// toujours une `source` — mais un défaut nomme l'écart plutôt que de planter.
function laisséÀ(laCase: CaseDeFormulaire): Remplissage {
  const origine = origineDe(laCase);
  const raison =
    origine === "publicodes"
      ? `origine « publicodes » sans source déclarée sur « ${laCase.id} »`
      : RAISON_PAR_ORIGINE[origine];
  const destinataire = destinataireDe(laCase);
  if (destinataire === "le transporteur") return auTransporteur(raison);
  if (destinataire === "la caisse") return àLaCaisse(raison);
  return auPrescripteur(raison);
}

// `ligne` désigne soit un domicile (une case : `quandSatisfaite` a déjà tranché
// qu'il s'applique), soit une ligne de texte composée sur `adresseSurLaLigne`.
function valeurDe(
  rubriques: readonly Rubrique[],
  laCase: CaseDeFormulaire,
  source: CleDeRegle,
  état: ÉtatCoché,
  réponses: Reponses,
  lecteur: Lecteur,
) {
  switch (laCase.rendu) {
    case "case Non":
      return lecteur.faux(source) ? { coché: état } : undefined;
    case "ligne":
      return laCase.id.endsWith("_domicile")
        ? { coché: état }
        : commeTexte(adresseSurLaLigne(rubriques, laCase.id, réponses));
    case "adresse":
      return undefined; // jamais un champ réel, seulement lu par `adresseSurLaLigne`
    case "date":
    case "nombre":
    case "texte":
      return commeTexte(lecteur.texte(source));
    default:
      return lecteur.vrai(source) ? { coché: état } : undefined;
  }
}

function commeTexte(texte: string) {
  return texte === "" ? undefined : { texte };
}

function lecteurDeReponses(réponses: Reponses): Lecteur {
  return {
    texte: réponses.texte,
    vrai: réponses.vrai,
    faux: (regle) => réponses.valeur(regle) === false,
  };
}
