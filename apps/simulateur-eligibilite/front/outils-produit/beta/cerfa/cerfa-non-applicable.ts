// L'erreur commune aux deux formulaires : la situation ne conduit pas à celui-là.

/** Levée quand la situation ne conduit pas à ce CERFA (autre document, ou aucun). */
export class CerfaNonApplicable extends Error {
  readonly casFinal: string;

  constructor(casFinal: string, attendu: string) {
    super(
      `Ce CERFA ne s'applique pas : le simulateur conclut à « ${casFinal} », ` +
        `et non à « ${attendu} ».`,
    );
    this.name = "CerfaNonApplicable";
    this.casFinal = casFinal;
  }
}
