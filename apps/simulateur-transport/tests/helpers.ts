import { makeEngine } from "./engine";

// Prescripteur complètement identifié (condition minimale pour que la
// simulation soit possible).
export const identifie = {
  "identification . etablissement renseigne": "oui",
  "identification . service renseigne": "oui",
  "identification . prescripteur renseigne": "oui",
  "identification . prescripteur autre": "non",
};

// Situation de base éligible : prescripteur identifié, aucune situation
// particulière, patient non hospitalisé, motif hospitalisation/séance.
export const baseEligible = {
  ...identifie,
  "question 1 . situation particuliere": "'aucune'",
  "question 2 . patient hospitalise": "non",
  "question 3 . motif principal": "'hospitalisation-ou-seance-assimilee'",
};

export function evalRule(
  rule: string,
  situation: Record<string, unknown>
): unknown {
  return makeEngine(situation).evaluate(rule).nodeValue;
}
