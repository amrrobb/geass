import { NextRequest, NextResponse } from "next/server";
import { parseCommand, executeCommand } from "@/lib/agent";

export const dynamic = "force-dynamic";

const ALLOWED_FIRST_WORDS = new Set([
  "status", "send", "balance", "help", "setup", "create", "init",
  "set-policy", "policy", "auth", "authenticate", "history", "log",
]);

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Missing command" }, { status: 400 });
    }

    const firstWord = command.trim().split(/\s+/)[0].toLowerCase();
    if (!ALLOWED_FIRST_WORDS.has(firstWord)) {
      return NextResponse.json(
        { error: `Command "${firstWord}" not allowed` },
        { status: 403 }
      );
    }

    const cmd = parseCommand(command);
    const raw = await executeCommand(cmd);

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ result: raw });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
