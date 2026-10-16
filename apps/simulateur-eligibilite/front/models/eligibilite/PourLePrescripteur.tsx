// Ce que le prescripteur lit au-dessus d'une fiche patient : son titre et la
// consigne de la remettre au patient. Le bloc ne s'imprime pas (`fr-no-print`,
// de DSFR) : seule la fiche, à remettre au patient, s'imprime.

// La phrase d'introduction vient de l'aperçu de l'éditeur : le catalogue ne la
// porte pas.
export function PourLePrescripteur({ titre }: { titre: string }) {
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
