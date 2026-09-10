// La grille du livrable v9.7 : 225 cas engendrés, cinq modes croisés avec cinq
// motifs, trois tranches de distance et trois nombres de transports.
//
// C'est la part de la matrice que l'éditeur décrit par un générateur plutôt que
// par une liste, et elle vaut d'être rejouée telle quelle : elle balaie d'un coup
// ce que chaque axe fait aux deux sorties qui comptent — le mode retenu et le cas
// final —, là où nos situations de référence n'en prennent qu'un point chacune.
//
// Les identifiants sont ceux du livrable (`GRID-AMB-SEANCE-D2-N4`) : c'est sous
// ce nom qu'un désaccord remonte à l'éditeur.

import { describe, expect, it } from "vitest";
import { evaluerLeCas, type OptionsDuLivrable } from "./livrable-v9-7";
import {
  DAP,
  NON_ELIGIBLE,
  PMT,
  TPMR,
  TRANSPORT_EN_COMMUN,
  VEHICULE_PERSONNEL,
  VSL,
} from "./situations-v9-7";

/** Les cinq façons dont la Partie 1 arrête un mode, et le mode qu'elle arrête. */
const MODES: ReadonlyArray<
  [code: string, options: OptionsDuLivrable, attendu: string]
> = [
  ["IND", { autonomy: 0 }, VEHICULE_PERSONNEL],
  ["TC", { autonomy: 0, mode: "Transports en commun" }, TRANSPORT_EN_COMMUN],
  ["TAP", {}, VSL],
  ["TPMR", { criterion: "p1_critere_fauteuil_sans_transfert" }, TPMR],
  ["AMB", { criterion: "p1_critere_oxygene" }, "ambulance"],
];

/** Les cinq motifs, dont quatre ouvrent le droit et le premier n'ouvre rien. */
const MOTIFS: ReadonlyArray<[code: string, options: OptionsDuLivrable]> = [
  ["NONE", {}],
  ["HOSP", { reason: "Entrée en hospitalisation" }],
  ["ATMP", { contexts: { p2_contexte_at_mp: "oui" } }],
  ["ALD", { m0: { p1_m0_ald: "oui" } }],
  [
    "SEANCE",
    {
      m0: { p1_m0_seance_chimiotherapie: "oui" },
      reason: "Séance de chimiothérapie",
    },
  ],
];

const DISTANCES = [0, 1, 2] as const;
const NOMBRES = [1, 3, 4] as const;

/**
 * Le cas final attendu, tel que la grille du livrable le fixe.
 *
 * Quatre règles s'y superposent, et deux méritent d'être dites parce qu'elles ne
 * vont pas de soi.
 *
 * **Une ALD n'ouvre le droit que sous incapacité.** Le livrable le montre en
 * croisant : sous ALD, un patient autonome ou accompagné d'un proche n'est pas
 * éligible, là où celui qui réclame un professionnel l'est. C'est la règle de
 * toujours, exprimée ici par le mode plutôt que par une case.
 *
 * **Un critère d'ambulance ouvre le droit à lui seul**, sans aucun motif. La
 * règle ne date pas de la v9.7 — `p1_critere_ambulance` figure déjà parmi les
 * motifs en v9.5.1 — mais nous l'avons remontée à l'éditeur
 * (`tmp/9.7/anomalie-v9-7-critere-ambulance-motif.md`) : cette grille constate le
 * comportement observé, elle ne l'approuve pas.
 *
 * **Au-delà de 150 km, et sur une série, le cas final est une DAP même sans
 * droit ouvert** : `distance === 2` et la série court-circuitent `droitOuvert`.
 * Vingt-quatre des 225 cas sont dans ce cas, et c'est la seconde chose que nous
 * avons remontée (`tmp/9.7/anomalie-v9-7-motifs-dap-ouvrent-le-droit.md`) — la
 * v9.7 a fait entrer quatre conditions d'accord préalable dans la liste des
 * motifs ouvrant droit. Une série se compte à quatre transports ou plus dont
 * chacun dépasse 50 km, sauf sous ALD validée, qui en dispense.
 */
function casFinalAttendu(
  mode: string,
  motif: string,
  distance: number,
  nombre: number,
) {
  const professionnel = mode === "TAP" || mode === "TPMR" || mode === "AMB";
  const aldValidee = motif === "ALD" && professionnel;
  const droitOuvert =
    motif === "HOSP" ||
    motif === "ATMP" ||
    motif === "SEANCE" ||
    aldValidee ||
    mode === "AMB";
  const serie = distance >= 1 && nombre >= 4 && !aldValidee;
  if (distance === 2 || serie) return DAP;
  return droitOuvert ? PMT : NON_ELIGIBLE;
}

/** La couleur du Résultat 2 : verte pour une prescription, bleue partout ailleurs. */
const couleurAttendue = (casFinal: string) =>
  casFinal === PMT ? "vert" : "bleu";

const CAS = MODES.flatMap(([mode, optionsMode, transport]) =>
  MOTIFS.flatMap(([motif, optionsMotif]) =>
    DISTANCES.flatMap((distance) =>
      NOMBRES.map((nombre) => ({
        id: `GRID-${mode}-${motif}-D${distance}-N${nombre}`,
        options: {
          ...optionsMode,
          ...optionsMotif,
          distance,
          count: nombre,
          organization: "trajets simples",
        } satisfies OptionsDuLivrable,
        transport,
        casFinal: casFinalAttendu(mode, motif, distance, nombre),
      })),
    ),
  ),
);

describe("modèle v9.7 — la grille du livrable", () => {
  it("compte les 225 cas que le livrable engendre", () => {
    expect(CAS).toHaveLength(225);
  });

  it.each(CAS)("$id", ({ options, transport, casFinal }) => {
    const moteur = evaluerLeCas(options);
    expect(
      moteur.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
      "mode retenu",
    ).toBe(transport);
    expect(moteur.evaluate("cible_cas_final").nodeValue, "cas final").toBe(
      casFinal,
    );
    expect(
      moteur.evaluate("cible_resultat_2_couleur").nodeValue,
      "couleur du Résultat 2",
    ).toBe(couleurAttendue(casFinal));
  });
});
