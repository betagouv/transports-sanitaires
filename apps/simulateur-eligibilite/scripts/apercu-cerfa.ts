// Aperçu de bout en bout : une situation du simulateur → un CERFA rempli.
//
//   npm run apercu-cerfa -- [sortie.pdf]
//
// Le PDF produit montre ce que le simulateur sait déduire (cases ❶ et ❷, trajet,
// urgence) et, par contraste, tout ce qui reste vierge — patient, adresses,
// identité du prescripteur.
//
// La situation est **celle du raccourci dev « Secrétariat — prescription (CERFA) »**
// (`raccourcis-dev.ts`) : le script et le bouton produisent ainsi exactement le même
// document, et il n'y a qu'une situation à faire évoluer.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Engine from "publicodes";
import type { RawPublicodes } from "publicodes";
import yaml from "js-yaml";
import { saisiesDepuisSituation } from "../front/cerfa/depuis-simulateur.ts";
import { remplirCerfa } from "../front/cerfa/remplir-cerfa.ts";
import { SITUATIONS_DEV } from "../front/app/raccourcis-dev.ts";

const ici = dirname(fileURLToPath(import.meta.url));
const règles = yaml.load(
  readFileSync(join(ici, "../regles/regles.publicodes"), "utf-8"),
) as RawPublicodes<string>;

const situation = SITUATIONS_DEV["secretariat-prescription"];

const moteur = new Engine(règles, { flag: { filterNotApplicablePossibilities: true } });
const saisies = saisiesDepuisSituation(moteur, situation);

console.log(`mode prescrit  : ${moteur.setSituation(situation).evaluate("cible_transport_sanitaire_prescrit").nodeValue}`);
console.log(`champs déduits : ${saisies.length}`);
for (const saisie of saisies) {
  console.log("  " + ("case" in saisie ? `[x] ${saisie.case.nom}` : `    ${saisie.champ} = ${saisie.texte}`));
}

const sortie = process.argv[2] ?? join(ici, "../apercu-cerfa.pdf");
const gabarit = readFileSync(join(ici, "../front/cerfa/gabarit/cerfa-11574-07.pdf"));
writeFileSync(sortie, await remplirCerfa(gabarit, saisies));
console.log(`\nPDF écrit : ${sortie}`);
