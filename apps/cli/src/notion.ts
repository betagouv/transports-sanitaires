// Les tickets de la base Notion : les lire par statut, en créer un, en mettre
// un à jour.

import { setting } from "./settings.ts";

export type Ticket = { id: string; titre: string; statut: string; url: string };

export type Notion = { token: string; database: string; api: string };

/** Un morceau du corps d'un ticket : un intertitre ou un paragraphe. */
export type Block = { kind: "heading" | "paragraph"; text: string };

export type TicketDraft = {
  titre: string;
  statut: string;
  lien: string;
  corps: Block[];
};

/** Ce qu'une mise à jour écrit. Sans statut, celui du ticket ne bouge pas. */
export type TicketChange = { titre: string; statut?: string; lien: string };

/** L'accès à Notion, ou ce qui manque dans le `.env` pour l'avoir. */
export function notionAccess(
  root: string,
): Notion | "jeton absent" | "base absente" {
  const token = setting(root, "NOTION_TOKEN");
  const database = setting(root, "NOTION_DATABASE_ID");
  if (!token) return "jeton absent";
  if (!database) return "base absente";
  const api = setting(root, "NOTION_API_URL") ?? "https://api.notion.com";
  return { token, database, api };
}

/** L'identifiant de la page que désigne une adresse Notion, sans tirets. */
export function ticketId(url: string): string | undefined {
  const match = /([0-9a-f]{32})(?:[?#].*)?$/i.exec(url.replaceAll("-", ""));
  return match?.[1]?.toLowerCase();
}

/** Vrai si `to` est plus loin que `from` dans le cycle de vie d'un ticket. */
export function advances(from: string, to: string): boolean {
  return STATUTS.indexOf(to) > STATUTS.indexOf(from);
}

export async function ticketsByStatus(
  notion: Notion,
  statuts: string[],
): Promise<Ticket[]> {
  const filter = {
    or: statuts.map((statut) => ({
      property: STATUS,
      status: { equals: statut },
    })),
  };
  const tickets: Ticket[] = [];
  let cursor: string | undefined;
  do {
    const body = { filter, page_size: 100, start_cursor: cursor };
    const path = `/databases/${notion.database}/query`;
    const page = (await call(notion, "POST", path, body)) as PageList;
    tickets.push(...page.results.map(toTicket));
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return tickets;
}

export async function readTicket(notion: Notion, id: string): Promise<Ticket> {
  return toTicket((await call(notion, "GET", `/pages/${id}`)) as Page);
}

export async function createTicket(
  notion: Notion,
  draft: TicketDraft,
): Promise<Ticket> {
  const body = {
    parent: { database_id: notion.database },
    properties: {
      ...properties(draft),
      [TYPE]: { multi_select: [{ name: "Tech" }] },
    },
    children: draft.corps.slice(0, MAX_BLOCKS).map(toBlock),
  };
  return toTicket((await call(notion, "POST", "/pages", body)) as Page);
}

export async function updateTicket(
  notion: Notion,
  id: string,
  change: TicketChange,
): Promise<void> {
  await call(notion, "PATCH", `/pages/${id}`, {
    properties: properties(change),
  });
}

// ---- implémentation ----

/** Les noms des propriétés de `[BDD] Tasks`. */
const TITLE = "Task";
const STATUS = "Status P&T";
const TYPE = "Type";
const LINK = "URL";

/** Le cycle de vie d'un ticket, dans l'ordre. */
const STATUTS = [
  "To Do",
  "Doing Product",
  "Ready To Dev",
  "Doing Dev",
  "Reviewing dev",
  "Staging",
  "Prod / Done",
  "Archived",
];

/** Les plafonds de l'API : blocs par requête, caractères par texte. */
const MAX_BLOCKS = 100;
const MAX_TEXT = 2000;

type Page = {
  id: string;
  url: string;
  properties: Record<
    string,
    { title?: { plain_text: string }[]; status?: { name: string } | null }
  >;
};

type PageList = {
  results: Page[];
  has_more: boolean;
  next_cursor: string | null;
};

async function call(
  notion: Notion,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(`${notion.api}/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${notion.token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const answer = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(
      `Notion a répondu ${response.status} : ${answer.message ?? "sans message"}`,
    );
  }
  return answer;
}

function toTicket(page: Page): Ticket {
  const titre = (page.properties[TITLE]?.title ?? [])
    .map((part) => part.plain_text)
    .join("");
  return {
    id: page.id.replaceAll("-", ""),
    titre,
    statut: page.properties[STATUS]?.status?.name ?? "",
    url: page.url,
  };
}

function properties(change: TicketChange) {
  return {
    [TITLE]: { title: [text(change.titre)] },
    [LINK]: { url: change.lien },
    ...(change.statut ? { [STATUS]: { status: { name: change.statut } } } : {}),
  };
}

function toBlock(block: Block) {
  const type = block.kind === "heading" ? "heading_2" : "paragraph";
  return { object: "block", type, [type]: { rich_text: [text(block.text)] } };
}

function text(content: string) {
  return { type: "text", text: { content: content.slice(0, MAX_TEXT) } };
}
