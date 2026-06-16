import Engine from "publicodes";
import type { RawPublicodes } from "publicodes";
import yaml from "js-yaml";

const modules = import.meta.glob("../regles/*.publicodes", {
  query: "?raw",
  import: "default",
  eager: true,
});

const rules = Object.values(modules).reduce<RawPublicodes<string>>(
  (acc, content) => {
    const parsed = yaml.load(content as string) as RawPublicodes<string>;
    return { ...acc, ...parsed };
  },
  {}
);

export const engine = new Engine(rules, {
  flag: { filterNotApplicablePossibilities: true },
});
