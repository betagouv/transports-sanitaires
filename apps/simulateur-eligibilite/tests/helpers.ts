import { makeEngine } from "./engine";

// Situation de base éligible : aucune situation particulière, patient non
// hospitalisé, motif hospitalisation/séance.
export const baseEligible = {
  "question 1 . situation particuliere": "'Aucune de ces situations'",
  "question 2 . patient hospitalise": "non",
  "question 3 . motif principal": "'Hospitalisation ou séance assimilée'",
};

export function evalRule(
  rule: string,
  situation: Record<string, unknown>
): unknown {
  return makeEngine(situation).evaluate(rule).nodeValue;
}
