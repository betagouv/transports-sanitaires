// Le script que le CMS (Sites Conformes) exécute sur ses pages. Il ajoute
// l'opt-out au pied de page et répond au simulateur embarqué. Chaque test le
// charge dans une fenêtre neuve, avec le vrai pied de page DSFR. Le simulateur
// est une fenêtre qui relève les messages reçus.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { racine } from "../../inspection-des-sources";

const SOURCE = readFileSync(
  join(racine, "cms", "statistiques-simulateur.js"),
  "utf-8",
);
const ORIGINE_SIMULATEUR = /ORIGINE_SIMULATEUR = "([^"]+)"/.exec(SOURCE)?.[1];

const PIED_DE_PAGE = `
  <footer class="fr-footer">
    <div class="fr-footer__bottom">
      <ul class="fr-footer__bottom-list">
        <li class="fr-footer__bottom-item">
          <a class="fr-footer__bottom-link" href="/plan-du-site">Plan du site</a>
        </li>
      </ul>
    </div>
  </footer>`;

function pageDuCms({ refusMemorise = false } = {}) {
  const fenetre = new Window({ url: "https://cms.test/" });
  fenetre.document.body.innerHTML = PIED_DE_PAGE;
  if (refusMemorise) {
    fenetre.localStorage.setItem("statistiques-simulateur-refusees", "1");
  }
  new Function("window", "document", "localStorage", SOURCE)(
    fenetre,
    fenetre.document,
    fenetre.localStorage,
  );

  const simulateur = {
    recus: [] as Array<{ message: unknown; origine: string }>,
    postMessage(message: unknown, origine: string) {
      this.recus.push({ message, origine });
    },
  };
  const demander = (origin = ORIGINE_SIMULATEUR) =>
    fenetre.dispatchEvent(
      new fenetre.MessageEvent("message", {
        data: { type: "statistiques-simulateur:demande" },
        origin,
        source: simulateur as never,
      }),
    );
  const bouton = () =>
    fenetre.document.querySelector(
      ".fr-footer__bottom-list li:last-child button",
    ) as unknown as HTMLButtonElement;
  return { simulateur, demander, bouton };
}

const choix = (suivi: boolean) => ({
  message: { type: "statistiques-simulateur:choix", suivi },
  origine: ORIGINE_SIMULATEUR,
});

describe("opt-out de la mesure d'audience, côté CMS", () => {
  it("ajoute l'opt-out à la fin du pied de page", () => {
    const { bouton } = pageDuCms();
    expect(bouton().textContent).toBe(
      "Désactiver la mesure d'audience du simulateur",
    );
    expect(bouton().className).toBe("fr-footer__bottom-link");
  });

  it("répond au simulateur que la mesure est acceptée par défaut", () => {
    const { simulateur, demander } = pageDuCms();
    demander();
    expect(simulateur.recus).toEqual([choix(true)]);
  });

  it("ne répond qu'au simulateur, pas à une autre origine", () => {
    const { simulateur, demander } = pageDuCms();
    demander("https://ailleurs.test");
    expect(simulateur.recus).toEqual([]);
  });

  it("au clic, prévient le simulateur du refus et change son libellé", () => {
    const { simulateur, demander, bouton } = pageDuCms();
    demander();
    bouton().click();

    expect(simulateur.recus.at(-1)).toEqual(choix(false));
    expect(bouton().textContent).toBe(
      "Réactiver la mesure d'audience du simulateur",
    );
  });

  it("se souvient du refus d'une visite précédente", () => {
    const { simulateur, demander, bouton } = pageDuCms({
      refusMemorise: true,
    });
    demander();
    expect(simulateur.recus).toEqual([choix(false)]);
    expect(bouton().textContent).toBe(
      "Réactiver la mesure d'audience du simulateur",
    );
  });

  it("un second clic réactive la mesure", () => {
    const { simulateur, demander, bouton } = pageDuCms();
    demander();
    bouton().click();
    bouton().click();
    expect(simulateur.recus.at(-1)).toEqual(choix(true));
  });
});
