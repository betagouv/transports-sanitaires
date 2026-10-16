// Un texte du catalogue avec son gras et ses liens, affichés sans HTML : ce
// sont des éléments React, jamais du balisage injecté. Un lien s'ouvre dans un
// nouvel onglet, et le dit dans son titre.

import { segmentsDuTexte } from "./segments-du-texte";

export function TexteEnrichi({ texte }: { texte: string }) {
  return segmentsDuTexte(texte).map(({ cle, gras, lien, texte: morceau }) => {
    if (lien) {
      return (
        <a
          className="fr-link"
          href={lien}
          key={cle}
          rel="noopener noreferrer"
          target="_blank"
          title={`${morceau} - nouvelle fenêtre`}
        >
          {morceau}
        </a>
      );
    }
    return gras ? <strong key={cle}>{morceau}</strong> : morceau;
  });
}
