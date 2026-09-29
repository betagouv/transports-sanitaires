// @vitest-environment node
//
// La configuration est lue depuis un environnement passé en paramètre : ces tests
// n'ont donc rien à simuler, ils décrivent des déploiements possibles. Ce qu'ils
// gardent est la promesse tenue à l'exploitant : en production, une variable sans
// valeur par défaut arrête le démarrage au lieu de laisser tourner un serveur qui
// sert un référentiel factice. Et, schéma zod oblige, une variable présente mais
// mal formée l'arrête aussi.

import { describe, expect, it } from "vitest";
import {
  ErreurDeConfiguration,
  lireConfiguration,
} from "../../server/configuration.ts";

const PROD = { NODE_ENV: "production" };
const CLE = "cle-grist";
const COMPLET = { ...PROD, GRIST_API_KEY: CLE };

describe("configuration du serveur en production", () => {
  it("refuse de démarrer et nomme la variable manquante", () => {
    expect(() => lireConfiguration(PROD)).toThrow(ErreurDeConfiguration);
    try {
      lireConfiguration(PROD);
    } catch (erreur) {
      expect((erreur as ErreurDeConfiguration).variables).toEqual([
        "GRIST_API_KEY",
      ]);
    }
  });

  it("tient une variable posée mais vide pour absente", () => {
    const vide = { ...COMPLET, GRIST_API_KEY: "  " };
    expect(() => lireConfiguration(vide)).toThrow(/GRIST_API_KEY/);
  });

  it("démarre dès que la clé Grist est fournie", () => {
    const config = lireConfiguration(COMPLET);
    expect(config.grist?.cleApi).toBe(CLE);
  });

  it("n'exige plus de secret de pseudonymisation", () => {
    // Un ancien déploiement peut encore la porter : elle est ignorée, sans erreur.
    const config = lireConfiguration({
      ...COMPLET,
      PSEUDONYMISATION_SECRET: "reste-d-un-ancien-deploiement",
    });
    expect(config).not.toHaveProperty("secret");
  });

  it("laisse leur défaut aux variables qui en ont un", () => {
    const config = lireConfiguration(COMPLET);
    expect(config.port).toBe(3000);
    expect(config.grist?.docUrl).toMatch(/^https:\/\/grist\./);
  });
});

describe("variables mal formées", () => {
  it("refuse un port qui n'est pas un entier positif", () => {
    expect(() => lireConfiguration({ PORT: "quatre-mille" })).toThrow(/PORT/);
    expect(() => lireConfiguration({ PORT: "-1" })).toThrow(/PORT/);
  });

  it("refuse une URL de doc Grist qui n'en est pas une", () => {
    expect(() => lireConfiguration({ GRIST_DOC_URL: "grist.example" })).toThrow(
      /GRIST_DOC_URL/,
    );
  });

  it("nomme la variable et dit ce qui cloche", () => {
    try {
      lireConfiguration({ PORT: "quatre-mille" });
      expect.unreachable("la configuration aurait dû être refusée");
    } catch (erreur) {
      expect((erreur as Error).message).toContain("PORT : doit être");
    }
  });
});

describe("configuration du serveur hors production", () => {
  it("se replie sur le snapshot", () => {
    const config = lireConfiguration({});
    expect(config.grist).toBeUndefined();
  });

  it("prend l'accès Grist quand la clé est là", () => {
    const config = lireConfiguration({
      GRIST_API_KEY: CLE,
      GRIST_DOC_URL: "https://grist.example/api/docs/abc",
      PORT: "4000",
    });
    expect(config.grist).toEqual({
      cleApi: CLE,
      docUrl: "https://grist.example/api/docs/abc",
    });
    expect(config.port).toBe(4000);
  });
});
