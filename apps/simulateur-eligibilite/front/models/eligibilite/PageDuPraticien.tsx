// La page du praticien : ce que la caisse, l'établissement, la permission, la
// convocation et le transport à l'étranger montrent à la place d'une fiche
// patient (D-112). Elle range un `TexteDuPraticien` ; elle n'écrit que ses
// intertitres, ceux des aperçus de l'éditeur.

import type { ElementDuPourquoi, TexteDuPraticien } from "./texte-du-praticien";

export function PageDuPraticien({ texte }: { texte: TexteDuPraticien }) {
  return (
    <>
      <h2 className="fr-h3">{texte.titre}</h2>
      {texte.introduction && (
        <p className="fr-text--lead">{texte.introduction}</p>
      )}
      {texte.pourquoi && <Pourquoi pourquoi={texte.pourquoi} />}
      <Questions questions={texte.questions} />
      <Actions actions={texte.actions} />
      {texte.avertissement && (
        <div className="fr-callout fr-callout--yellow-moutarde">
          <p className="fr-callout__text">{texte.avertissement}</p>
        </div>
      )}
    </>
  );
}

// ---- implémentation ----

type PourquoiProps = {
  pourquoi: { titre: string; elements: readonly ElementDuPourquoi[] };
};

function Pourquoi({ pourquoi }: PourquoiProps) {
  return (
    <section aria-labelledby="pourquoi">
      <h3 className="fr-h5" id="pourquoi">
        {pourquoi.titre}
      </h3>
      {pourquoi.elements.map((element) => (
        <Element key={element.texte} element={element} />
      ))}
    </section>
  );
}

function Element({ element }: { element: ElementDuPourquoi }) {
  return (
    <>
      {element.titre && (
        <p className="fr-text--bold fr-mb-1v">{element.titre}</p>
      )}
      <p>{element.texte}</p>
    </>
  );
}

function Questions({ questions }: { questions: readonly string[] }) {
  if (questions.length === 0) return null;
  return (
    <section aria-labelledby="questions">
      <h3 className="fr-h5" id="questions">
        Questions à transmettre à la caisse
      </h3>
      <p>
        Ces questions reprennent les points non tranchés. La caisse pourra
        préciser le document, le circuit et le financeur applicables.
      </p>
      <ul>
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </section>
  );
}

function Actions({ actions }: { actions: readonly string[] }) {
  if (actions.length === 0) return null;
  return (
    <section aria-labelledby="actions">
      <h3 className="fr-h5" id="actions">
        Que faire maintenant ?
      </h3>
      <ol>
        {actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ol>
    </section>
  );
}
