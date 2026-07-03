import { makeEngine } from "./engine";

// Situation de base éligible : aucune situation particulière, patient non
// hospitalisé, motif hospitalisation/séance.
export const baseEligible = {
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
