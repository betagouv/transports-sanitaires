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
import { listTasks, renderTasks, type Tache } from "./tasks.ts";
import {
  renderTickets,
  type TicketsView,
  ticketsBeyondSpecs,
} from "./tickets.ts";
import { listSpecs, renderSpecs, type Spec } from "./trackers.ts";

/** `tsp wip` */
export async function wipCommand(invocation: Invocation): Promise<number> {
  const { root, options } = invocation;
  const prs = openPullRequests(root);
  const specs = listSpecs(root).filter((spec) => spec.etat === "doing");
  const wip: Wip = {
    prs,
    branches: unmergedBranches(root, branchesWithPullRequest(root)),
    taches: listTasks(root),
    specs,
    ...(await ticketsBeyondSpecs(root, STATUTS, specs)),
  };
  emit(options.json, wip, render);
  return 0;
}

// ---- implémentation ----

type Wip = TicketsView & {
  /** Absent si `gh` ne répond pas. */
  prs: PullRequest[] | undefined;
  branches: string[];
  taches: Tache[];
  specs: Spec[];
};

/** `Staging` n'y est pas : c'est livré, en attente de mise en production. */
const STATUTS = ["Doing Dev", "Reviewing dev"];

function render(wip: Wip): string {
  return [
    section("PR ouvertes", renderPullRequests(wip.prs)),
    section("Branches sans PR", wip.branches.join("\n")),
    section("Tâches", renderTasks(wip.taches)),
    section("Specs en cours", renderSpecs(wip.specs)),
    section("Tickets Notion", renderTickets(wip)),
  ].join("\n\n");
}
