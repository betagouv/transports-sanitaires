import type { Situation } from "publicodes";

// Passation de la situation de Partie 1 (médical) du prescripteur vers le
// secrétariat. Couture volontairement isolée : aujourd'hui un simple
// `sessionStorage` (même poste, enchaînement), demain un jeton serveur pour une
// reprise sur un autre poste — sans toucher aux deux outils.

const CLE = "transports-sanitaires:passation-p1";

export function emettrePassation(situation: Situation<string>): void {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(situation));
  } catch {
    // sessionStorage indisponible (mode privé strict, iframe cloisonnée) :
    // la passation échoue silencieusement, le secrétariat repartira à vide.
  }
}

export function reprendrePassation(): Situation<string> | null {
  try {
    const brut = sessionStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as Situation<string>) : null;
  } catch {
    return null;
  }
}

export function effacerPassation(): void {
  try {
    sessionStorage.removeItem(CLE);
  } catch {
    // idem : rien à nettoyer si le stockage est indisponible.
  }
}
