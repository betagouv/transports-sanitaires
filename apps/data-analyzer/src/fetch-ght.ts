// fetch-ght — aspire le référentiel GHT open data dans data/ght/ (non versionné).
//
// Source : data.gouv.fr, dataset `etablissements-de-sante-par-ght` (licence ODbL). Le
// dataset expose un bundle FHIR JSON par GHT, en plusieurs versions ; on ne garde que la
// plus récente de chaque titre. L'adaptateur `ght-fhir-datagouv` lit ensuite ce dossier.
//
// Séparé du pipeline (réseau) pour que `npm run etl` reste déterministe et hors-ligne :
//   npm run fetch-ght   # une fois (puis à chaque rafraîchissement voulu du référentiel)
//   npm run etl

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Paths } from "./paths.ts";

const DATASET = "https://www.data.gouv.fr/api/1/datasets/etablissements-de-sante-par-ght/";
const CONCURRENCE = 8;

interface Ressource {
  title: string;
  format: string;
  url: string;
  last_modified: string;
}

export class FetchGht {
  async execute(): Promise<void> {
    const ressources = this.#dernieresVersions(await this.#listerJson());
    mkdirSync(Paths.DATA_GHT, { recursive: true });
    console.log(`fetch-ght : ${ressources.length} bundles GHT → ${Paths.DATA_GHT}`);
    await this.#telechargerTout(ressources);
    console.log("fetch-ght : terminé.");
  }

  async #listerJson(): Promise<Ressource[]> {
    const dataset = (await this.#getJson(DATASET)) as { resources: Ressource[] };
    return dataset.resources.filter((r) => r.format === "json");
  }

  // Plusieurs versions par titre : on retient la plus récemment modifiée.
  #dernieresVersions(ressources: Ressource[]): Ressource[] {
    const parTitre = new Map<string, Ressource>();
    for (const r of ressources) {
      const courant = parTitre.get(r.title);
      if (!courant || r.last_modified > courant.last_modified) parTitre.set(r.title, r);
    }
    return [...parTitre.values()];
  }

  async #telechargerTout(ressources: Ressource[]): Promise<void> {
    const file = [...ressources];
    let faits = 0;
    const worker = async (): Promise<void> => {
      let r: Ressource | undefined;
      while ((r = file.pop())) {
        await this.#telecharger(r);
        if (++faits % 20 === 0) console.log(`  … ${faits}/${ressources.length}`);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCE }, worker));
  }

  async #telecharger(r: Ressource): Promise<void> {
    const reponse = await fetch(r.url);
    if (!reponse.ok) throw new Error(`Téléchargement échoué (${reponse.status}) : ${r.url}`);
    writeFileSync(join(Paths.DATA_GHT, r.title), await reponse.text());
  }

  async #getJson(url: string): Promise<unknown> {
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error(`Requête échouée (${reponse.status}) : ${url}`);
    return reponse.json();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await new FetchGht().execute();
