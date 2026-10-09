// Le travail en cours : PR ouvertes, branches sans PR, tâches, specs en
// `doing`, tickets Notion en développement ou en revue.

import { unmergedBranches } from "./branches.ts";
import type { Invocation } from "./invocation.ts";
import { emit, section } from "./output.ts";
import {
  branchesWithPullRequest,
  openPullRequests,
  type PullRequest,
  renderPullRequests,
} from "./pull-requests.ts";
import { listTaches, renderTaches, type Tache } from "./tasks.ts";
import {
  renderTickets,
  type TicketsView,
  ticketsBeyondSpecs,
} from "./tickets.ts";
import { listSpecs, renderSpecs, type Spec } from "./trackers.ts";

export type Wip = TicketsView & {
  /** Absent si `gh` ne répond pas. */
  prs: PullRequest[] | undefined;
  branches: string[];
  taches: Tache[];
  specs: Spec[];
};

/** `tsp wip` */
export async function wipCommand(invocation: Invocation): Promise<number> {
  emit(invocation.options.json, await readWip(invocation.root), renderWip);
  return 0;
}

export async function readWip(root: string): Promise<Wip> {
  const all = listSpecs(root);
  return {
    prs: openPullRequests(root),
    branches: unmergedBranches(root, branchesWithPullRequest(root)),
    taches: listTaches(root),
    specs: all.filter((spec) => spec.etat === "doing"),
    ...(await ticketsBeyondSpecs(root, STATUTS, all)),
  };
}

export function renderWip(wip: Wip): string {
  return [
    section("PR ouvertes", renderPullRequests(wip.prs)),
    section("Branches sans PR", wip.branches.join("\n")),
    section("Tâches", renderTaches(wip.taches)),
    section("Specs en cours", renderSpecs(wip.specs)),
    section("Tickets Notion en cours", renderTickets(wip)),
  ].join("\n\n");
}

// ---- implémentation ----

/** `Staging` n'y est pas : c'est livré, en attente de mise en production. */
const STATUTS = ["Doing Dev", "Reviewing dev"];
