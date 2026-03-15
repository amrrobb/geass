import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

const ALLOWED_COMMANDS = [
  "status", "send", "balance", "help", "setup", "create", "init",
  "set-policy", "policy", "auth", "authenticate", "history", "log",
];

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Missing command" }, { status: 400 });
    }

    const firstWord = command.trim().split(/\s+/)[0].toLowerCase();
    if (!ALLOWED_COMMANDS.includes(firstWord)) {
      return NextResponse.json(
        { error: `Command "${firstWord}" not allowed. Allowed: ${ALLOWED_COMMANDS.join(", ")}` },
        { status: 403 }
      );
    }

    const raw = execSync(`tsx agent/index.ts ${command}`, {
      encoding: "utf-8",
      timeout: 120_000,
      cwd: process.cwd(),
    }).trim();

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ result: raw });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.stderr || err.message }, { status: 500 });
  }
}
