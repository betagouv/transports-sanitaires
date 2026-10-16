// La fiche patient négative (#134). Au-dessus, ce que le prescripteur lit : ce
// bloc ne s'imprime pas (`fr-no-print`, de DSFR). Seule la fiche, à remettre
// au patient, s'imprime. Le composant range un `TexteDeLaFicheNegative` ; il
// n'écrit aucun texte de l'éditeur.

import type { TexteDeLaFicheNegative } from "./texte-de-la-fiche-negative";

type Bloc = TexteDeLaFicheNegative["finance"];

export function FicheNegative({ texte }: { texte: TexteDeLaFicheNegative }) {
  return (
    <>
      <PourLePrescripteur titre={texte.titreDuPrescripteur} />
      <article
        aria-label="Fiche explicative patient"
        className="fr-p-3w fr-mb-4w"
      >
        <h2 className="fr-h3">{texte.titreDuPatient}</h2>
        <p className="fr-text--lead">{texte.raison}</p>
        <Cartes intro={texte.introDesCartes} cartes={texte.cartes} />
        <Consignes consignes={texte.consignes} />
        {texte.conseilAld && <ConseilAld texte={texte.conseilAld} />}
        <Finance bloc={texte.finance} />
      </article>
    </>
  );
}

// ---- implémentation ----

// La phrase d'introduction vient de l'aperçu de l'éditeur : le catalogue ne la
// porte pas.
function PourLePrescripteur({ titre }: { titre: string }) {
  return (
    <section aria-label="Résultat pour le praticien" className="fr-no-print">
      <h2 className="fr-h3">{titre}</h2>
      <p>
        Vous trouverez ci-dessous une fiche explicative officielle de
        l’Assurance Maladie à remettre à votre patient.
      </p>
    </section>
  );
}

type CartesProps = { intro: Bloc; cartes: readonly Bloc[] };

function Cartes({ intro, cartes }: CartesProps) {
  return (
    <section aria-labelledby="cartes-titre">
      <h3 className="fr-h5" id="cartes-titre">
        {intro.title}
      </h3>
      <p>{intro.text}</p>
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-3w">
        {cartes.map((carte) => (
          <div className="fr-col-12 fr-col-md-4" key={carte.title}>
            <div className="fr-card">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <h4 className="fr-card__title">{carte.title}</h4>
                  <p className="fr-card__desc">{carte.text}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Consignes({
  consignes,
}: {
  consignes: TexteDeLaFicheNegative["consignes"];
}) {
  return (
    <section aria-labelledby="consignes-titre">
      <h3 className="fr-h5" id="consignes-titre">
        {consignes.titre}
      </h3>
      {consignes.sousTitre && (
        <p className="fr-text--bold">{consignes.sousTitre}</p>
      )}
      <p>{consignes.texte}</p>
      {consignes.etapes.length > 0 && (
        <ol>
          {consignes.etapes.map((etape) => (
            <li key={etape}>{etape}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ConseilAld({ texte }: { texte: string }) {
  return (
    <aside
      aria-label="Information importante concernant les affections de longue durée"
      className="fr-callout fr-callout--yellow-moutarde"
    >
      <p className="fr-callout__text">
        {enGras(texte).map(({ debut, gras, texte: morceau }) =>
          gras ? <strong key={debut}>{morceau}</strong> : morceau,
        )}
      </p>
    </aside>
  );
}

function Finance({ bloc }: { bloc: Bloc }) {
  return (
    <aside aria-labelledby="finance-titre" className="fr-callout">
      <h3 className="fr-callout__title" id="finance-titre">
        {bloc.title}
      </h3>
      <p className="fr-callout__text">{bloc.text}</p>
    </aside>
  );
}

// Le catalogue met en gras avec `**…**`. Chaque morceau garde sa position
// dans le texte, qui lui sert de clé.
function enGras(texte: string) {
  let debut = 0;
  return texte.split("**").map((morceau, rang) => {
    const segment = { debut, gras: rang % 2 === 1, texte: morceau };
    debut += morceau.length + 2;
    return segment;
  });
}
