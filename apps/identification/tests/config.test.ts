import { afterEach, describe, expect, it } from "vitest";
import { simulateurBaseUrl } from "../src/config";

afterEach(() => {
  document
    .querySelectorAll('meta[name="simulateur-url"]')
    .forEach((el) => el.remove());
});

function setMeta(content: string) {
  const meta = document.createElement("meta");
  meta.name = "simulateur-url";
  meta.content = content;
  document.head.appendChild(meta);
}

describe("simulateurBaseUrl", () => {
  it("privilégie la balise meta runtime quand elle est renseignée", () => {
    setMeta("https://simulateur.exemple.gouv.fr");
    expect(simulateurBaseUrl()).toBe("https://simulateur.exemple.gouv.fr");
  });

  it("ignore une balise meta vide et retombe sur le défaut", () => {
    setMeta("   ");
    expect(simulateurBaseUrl()).toBe("http://localhost:5173");
  });

  it("utilise le défaut sans meta ni variable d'environnement", () => {
    expect(simulateurBaseUrl()).toBe("http://localhost:5173");
  });
});
