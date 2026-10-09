// La forme qu'impose GIT-003 : le type d'une branche, le sujet d'un commit ou
// d'une PR.

/** Les types que le hook `commit-msg` accepte. */
export const COMMIT_TYPES = [
  "feat",
  "fix",
  "docs",
  "refactor",
  "test",
  "chore",
  "build",
  "style",
  "ci",
  "perf",
  "revert",
];

/** `<type>(<scope>): <sujet>`, le scope étant facultatif. */
export function isConventionalSubject(subject: string): boolean {
  const types = COMMIT_TYPES.join("|");
  return new RegExp(`^(${types})(\\([a-z0-9-]+\\))?!?: [^ ]`).test(subject);
}
