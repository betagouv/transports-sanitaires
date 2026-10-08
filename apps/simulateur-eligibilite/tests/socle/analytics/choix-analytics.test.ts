// Le pont avec la page qui embarque l'app. Le simulateur demande le choix de
// l'utilisateur sur la mesure d'audience, et le CMS répond. La page parente est
// une vraie fenêtre d'iframe. Elle répond par de vrais évènements `message`.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ChoixAnalytics,
  suivreChoixAnalytics,
} from "../../../front/socle/analytics/choix-analytics";

function pageParente() {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const parent = iframe.contentWindow as Window;
  const demandes: unknown[] = [];
  parent.addEventListener("message", (e) =>
    demandes.push((e as MessageEvent).data),
  );
  const repondre = (data: unknown, source: Window = parent) =>
    window.dispatchEvent(new MessageEvent("message", { data, source }));
  return { parent, demandes, repondre };
}

function suivre(options: Parameters<typeof suivreChoixAnalytics>[1]) {
  const choix: ChoixAnalytics[] = [];
  suivreChoixAnalytics((c) => choix.push(c), options);
  return choix;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("choix de l'utilisateur sur la mesure d'audience", () => {
  it("hors iframe, mesure sans rien demander", () => {
    expect(suivre({ parent: window })).toEqual(["suivi"]);
  });

  it("dans l'iframe, demande le choix à la page qui l'embarque", async () => {
    const { parent, demandes } = pageParente();
    suivre({ parent });
    await vi.waitFor(() =>
      expect(demandes).toEqual([{ type: "statistiques-simulateur:demande" }]),
    );
  });

  it("applique le refus transmis par la page", () => {
    const { parent, repondre } = pageParente();
    const choix = suivre({ parent });
    repondre({ type: "statistiques-simulateur:choix", suivi: false });
    expect(choix).toEqual(["refus"]);
  });

  it("suit les changements ultérieurs du choix", () => {
    const { parent, repondre } = pageParente();
    const choix = suivre({ parent });
    repondre({ type: "statistiques-simulateur:choix", suivi: false });
    repondre({ type: "statistiques-simulateur:choix", suivi: true });
    expect(choix).toEqual(["refus", "suivi"]);
  });

  it("n'écoute que la page qui l'embarque", () => {
    const { parent } = pageParente();
    const { parent: autre, repondre } = pageParente();
    const choix = suivre({ parent, delaiMs: 60_000 });
    repondre({ type: "statistiques-simulateur:choix", suivi: false }, autre);
    expect(choix).toEqual([]);
  });

  it("sans réponse de la page, mesure au bout du délai", async () => {
    const { parent } = pageParente();
    const choix = suivre({ parent, delaiMs: 10 });
    expect(choix).toEqual([]);
    await vi.waitFor(() => expect(choix).toEqual(["suivi"]));
  });
});
