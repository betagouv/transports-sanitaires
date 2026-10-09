// Tenir le ticket Notion d'une spec : le créer, puis le garder à jour. La spec
// fait foi, à sens unique.

import fs from "node:fs";
import path from "node:path";
import { git } from "./git.ts";
import type { Invocation } from "./invocation.ts";
import { section } from "./markdown.ts";
import {
  advances,
  type Block,
  createTicket,
  type Notion,
  notionAccess,
  readTicket,
  ticketId,
  updateTicket,
} from "./notion.ts";
import { print, printError } from "./output.ts";
import { withField } from "./spec-header.ts";
import { type Etat, findSpec, listSpecs, type Spec } from "./trackers.ts";

/** `tsp spec sync [id]` */
export async function syncCommand(invocation: Invocation): Promise<number> {
  const { root, args } = invocation;
  const notion = notionAccess(root);
  if (typeof notion === "string") {
    printError(
      `Notion : ${notion}. Renseigne NOTION_TOKEN et NOTION_DATABASE_ID dans .env.`,
    );
    return 1;
  }
  const specs =
    args[0] === undefined ? listSpecs(root) : specById(root, args[0]);
  if (specs.length === 0) {
    printError(
      `Aucune spec à synchroniser${args[0] ? ` : « ${args[0]} »` : ""}.`,
    );
    return 1;
  }
  let failures = 0;
  for (const spec of specs) {
    try {
      print(`${spec.id}  ${await syncSpec(root, notion, spec)}`);
    } catch (error) {
      failures += 1;
      printError(`${spec.id}  ${(error as Error).message}`);
    }
  }
  return failures === 0 ? 0 : 1;
}

/** Crée ou met à jour le ticket d'une spec, et dit ce qui a été fait. */
export async function syncSpec(
  root: string,
  notion: Notion,
  spec: Spec,
): Promise<string> {
  const statut = STATUT_BY_ETAT[spec.etat];
  if (!statut) return "brouillon, pas de ticket";
  return spec.notion
    ? refresh(root, notion, spec, statut)
    : create(root, notion, spec, statut);
}

// ---- implémentation ----

/** Un brouillon n'a pas de ticket. `Reviewing dev` et `Prod / Done` se posent à la main. */
const STATUT_BY_ETAT: Record<Etat, string | undefined> = {
  drafts: undefined,
  backlog: "To Do",
  todo: "Ready To Dev",
  doing: "Doing Dev",
  done: "Staging",
};

/** Les sections de la spec recopiées dans le corps du ticket, à sa création. */
const COPIED_SECTIONS = ["Problem Statement", "Solution"];

function specById(root: string, id: string): Spec[] {
  const spec = findSpec(root, id);
  return spec ? [spec] : [];
}

async function create(
  root: string,
  notion: Notion,
  spec: Spec,
  statut: string,
): Promise<string> {
  const file = path.join(root, spec.file);
  const markdown = fs.readFileSync(file, "utf8");
  const ticket = await createTicket(notion, {
    title: spec.title,
    statut,
    link: githubUrl(root, spec.file),
    body: body(markdown),
  });
  fs.writeFileSync(file, withField(markdown, "notion", ticket.url));
  return `ticket créé (${statut}), lien écrit dans la spec : ${ticket.url}`;
}

/** Le corps du ticket n'est jamais réécrit, et son statut ne recule jamais. */
async function refresh(
  root: string,
  notion: Notion,
  spec: Spec,
  statut: string,
): Promise<string> {
  const id = ticketId(spec.notion ?? "");
  if (!id) return `lien Notion illisible : ${spec.notion}`;
  const current = await readTicket(notion, id);
  const forward = advances(current.statut, statut);
  await updateTicket(notion, id, {
    title: spec.title,
    link: githubUrl(root, spec.file),
    statut: forward ? statut : undefined,
  });
  return forward
    ? `ticket mis à jour (${current.statut} → ${statut})`
    : `ticket mis à jour (statut gardé : ${current.statut})`;
}

function body(markdown: string): Block[] {
  return COPIED_SECTIONS.flatMap((heading) => {
    const text = section(markdown, heading);
    if (text === "") return [];
    const paragraphs = text
      .split(/\n{2,}/)
      .map((each): Block => ({ kind: "paragraph", text: each }));
    return [{ kind: "heading", text: heading }, ...paragraphs];
  });
}

/** L'adresse du fichier sur GitHub, dans `staging` : c'est là que la spec arrive. */
function githubUrl(root: string, file: string): string {
  const remote = git(root, ["remote", "get-url", "origin"]);
  const repo = /github\.com[:/](.+?)(?:\.git)?$/.exec(remote)?.[1] ?? remote;
  const encoded = file.split(path.sep).map(encodeURIComponent).join("/");
  return `https://github.com/${repo}/blob/staging/${encoded}`;
}
