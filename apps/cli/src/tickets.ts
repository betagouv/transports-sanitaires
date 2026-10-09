// Les tickets Notion d'une liste de statuts, sans ceux qu'une spec porte déjà :
// un travail suivi par une spec ne s'affiche que du côté des specs.

import {
  notionAccess,
  type Ticket,
  ticketId,
  ticketsByStatus,
} from "./notion.ts";
import { columns } from "./output.ts";
import type { Spec } from "./trackers.ts";

export type TicketsView = {
  tickets: Ticket[];
  /** `ok`, ou ce qui a empêché de lire Notion. */
  notion: string;
};

/** Ne lève jamais : sans jeton ou sans réseau, la vue le dit et reste vide. */
export async function ticketsBeyondSpecs(
  root: string,
  statuts: string[],
  specs: Spec[],
): Promise<TicketsView> {
  const notion = notionAccess(root);
  if (typeof notion === "string") return { tickets: [], notion };
  try {
    const linked = new Set(specs.map((spec) => ticketId(spec.notion ?? "")));
    const tickets = await ticketsByStatus(notion, statuts);
    return {
      tickets: tickets.filter((ticket) => !linked.has(ticket.id)),
      notion: "ok",
    };
  } catch (error) {
    return { tickets: [], notion: `erreur, ${(error as Error).message}` };
  }
}

export function renderTickets(view: TicketsView): string {
  if (view.notion !== "ok") return `Notion : ${view.notion}`;
  return columns(
    view.tickets.map((ticket) => [ticket.statut, ticket.title, ticket.url]),
  );
}
