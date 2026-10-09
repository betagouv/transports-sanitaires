// Le travail à prendre : les specs en `todo` puis en `backlog`, et les tickets
// Notion prêts à développer.

import type { Invocation } from "./invocation.ts";
import { emit, section } from "./output.ts";
import {
  renderTickets,
  type TicketsView,
  ticketsBeyondSpecs,
} from "./tickets.ts";
import { listSpecs, renderSpecs, type Spec } from "./trackers.ts";

/** `tsp next` */
export async function nextCommand(invocation: Invocation): Promise<number> {
  const { root, options } = invocation;
  const all = listSpecs(root);
  const specs = [
    ...all.filter((spec) => spec.etat === "todo"),
    ...all.filter((spec) => spec.etat === "backlog"),
  ];
  const next: Next = {
    specs,
    ...(await ticketsBeyondSpecs(root, STATUTS, specs)),
  };
  emit(options.json, next, render);
  return 0;
}

// ---- implémentation ----

type Next = TicketsView & { specs: Spec[] };

const STATUTS = ["Ready To Dev"];

function render(next: Next): string {
  return [
    section("Specs à prendre", renderSpecs(next.specs)),
    section("Tickets Notion", renderTickets(next)),
  ].join("\n\n");
}
