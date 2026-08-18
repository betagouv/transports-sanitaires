// Inventaire des champs AcroForm du CERFA n° 11574*07 « Prescription médicale de
// transport » (réf. S3138g, 4 pages : notice p1-p2, Volet 1 p3, Volet 2 p4).
//
// Relevé par introspection du PDF (53 champs). Les noms sont ceux, bruts, du
// formulaire : ils portent les fautes et abréviations de l'original (« aseptie »,
// « dadministration doxygène », « entré sortie hosp »…). On les conserve tels quels
// — ce sont des clés, pas de la prose — et on les traduit ici en constantes lisibles.
//
// Deux pièges relevés à l'introspection, sans lesquels le remplissage produit un
// résultat silencieusement faux :
//
//  1. `ALD exo`, `oui1` et `oui2` ne sont **pas** des cases à cocher mais des
//     boutons radio déguisés : un même champ porte 4 widgets (2 par volet), dont
//     l'un a pour état d'export `/OUI` et l'autre `/NON`. Un `check()` naïf coche
//     le premier état venu. Il faut imposer l'état (voir `remplir-cerfa.ts`).
//  2. `entré sortie hosp` a pour état d'export `/NON` alors que la cocher signifie
//     « oui, entrée/sortie d'hospitalisation ». L'état d'export n'est pas la
//     sémantique : ne jamais l'inférer du nom.

/** État d'export à écrire pour cocher un champ (le « off » est toujours `/Off`). */
export type ÉtatCoché = "On" | "OUI" | "NON";

export type ChampCase = { readonly nom: string; readonly coché: ÉtatCoché };

const case_ = (nom: string, coché: ÉtatCoché = "On"): ChampCase => ({
  nom,
  coché,
});

/** Bénéficiaire du transport et assuré(e) — en-tête des deux volets. */
export const IDENTITÉ = {
  bénéficiaireNomPrénom: "N et P bénéficiaire", // 50 car.
  bénéficiaireNIR: "N° immat bénéf", // 13 car., peigne
  bénéficiaireClé: "clé", // 2 car.
  bénéficiaireDateNaissance: "Date Nais", // 8 car., JJMMAAAA
  bénéficiaireAdresse: "adresse", // 100 car. — cf. MULTILIGNES_ROGNÉS
  organismePaiement: "Nom et num centre paiement",
  assuréNomPrénom: "N et P assuré", // 50 car.
  assuréNIR: "N° immat assuré", // 13 car.
  assuréClé: "clé 1", // 2 car.
  dateAccidentTiers: "date accident", // 8 car., JJMMAAAA
} as const;

/** ❶ Situation permettant la prise en charge (plusieurs choix possibles). */
export const SITUATION = {
  // Accident causé par un tiers : deux champs distincts (et non un radio),
  // mutuellement exclusifs — ne jamais cocher les deux.
  accidentTiersOui: case_("oui", "OUI"),
  accidentTiersNon: case_("non", "NON"),

  entréeSortieHospitalisation: case_("entré sortie hosp", "NON"), // piège n° 2
  aldExonérante: case_("ALD exo", "OUI"), // piège n° 1
  aldNonExonérante: case_("ALD exo", "NON"), // même champ, état inverse
  engagementMaternité: case_(
    "transport Engagement maternité du lieu de résidence vers la maternité ou lhébergement temporaire non médicalisé",
  ),
  accidentTravailMaladiePro: case_(
    "transport lié à un accident du travail ou une maladie professionnelle",
  ),
  dateAccidentATMP: "date accid ATMP", // 8 car., JJMMAAAA
} as const;

/** ❷ Mode de transport prescrit au regard de l'état de santé et d'autonomie. */
export const MODE_TRANSPORT = {
  // Justifications de l'ambulance (au moins une requise pour prescrire une ambulance).
  positionAllongéeDemiAssise: case_("position allongée ou demiassise"),
  surveillancePersonneQualifiée: case_(
    "surveillance par une personne qualifiée",
  ),
  oxygène: case_("dadministration doxygène"),
  brancardagePortage: case_("brancardage ou dun portage"),
  asepsieRigoureuse: case_("aseptie rigoureuse"),

  assisProfessionnalisé: case_(
    "transport assis professionnalisé VSL taxi conventionné",
  ),
  transportPartagéIncompatible: case_(
    "létat de santé du patient nest pas compatible avec un transport partagé cochez la case",
  ),
  fauteuilRoulantTPMR: case_(
    "un transport pour patient à mobilité réduite dans son fauteuil roulant est adapté cochez la case",
  ),

  moyenIndividuel: case_("transp indiv"),
  transportEnCommun: case_("transp terres"),
  accompagnantNécessaire: case_(
    "dans ce cas si létat du patient nécessite une personne accompagnante cochez la case",
  ),
} as const;

/** Trajet : départ et arrivée. `domicile` exclut de renseigner le lieu détaillé. */
export const TRAJET = {
  départDomicile: case_("domicile"),
  départAutreLieu: "départ autre lieu",
  départStructureSoins: "départ struct soins",
  arrivéeDomicile: case_("domicile_2"),
  arrivéeAutreLieu: "arrivée autre lieu",
  arrivéeStructureSoins: "arrivée struct soins",
  allerRetour: case_("transp aller-retour"),
  nombreTransportsItératifs: "nbr transp", // 2 car.
} as const;

/** ❹ Urgence, ❺ éléments d'ordre médical, ❻ exonération du ticket modérateur. */
export const PRESCRIPTION = {
  urgenceSamu: case_("Urg SAMU centre 15"),
  urgenceAutre: case_("autres"),
  /** ❺ Volet 1 **uniquement** — donnée médicale, ne figure pas sur le Volet 2. */
  élémentsOrdreMédical: "comm évent",
  /** Volet 1 uniquement — orientation en centre de référence maladies rares. */
  centreMaladiesRares: case_("transp autre cent"),
  ticketModérateurOui: case_("oui1", "OUI"),
  ticketModérateurNon: case_("oui1", "NON"),
  pensionMilitaireOui: case_("oui2", "OUI"),
  pensionMilitaireNon: case_("oui2", "NON"),
} as const;

/** Identification du prescripteur et de la structure dans laquelle il exerce. */
export const PRESCRIPTEUR = {
  nomPrénom: "N et P prescript", // 45 car.
  raisonSociale: "raison sociale prescript",
  rpps: "identifiant", // 11 car., peigne
  adresse: "adresse precript", // 50 car.
  dateSignature: "date", // 8 car., JJMMAAAA
  finessOuSiret: "AM FINESS ou SIRET", // 14 car., peigne
} as const;

/**
 * Bloc transporteur, Volet 2 **uniquement** — rempli à la main par le transporteur.
 * Listé pour mémoire : le simulateur ne doit rien y écrire.
 */
export const TRANSPORTEUR_NE_PAS_REMPLIR = [
  "raison sociale VSL",
  "adresse VSL",
  "fait à",
  "date1",
  "n° ident",
] as const;

/**
 * Champs déclarés multilignes dans le PDF mais dont le cadre visible ne montre
 * qu'une ligne : y écrire un `\n` rogne silencieusement le reste à l'impression.
 * Les valeurs destinées à ces champs doivent être aplaties sur une seule ligne.
 */
export const MULTILIGNES_ROGNÉS: readonly string[] = [
  IDENTITÉ.bénéficiaireAdresse,
];
