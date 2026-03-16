// CLI entry point — re-exports from src/lib/agent.ts
export { parseCommand, executeCommand } from "../src/lib/agent";
export type { AgentCommand, AgentStatusResponse } from "../src/lib/agent";

import { parseCommand, executeCommand } from "../src/lib/agent";

if (process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js")) {
  const input = process.argv.slice(2).join(" ") || "help";
  const cmd = parseCommand(input);
  executeCommand(cmd).then(console.log).catch(console.error);
}
