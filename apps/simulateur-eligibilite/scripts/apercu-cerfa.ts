// Aperçu de bout en bout : une situation du simulateur → un CERFA rempli.
//
//   pnpm apercu-cerfa [seed-id] [sortie.pdf]
//
// Le PDF produit montre ce que le simulateur sait déduire (cases ❶ et ❷, trajet,
// urgence) et, par contraste, tout ce qui reste vierge — patient, adresses,
// identité du prescripteur.
//
// Le formulaire n'est pas choisi ici : c'est le cas final de la seed qui le
// désigne, comme à l'écran. Une prescription donne la PMT, une demande d'accord
// préalable la DAP ; tout autre cas final n'ouvre aucun document, et le script le
// dit plutôt que d'en produire un.
//
// La situation vient du **catalogue de seeds** (`front/outils-produit/seeds/`), par
// défaut la seed
// `secretariat-prescription` — celle qu'ouvre la galerie dev. Le script et l'écran
// produisent ainsi exactement le même document, et il n'y a qu'une situation à
// faire évoluer. Toute autre seed menant à un document peut être demandée par son
// identifiant.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { RawPublicodes } from "publicodes";
import Engine from "publicodes";
import { saisiesDepuisSituation as saisiesDap } from "../front/outils-produit/beta/cerfa/dap/depuis-simulateur.ts";
import { saisiesDepuisSituation as saisiesPmt } from "../front/outils-produit/beta/cerfa/pmt/depuis-simulateur.ts";
import { remplirCerfa } from "../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { seedParId } from "../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../front/outils-produit/seeds/seed.ts";

// Les deux documents que le simulateur sait pré-remplir, par le cas final qui les
// ouvre. C'est la même correspondance qu'à l'écran.
const FORMULAIRES: Record<
  string,
  {
    libellé: string;
    gabarit: string;
    saisies: typeof saisiesPmt;
  }
> = {
  "prescription médicale de transport": {
    libellé: "PMT — prescription médicale de transport (n° 11574*07)",
    gabarit: "pmt/gabarit/cerfa-11574-07.pdf",
    saisies: saisiesPmt,
  },
  "demande d’accord préalable": {
    libellé: "DAP — demande d’accord préalable (n° 11575*08)",
    gabarit: "dap/gabarit/cerfa-11575-08.pdf",
    saisies: saisiesDap,
  },
};

const ici = dirname(fileURLToPath(import.meta.url));
const règles = yaml.load(
  readFileSync(join(ici, "../regles/regles.publicodes"), "utf-8"),
) as RawPublicodes<string>;

// Premier argument : identifiant de seed. Un argument qui ressemble à un chemin de
// fichier est traité comme la sortie, pour garder l'appel historique `-- sortie.pdf`.
const argSeed = process.argv[2]?.endsWith(".pdf") ? undefined : process.argv[2];
const seed = seedParId(argSeed ?? "secretariat-prescription");
const situation = situationDe(seed);

console.log(`seed           : ${seed.id} — ${seed.libelle}`);

const moteur = new Engine(règles, {
  flag: { filterNotApplicablePossibilities: true },
});
const casFinal = String(
  moteur.setSituation(situation).evaluate("cible_cas_final").nodeValue ?? "",
);
const formulaire = FORMULAIRES[casFinal];
if (!formulaire) {
  console.error(
    `Aucun CERFA pour « ${casFinal} » : seules la prescription médicale de ` +
      `transport et la demande d'accord préalable en ouvrent un.`,
  );
  process.exit(1);
}
const saisies = formulaire.saisies(moteur, situation);

console.log(`formulaire     : ${formulaire.libellé}`);
console.log(
  `mode prescrit  : ${moteur.setSituation(situation).evaluate("cible_transport_sanitaire_prescrit").nodeValue}`,
);
console.log(`champs déduits : ${saisies.length}`);
for (const saisie of saisies) {
  console.log(
    "  " +
      ("coché" in saisie
        ? `[x] ${saisie.champ}`
        : `    ${saisie.champ} = ${saisie.texte}`),
  );
}

const sortie =
  process.argv.slice(2).find((a) => a.endsWith(".pdf")) ??
  join(ici, "../apercu-cerfa.pdf");
const gabarit = readFileSync(
  join(ici, "../front/outils-produit/beta/cerfa", formulaire.gabarit),
);
writeFileSync(sortie, await remplirCerfa(gabarit, saisies));
console.log(`\nPDF écrit : ${sortie}`);
