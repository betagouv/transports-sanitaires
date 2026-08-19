// Démarre une app Express sur un référentiel injecté, sans mock : les tests
// l'interrogent par de vraies requêtes HTTP, sur un port éphémère.

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { creerApp } from "../../server/app.ts";
import type { Referentiel } from "../../shared/referentiel.ts";

export const SECRET = "secret-de-test";

export type AppDeTest = { base: string; close: () => Promise<void> };

export async function demarrer(
  referentiel: Referentiel,
  pseudonymesEnClair = false,
): Promise<AppDeTest> {
  const app = creerApp(referentiel, { secret: SECRET, pseudonymesEnClair });
  const srv = await new Promise<Server>((resolve) => {
    // Express 5 passe une éventuelle erreur au callback : on ne la propage pas
    // dans `resolve`, qui n'attend rien.
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = srv.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        srv.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

export async function postTo(base: string, path: string, body: unknown) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

export async function getFrom(base: string, path: string) {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}
