// Aperçu de bout en bout : une situation du simulateur → un CERFA rempli.
//
//   npm run apercu-cerfa -- [seed-id] [sortie.pdf]
//
// Le PDF produit montre ce que le simulateur sait déduire (cases ❶ et ❷, trajet,
// urgence) et, par contraste, tout ce qui reste vierge — patient, adresses,
// identité du prescripteur.
//
// La situation vient du **catalogue de seeds** (`seeds/`), par défaut la seed
// `secretariat-prescription` — celle qu'ouvre la galerie dev. Le script et l'écran
// produisent ainsi exactement le même document, et il n'y a qu'une situation à
// faire évoluer. Toute autre seed menant à une prescription peut être demandée par
// son identifiant.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Engine from "publicodes";
import type { RawPublicodes } from "publicodes";
import yaml from "js-yaml";
import { saisiesDepuisSituation } from "../front/cerfa/depuis-simulateur.ts";
import { remplirCerfa } from "../front/cerfa/remplir-cerfa.ts";
import { seedParId } from "../seeds/catalogue.ts";
import { situationDe } from "../seeds/seed.ts";

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

const moteur = new Engine(règles, { flag: { filterNotApplicablePossibilities: true } });
const saisies = saisiesDepuisSituation(moteur, situation);

console.log(`mode prescrit  : ${moteur.setSituation(situation).evaluate("cible_transport_sanitaire_prescrit").nodeValue}`);
console.log(`champs déduits : ${saisies.length}`);
for (const saisie of saisies) {
  console.log("  " + ("case" in saisie ? `[x] ${saisie.case.nom}` : `    ${saisie.champ} = ${saisie.texte}`));
}

const sortie =
  process.argv.slice(2).find((a) => a.endsWith(".pdf")) ?? join(ici, "../apercu-cerfa.pdf");
const gabarit = readFileSync(join(ici, "../front/cerfa/gabarit/cerfa-11574-07.pdf"));
writeFileSync(sortie, await remplirCerfa(gabarit, saisies));
console.log(`\nPDF écrit : ${sortie}`);
