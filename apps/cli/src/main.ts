// Point d'entrée de tsp : lit la ligne de commande, lance la commande, rend son
// code de sortie.

import { findCommand, helpText } from "./commands.ts";
import { readInvocation } from "./invocation.ts";
import { print, printError } from "./output.ts";

process.exitCode = await main(process.argv.slice(2));

// ---- implémentation ----

/** Une erreur prévue se dit en une ligne : pas de pile d'appels pour l'utilisateur. */
async function main(argv: string[]): Promise<number> {
  try {
    const { name, invocation } = readInvocation(argv);
    if (name === undefined || name === "help" || invocation.options.help) {
      print(helpText());
      return 0;
    }
    const command = findCommand(name);
    if (!command) {
      printError(`Commande inconnue : « ${name} ». Lance tsp help.`);
      return 1;
    }
    return await command(invocation);
  } catch (error) {
    printError(explain(error as NodeJS.ErrnoException));
    return 1;
  }
}

/** L'analyseur de Node parle anglais : une option refusée se redit en français. */
function explain(error: NodeJS.ErrnoException): string {
  if (!error.code?.startsWith("ERR_PARSE_ARGS")) return error.message;
  const option = /'([^']+)'/.exec(error.message)?.[1] ?? error.message;
  return `Option refusée : ${option}. Lance tsp help.`;
}
