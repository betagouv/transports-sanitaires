// Le travail à prendre : les specs en `todo` puis en `backlog`, et les tickets
// Notion prêts à développer. Le travail en cours le précède : on ne choisit pas
// la suite sans voir ce qui est déjà commencé.

import type { Invocation } from "./invocation.ts";
import { emit, section } from "./output.ts";
import {
  renderTickets,
  type TicketsView,
  ticketsBeyondSpecs,
} from "./tickets.ts";
import { listSpecs, renderSpecs, type Spec } from "./trackers.ts";
import { readWip, renderWip, type Wip } from "./wip.ts";

/** `tsp next` */
export async function nextCommand(invocation: Invocation): Promise<number> {
  const { root, options } = invocation;
  const all = listSpecs(root);
  const specs = [
    ...all.filter((spec) => spec.etat === "todo"),
    ...all.filter((spec) => spec.etat === "backlog"),
  ];
  const next: Next = {
    wip: await readWip(root),
    specs,
    ...(await ticketsBeyondSpecs(root, STATUTS, all)),
  };
  emit(options.json, next, render);
  return 0;
}

// ---- implémentation ----

type Next = TicketsView & { wip: Wip; specs: Spec[] };

const STATUTS = ["Ready To Dev"];

function render(next: Next): string {
  return [
    renderWip(next.wip),
    section("Specs à prendre", renderSpecs(next.specs)),
    section("Tickets Notion à prendre", renderTickets(next)),
  ].join("\n\n");
}
